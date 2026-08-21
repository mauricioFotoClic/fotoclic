import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Helper para envio de e-mails via SMTP Locaweb
async function sendLocawebEmail({ to, subject, html }) {
  const token = process.env.LOCAWEB_SMTP_TOKEN;
  if (!token) {
    console.warn('[Appmax Webhook Email] LOCAWEB_SMTP_TOKEN não configurado.');
    return false;
  }

  try {
    const res = await fetch('https://api.smtplw.com.br/v1/messages', {
      method: 'POST',
      headers: {
        'x-auth-token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'nao-responda@email.fotoclic.com.br',
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        body: html
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Appmax Webhook Email] Falha no envio para ${to}: Status ${res.status} - ${errText}`);
      return false;
    }

    console.log(`[Appmax Webhook Email] E-mail enviado com sucesso para ${to}`);
    return true;
  } catch (err) {
    console.error(`[Appmax Webhook Email] Erro ao enviar e-mail para ${to}:`, err.message);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Health check e Validação da Appmax (compatível com GET e POST de validação)
  if (req.method === 'GET' || req.query?.health || req.body?.health) {
    const externalId = crypto.randomUUID ? crypto.randomUUID() : 'fotoclic-' + Date.now();
    return res.status(200).json({
      status: 'healthy',
      platform: 'FotoClic',
      external_id: externalId,
      alias: 'FotoClic',
      data: {
        external_id: externalId,
        alias: 'FotoClic'
      },
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    const body = req.body || {};

    console.log('[Appmax Webhook] Recebido payload:', JSON.stringify(body));

    // A Appmax envia o evento em `event` ou `status` (ex: order_approved, order_paid, order_refunded, order_canceled, Pix Pago, etc.)
    const eventType = (body.event || body.type || body.status || '').toLowerCase();
    const orderData = body.data || body.order || body;
    const orderId = String(orderData.id || orderData.order_id || body.order_id || '');

    // Health Check / Validação de instalação do aplicativo Appmax
    if (body.app_id || !orderId) {
      const externalId = crypto.randomUUID ? crypto.randomUUID() : 'fotoclic-' + Date.now();
      console.warn('[Appmax Webhook] Health Check / Ping de validação da Appmax recebido com sucesso.');
      return res.status(200).json({
        external_id: externalId,
        alias: 'FotoClic'
      });
    }

    // 1. Tratar aprovação/pagamento de pedido (compatível com EN e PT-BR)
    const isPaid = eventType.includes('approved') || 
                   eventType.includes('paid') || 
                   eventType.includes('pago') || 
                   eventType.includes('aprovado') || 
                   eventType.includes('autorizado') || 
                   eventType.includes('authorized');

    if (isPaid) {
      // Checar se a venda já foi registrada (Idempotência) por billing_id
      const { data: existingSales } = await supabase
        .from('sales')
        .select('id')
        .eq('billing_id', orderId);

      if (existingSales && existingSales.length > 0) {
        console.log(`[Appmax Webhook] Pedido ${orderId} já processado anteriormente.`);
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      // Buscar comprador no banco de dados
      const customerEmail = (orderData.customer?.email || body.customer_email || '').toLowerCase().trim();
      let buyerId = null;
      let buyerName = orderData.customer?.name || orderData.customer?.firstname || 'Cliente';

      if (customerEmail) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, name')
          .eq('email', customerEmail)
          .maybeSingle();

        if (userProfile) {
          buyerId = userProfile.id;
          buyerName = userProfile.name || buyerName;
        }
      }

      // Buscar configurações de comissão
      const { data: settingsRow } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const defaultRate = settingsRow?.commission_default_rate || 0.06;
      const customRates = settingsRow?.commission_custom_rates || {};

      // Obter produtos do pedido
      const rawProducts = orderData.products || orderData.items || [];
      const productIds = rawProducts.map(p => p.sku || p.id || p.product_id).filter(Boolean);

      // Buscar fotos reais no banco
      let photos = [];
      if (productIds.length > 0) {
        const { data: dbPhotos } = await supabase
          .from('photos')
          .select('*')
          .in('id', productIds);
        photos = dbPhotos || [];
      }

      const holdDays = (orderData.payment_method || '').toLowerCase().includes('card') ? 30 : 7;
      const availableAtDate = new Date(Date.now() + (holdDays * 24 * 60 * 60 * 1000)).toISOString();

      let insertedCount = 0;
      const photographerSalesMap = {};

      for (const photo of photos) {
        const rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
        const finalPrice = Number(photo.price) || 0;
        const commissionValue = Number((finalPrice * rate).toFixed(2));

        const { error: saleError } = await supabase.from('sales').upsert({
          photo_id: photo.id,
          photographer_id: photo.photographer_id,
          buyer_id: buyerId,
          buyer_name: buyerName,
          price: finalPrice,
          commission: commissionValue,
          commission_rate: rate,
          sale_date: new Date().toISOString(),
          available_at: availableAtDate,
          is_available: false,
          billing_id: orderId,
          status: 'completed'
        }, { onConflict: 'photo_id, buyer_id', ignoreDuplicates: true });

        if (saleError) {
          console.error(`[Appmax Webhook] Erro ao inserir venda para foto ${photo.id}:`, saleError.message);
        } else {
          insertedCount++;
        }

        // Agrupar fotos por fotógrafo para notificação
        if (!photographerSalesMap[photo.photographer_id]) {
          photographerSalesMap[photo.photographer_id] = {
            photos: [],
            totalReceived: 0
          };
        }
        const photogNet = Math.max(0, finalPrice - commissionValue);
        photographerSalesMap[photo.photographer_id].totalReceived += photogNet;
        photographerSalesMap[photo.photographer_id].photos.push(photo);
      }

      // Limpar carrinho do comprador no banco
      if (buyerId) {
        try {
          const { data: cartData } = await supabase.from('carts').select('items').eq('user_id', buyerId).maybeSingle();
          if (cartData && cartData.items) {
            const remaining = cartData.items.filter(id => !productIds.includes(id));
            await supabase.from('carts').update({ items: remaining }).eq('user_id', buyerId);
          }
        } catch (e) {
          console.warn('[Appmax Webhook] Falha ao limpar carrinho:', e);
        }
      }

      // --- DISPARO DE E-MAILS DE CONFIRMAÇÃO ---
      const totalAmountFormatted = `R$ ${(Number(orderData.total || 0) / 100).toFixed(2).replace('.', ',')}`;

      // 1. E-mail para o Comprador
      if (customerEmail) {
        const photoListHtml = photos.map(p => `
          <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
            ${p.preview_url ? `<img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px;" />` : ''}
            <div>
              <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto Digital'}</div>
              <div style="color: #718096; font-size: 12px;">R$ ${(Number(p.price) || 0).toFixed(2).replace('.', ',')}</div>
            </div>
          </div>
        `).join('');

        const buyerHtml = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #FF6B00; padding: 24px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Pagamento Confirmado! 📸</h1>
            </div>
            <div style="padding: 24px;">
              <p>Olá, <strong>${buyerName}</strong>!</p>
              <p>Seu pagamento foi confirmado com sucesso. Suas fotos já estão liberadas em alta resolução para download!</p>
              <div style="margin: 20px 0;">${photoListHtml}</div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.VITE_SITE_URL || 'https://www.fotoclic.com.br'}/minhas-compras" style="background-color: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                  Baixar Minhas Fotos
                </a>
              </div>
            </div>
          </div>`;

        await sendLocawebEmail({
          to: customerEmail,
          subject: '✅ Pagamento Confirmado - Suas fotos estão prontas no FotoClic!',
          html: buyerHtml
        });
      }

      // 2. E-mail de Notificação para o Administrador (svalmauricio@gmail.com)
      const adminPhotosList = photos.map(p => `<li><strong>${p.title || 'Foto'}</strong> - R$ ${(Number(p.price) || 0).toFixed(2)} (ID Fotógrafo: ${p.photographer_id})</li>`).join('');
      const adminHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
          <h2 style="color: #FF6B00; margin-top: 0;">🎉 Nova Venda Confirmada na Appmax!</h2>
          <p><strong>Pedido ID:</strong> ${orderId}</p>
          <p><strong>Comprador:</strong> ${buyerName} (${customerEmail || 'Sem e-mail'})</p>
          <p><strong>Valor Total:</strong> ${totalAmountFormatted}</p>
          <p><strong>Fotos Vendidas (${photos.length}):</strong></p>
          <ul>${adminPhotosList}</ul>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">Notificação Automática FotoClic &bull; Gateway Appmax</p>
        </div>`;

      await sendLocawebEmail({
        to: 'svalmauricio@gmail.com',
        subject: `💰 Nova Venda FotoClic - ${buyerName} - ${totalAmountFormatted}`,
        html: adminHtml
      });

      // 3. E-mail para os Fotógrafos
      for (const photogId of Object.keys(photographerSalesMap)) {
        try {
          const { data: photogData } = await supabase.from('users').select('name, email').eq('id', photogId).maybeSingle();
          if (photogData?.email) {
            const photogInfo = photographerSalesMap[photogId];
            const photogHtml = `
              <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h2 style="color: #FF6B00; margin-top: 0;">📸 Você fez uma nova venda no FotoClic!</h2>
                <p>Olá, <strong>${photogData.name || 'Fotógrafo'}</strong>!</p>
                <p>Sua foto acaba de ser comprada por <strong>${buyerName}</strong>.</p>
                <p><strong>Valor Líquido a Receber:</strong> R$ ${photogInfo.totalReceived.toFixed(2).replace('.', ',')}</p>
                <p>Acesse seu painel do fotógrafo para acompanhar seu saldo e extrato.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.VITE_SITE_URL || 'https://www.fotoclic.com.br'}/fotografo" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">
                    Acessar Painel
                  </a>
                </div>
              </div>`;

            await sendLocawebEmail({
              to: photogData.email,
              subject: `🎉 Nova Foto Vendida no FotoClic! (+ R$ ${photogInfo.totalReceived.toFixed(2).replace('.', ',')})`,
              html: photogHtml
            });
          }
        } catch (err) {
          console.warn('[Appmax Webhook] Falha ao notificar fotógrafo:', err);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Pedido ${orderId} aprovado e processado com sucesso. Vendas registradas: ${insertedCount}.`
      });
    }

    // 2. Tratar cancelamento ou estorno
    const isRefund = eventType.includes('refund') || 
                     eventType.includes('estorno') || 
                     eventType.includes('estornado') || 
                     eventType.includes('cancel') || 
                     eventType.includes('cancelado');

    if (isRefund) {
      const newStatus = (eventType.includes('refund') || eventType.includes('estorno')) ? 'refunded' : 'cancelled';

      await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('billing_id', orderId);

      console.log(`[Appmax Webhook] Pedido ${orderId} atualizado para ${newStatus}.`);
      return res.status(200).json({ success: true, status: newStatus });
    }

    return res.status(200).json({ received: true, event: eventType });

  } catch (error) {
    console.error('[Appmax Webhook API Error]:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar webhook da Appmax.' });
  }
}
