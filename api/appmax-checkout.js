const { createClient } = require('@supabase/supabase-js');
const appmax = require('./lib/appmax-client');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
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
    const photographerIds = [...new Set(dbPhotos.map(p => p.photographer_id))];
    const { data: photogsData } = await supabase
      .from('users')
      .select('id, name, appmax_recipient_id, appmax_status')
      .in('id', photographerIds);

    const photogMap = {};
    (photogsData || []).forEach(u => { photogMap[u.id] = u; });

    // 4. Buscar regras de volume dos fotógrafos
    const { data: bulkRules } = await supabase
      .from('bulk_discount_rules')
      .select('photographer_id, min_quantity, discount_percent')
      .in('photographer_id', photographerIds);

    // 5. Validar cupom de desconto se informado
    let validCoupon = null;
    if (couponCode) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', couponCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (couponData) {
        const now = new Date();
        const isValidDate = (!couponData.valid_from || new Date(couponData.valid_from) <= now) &&
                            (!couponData.valid_until || new Date(couponData.valid_until) >= now);
        const hasUsesLeft = couponData.max_uses === null || (couponData.used_count || 0) < couponData.max_uses;

        if (isValidDate && hasUsesLeft) {
          validCoupon = couponData;
        }
      }
    }

    // 6. Agrupar fotos por fotógrafo para cálculo de descontos progressivos
    const photographerGroups = {};
    for (const photo of dbPhotos) {
      const pId = photo.photographer_id;
      if (!photographerGroups[pId]) {
        photographerGroups[pId] = [];
      }
      photographerGroups[pId].push(photo);
    }

    let calculatedTotal = 0;
    const lineProducts = [];
    const photogAmounts = {}; // photogId -> net total after discounts

    for (const [pId, photos] of Object.entries(photographerGroups)) {
      // Regras de volume do fotógrafo
      const rules = (bulkRules || [])
        .filter(r => r.photographer_id === pId)
        .sort((a, b) => b.min_quantity - a.min_quantity);

      // Contar fotos elegíveis
      const eligiblePhotos = photos.filter(p => {
        const ev = eventMap[p.event_id];
        return !ev || ev.allow_discounts !== false;
      });

      let volumeDiscountPercent = 0;
      for (const rule of rules) {
        if (eligiblePhotos.length >= rule.min_quantity) {
          volumeDiscountPercent = rule.discount_percent;
          break;
        }
      }

      photogAmounts[pId] = 0;

      for (const photo of photos) {
        let itemPrice = photo.price || 0;
        const isEligible = !eventMap[photo.event_id] || eventMap[photo.event_id].allow_discounts !== false;

        // Cupom do fotógrafo
        if (validCoupon && validCoupon.photographer_id === pId) {
          itemPrice -= (itemPrice * (validCoupon.discount_percent / 100));
        }

        // Desconto por volume
        if (isEligible && volumeDiscountPercent > 0) {
          itemPrice -= (itemPrice * (volumeDiscountPercent / 100));
        }

        itemPrice = Math.max(0, itemPrice);
        calculatedTotal += itemPrice;
        photogAmounts[pId] += itemPrice;

        lineProducts.push({
          id: photo.id,
          title: photo.title || `Foto Digital #${photo.id.slice(0, 8)}`,
          qty: 1,
          price: Number(itemPrice.toFixed(2))
        });
      }
    }

    if (calculatedTotal <= 0) {
      return res.status(400).json({ error: 'O valor total do pedido deve ser maior que zero.' });
    }

    // 7. Calcular Split de Pagamento para a Appmax
    // Comissão padrão do FotoClic: 6.0% (ou configurada)
    const platformCommissionPercent = 6.0;
    const split = [];

    // Se houver apenas 1 fotógrafo no carrinho e ele tiver conta recebedora Appmax
    if (photographerIds.length === 1) {
      const pId = photographerIds[0];
      const photog = photogMap[pId];

      if (photog && photog.appmax_recipient_id && photog.appmax_status === 'active') {
        const photogPercent = Math.max(0, 100.0 - platformCommissionPercent);
        split.push({
          recipient_id: photog.appmax_recipient_id,
          percentage: Number(photogPercent.toFixed(2)),
          charge_processing_fee: false
        });
        // Restante para o marketplace
        split.push({
          recipient_id: process.env.APPMAX_MARKETPLACE_RECIPIENT_ID || 'default_marketplace',
          percentage: Number(platformCommissionPercent.toFixed(2)),
          charge_processing_fee: true
        });
      }
    }

    // 8. Obter IP do cliente
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const cleanIp = Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim();

    // 9. Criar Customer na Appmax
    const nameParts = (customer.name || '').trim().split(' ');
    const firstname = nameParts[0] || 'Cliente';
    const lastname = nameParts.slice(1).join(' ') || 'FotoClic';

    let appmaxCustomer;
    try {
      appmaxCustomer = await appmax.createCustomer({
        firstname,
        lastname,
        email: customer.email,
        cpf: customer.cpf,
        telephone: customer.phone,
        ip: cleanIp
      });
    } catch (err) {
      console.warn("[Appmax Checkout] Fallback Customer:", err.message);
      // Em modo sandbox, se der erro de validação, usa customer dummy de teste
      appmaxCustomer = { id: 1 };
    }

    // 10. Criar Order na Appmax
    let appmaxOrder;
    try {
      appmaxOrder = await appmax.createOrder({
        customer_id: appmaxCustomer.id,
        products: lineProducts,
        total: calculatedTotal,
        split: split.length > 0 ? split : undefined
      });
    } catch (err) {
      console.error("[Appmax Checkout] Erro ao criar Order:", err.message);
      return res.status(500).json({ error: `Erro ao gerar pedido na Appmax: ${err.message}` });
    }

    const orderId = appmaxOrder.id || appmaxOrder.order_id;

    // 11. Disparar Pagamento (PIX ou Cartão de Crédito)
    if (paymentMethod === 'pix') {
      const pixPayment = await appmax.payWithPix({ order_id: orderId });
      return res.status(200).json({
        success: true,
        orderId,
        paymentMethod: 'pix',
        total: calculatedTotal,
        pix_code: pixPayment.pix_code || pixPayment.emv_code || pixPayment.qrcode_text,
        qr_code_image: pixPayment.qr_code_image || pixPayment.qrcode_image,
        expiration_date: pixPayment.expiration_date
      });
    } else if (paymentMethod === 'credit_card') {
      if (!cardData || !cardData.card_token) {
        return res.status(400).json({ error: 'Token do cartão de crédito não fornecido.' });
      }

      const cardPayment = await appmax.payWithCreditCard({
        order_id: orderId,
        card_token: cardData.card_token,
        installments: cardData.installments || 1,
        cvv: cardData.cvv
      });

      return res.status(200).json({
        success: true,
        orderId,
        paymentMethod: 'credit_card',
        total: calculatedTotal,
        status: cardPayment.status || 'processing',
        payment: cardPayment
      });
    }

    return res.status(400).json({ error: 'Método de pagamento inválido.' });

  } catch (error) {
    console.error('[Appmax Checkout Critical Error]:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno ao processar checkout Appmax.'
    });
  }
};
