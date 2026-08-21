import { createClient } from '@supabase/supabase-js';
import appmax from '../lib/appmax-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRole) {
      return res.status(500).json({ error: 'Configuração do Supabase ausente nas variáveis de ambiente.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const {
      photoIds,
      couponCode,
      paymentMethod = 'pix',
      cardData,
      customer = {}
    } = req.body || {};

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto informada para o checkout.' });
    }

    if (!customer.email || !customer.name) {
      return res.status(400).json({ error: 'Nome e e-mail do comprador são obrigatórios.' });
    }

    // 1. Obter detalhes reais das fotos no banco
    const { data: dbPhotos, error: photosError } = await supabase
      .from('photos')
      .select('id, price, photographer_id, event_id, title')
      .in('id', photoIds);

    if (photosError || !dbPhotos || dbPhotos.length === 0) {
      return res.status(404).json({ error: 'Fotos não encontradas no sistema.' });
    }

    // 2. Buscar dados de eventos (para verificar permissão de descontos)
    const eventIds = [...new Set(dbPhotos.map(p => p.event_id).filter(Boolean))];
    let eventMap = {};
    if (eventIds.length > 0) {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, allow_discounts')
        .in('id', eventIds);
      (eventsData || []).forEach(ev => { eventMap[ev.id] = ev; });
    }

    // 3. Buscar configurações de comissão e dados do fotógrafo
    const { data: settingsRow } = await supabase
      .from('system_settings')
      .select('commission_default_rate, commission_custom_rates, commission_video_default_rate, commission_custom_video_rates')
      .eq('id', 1)
      .maybeSingle();

    const defaultRate = settingsRow?.commission_default_rate || 0.06;
    const customRates = settingsRow?.commission_custom_rates || {};

    // 4. Validar Cupom de Desconto se fornecido
    let appliedCoupon = null;
    if (couponCode && couponCode.trim()) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', couponCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (coupon) {
        appliedCoupon = coupon;
      }
    }

    // 5. Cálculo individual de cada item com desconto e comissão
    let totalGross = 0;
    let totalDiscount = 0;
    let productsForAppmax = [];
    let splitRules = [];

    // Buscar fotógrafos para verificação do recebedor na Appmax
    const photographerIds = [...new Set(dbPhotos.map(p => p.photographer_id))];
    const { data: photogsData } = await supabase
      .from('users')
      .select('id, name, email, appmax_recipient_id')
      .in('id', photographerIds);

    const photogMap = {};
    (photogsData || []).forEach(p => { photogMap[p.id] = p; });

    let photographerSplits = {};

    for (const photo of dbPhotos) {
      const originalPrice = Number(photo.price) || 0;
      totalGross += originalPrice;

      let itemDiscount = 0;
      const allowsDiscount = photo.event_id ? eventMap[photo.event_id]?.allow_discounts !== false : true;

      if (appliedCoupon && allowsDiscount) {
        if (!appliedCoupon.photographer_id || appliedCoupon.photographer_id === photo.photographer_id) {
          if (appliedCoupon.discount_type === 'percentage') {
            itemDiscount = (originalPrice * Number(appliedCoupon.discount_value)) / 100;
          } else {
            itemDiscount = Math.min(originalPrice, Number(appliedCoupon.discount_value));
          }
        }
      }

      totalDiscount += itemDiscount;
      const finalPrice = Math.max(0, originalPrice - itemDiscount);

      // Calcular taxa da plataforma (ex: 6%)
      const photogRate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
      const platformFee = Number((finalPrice * photogRate).toFixed(2));
      const photographerAmount = Math.max(0, Number((finalPrice - platformFee).toFixed(2)));

      productsForAppmax.push({
        id: photo.id,
        title: photo.title || `Foto #${photo.id.slice(0, 8)}`,
        qty: 1,
        price: finalPrice
      });

      // Acumular split por fotógrafo
      if (!photographerSplits[photo.photographer_id]) {
        photographerSplits[photo.photographer_id] = {
          photographer_id: photo.photographer_id,
          amount: 0,
          recipient_id: photogMap[photo.photographer_id]?.appmax_recipient_id || null
        };
      }
      photographerSplits[photo.photographer_id].amount += photographerAmount;
    }

    const finalOrderTotal = Math.max(1, Number((totalGross - totalDiscount).toFixed(2)));

    // Montar regras de split da Appmax
    // Se o fotógrafo tiver `appmax_recipient_id`, direcionamos o valor líquido diretamente
    for (const pId of Object.keys(photographerSplits)) {
      const splitInfo = photographerSplits[pId];
      if (splitInfo.recipient_id && splitInfo.amount > 0) {
        splitRules.push({
          recipient_id: splitInfo.recipient_id,
          amount: Number(splitInfo.amount.toFixed(2)),
          charge_processing_fee: false,
          liable: false
        });
      }
    }

    // 6. Cadastrar Cliente na Appmax
    const nameParts = (customer.name || 'Cliente').trim().split(' ');
    const firstname = nameParts[0];
    const lastname = nameParts.slice(1).join(' ') || 'FotoClic';

    const appmaxCustomer = await appmax.createCustomer({
      firstname,
      lastname,
      email: customer.email,
      cpf: customer.cpf || customer.taxId,
      telephone: customer.phone,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
    });

    // 7. Criar Pedido na Appmax
    const appmaxOrder = await appmax.createOrder({
      customer_id: appmaxCustomer.id,
      products: productsForAppmax,
      total: finalOrderTotal,
      split: splitRules.length > 0 ? splitRules : undefined
    });

    const orderId = String(appmaxOrder.id || appmaxOrder.order_id || appmaxOrder);

    // Salvar o pedido no banco de dados para rastreamento infalível do webhook e sincronização
    try {
      await supabase.from('abacate_pay_billings').upsert({
        billing_id: orderId,
        user_id: customer.userId || null,
        amount: Math.round(finalOrderTotal * 100),
        status: 'PENDING',
        items: photoIds,
        customer_name: customer.name,
        customer_email: (customer.email || '').toLowerCase().trim(),
        customer_cpf: (customer.cpf || customer.taxId || '').replace(/\D/g, ''),
        payment_method: paymentMethod.toUpperCase(),
        terms_accepted: true,
        metadata: {
          userId: customer.userId || null,
          photoIds: photoIds,
          cartIds: photoIds,
          total: finalOrderTotal,
          couponCode: couponCode || null,
          gateway: 'appmax',
          created_at: new Date().toISOString()
        }
      }, { onConflict: 'billing_id' });
    } catch (dbErr) {
      console.warn('[Appmax Checkout] Falha ao registrar billing prévio no banco:', dbErr);
    }

    // 8. Processar Pagamento (PIX ou Cartão)
    if (paymentMethod === 'pix') {
      const pixResult = await appmax.payWithPix({
        order_id: orderId,
        cpf: customer.cpf || customer.taxId
      });

      const pixData = pixResult?.payment?.pix || pixResult?.payment || pixResult?.payment_data?.pix || pixResult?.pix || pixResult?.data || pixResult;
      const pixCode = pixData?.pix_emv || pixData?.pix_code || pixData?.qr_code;
      let qrCodeImage = pixData?.pix_qrcode || pixData?.qr_code_image || pixData?.qr_code_url;
      if (qrCodeImage && !qrCodeImage.startsWith('http') && !qrCodeImage.startsWith('data:')) {
        qrCodeImage = `data:image/png;base64,${qrCodeImage}`;
      }

      return res.status(200).json({
        success: true,
        gateway: 'appmax',
        order_id: orderId,
        payment_method: 'pix',
        total: finalOrderTotal,
        pix: {
          qr_code: pixCode,
          qr_code_url: qrCodeImage,
          expiration: pixData?.pix_expiration_date || pixData?.expiration_date || pixData?.expires_at
        }
      });
    }

    if (paymentMethod === 'credit_card' || paymentMethod === 'card') {
      const cardToken = cardData?.token || cardData?.card_token;
      if (!cardToken) {
        return res.status(400).json({ error: 'Token do cartão de crédito é obrigatório.' });
      }

      const cardResult = await appmax.payWithCreditCard({
        order_id: orderId,
        card_token: cardToken,
        installments: cardData.installments || 1,
        cvv: cardData.cvv,
        cpf: customer.cpf || customer.taxId
      });

      return res.status(200).json({
        success: true,
        gateway: 'appmax',
        order_id: orderId,
        payment_method: 'credit_card',
        total: finalOrderTotal,
        status: cardResult.status || 'paid',
        authorization_code: cardResult.authorization_code
      });
    }

    return res.status(400).json({ error: 'Método de pagamento inválido. Use "pix" ou "credit_card".' });

  } catch (error) {
    console.error('[Appmax Checkout API Error]:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao processar checkout com a Appmax.'
    });
  }
}
