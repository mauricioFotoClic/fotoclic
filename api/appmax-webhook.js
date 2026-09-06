import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { notifyNewSaleToTelegram } from '../lib/telegram-ai-service.js';

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
    const orderId = String(orderData.id || orderData.order_id || body.order_id || body.id || '');

    // Health Check / Validação de instalação do aplicativo Appmax (apenas se NÃO houver ID de pedido)
    if (!orderId && (body.app_id || body.health || req.query?.health)) {
      const externalId = crypto.randomUUID ? crypto.randomUUID() : 'fotoclic-' + Date.now();
      console.warn('[Appmax Webhook] Health Check / Ping de validação da Appmax recebido com sucesso.');
      return res.status(200).json({
        external_id: externalId,
        alias: 'FotoClic'
      });
    }

    if (!orderId) {
      console.warn('[Appmax Webhook] Payload recebido sem orderId identificável:', JSON.stringify(body));
      return res.status(200).json({ received: true, note: 'No orderId' });
    }

    // 1. Tratar aprovação/pagamento de pedido (compatível com EN e PT-BR)
    const orderStatusStr = String(orderData.status || body.status || '').toLowerCase();
    const isPaid = eventType.includes('approved') || 
                   eventType.includes('paid') || 
                   eventType.includes('pago') || 
                   eventType.includes('aprovado') || 
                   eventType.includes('autorizado') || 
                   eventType.includes('authorized') ||
                   orderStatusStr === 'aprovado' ||
                   orderStatusStr === 'paid' ||
                   orderStatusStr === 'pago' ||
                   orderStatusStr === 'approved';

    if (isPaid) {
      // 1. Checar se a venda já foi registrada ou se o pedido já foi processado (Idempotência Estrita)
      const { data: existingSales } = await supabase
        .from('sales')
        .select('id')
        .eq('billing_id', orderId);

      // Buscar registro de faturamento associado no banco
      const { data: billingRecord } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', orderId)
        .maybeSingle();

      if ((existingSales && existingSales.length > 0) || (billingRecord?.status === 'PAID' && billingRecord?.metadata?.email_sent)) {
        console.log(`[Appmax Webhook] Pedido ${orderId} já processado anteriormente. Encerrando para evitar duplicações.`);
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      // 2. Identificar comprador no banco de dados
      const customerEmail = (billingRecord?.customer_email || orderData.customer?.email || body.customer_email || '').toLowerCase().trim();
      let buyerId = billingRecord?.user_id || billingRecord?.metadata?.userId || null;
      let buyerName = billingRecord?.customer_name || orderData.customer?.name || orderData.customer?.firstname || 'Cliente';

      if (!buyerId && customerEmail) {
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

      // 3. Buscar configurações de comissão
      const { data: settingsRow } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const defaultRate = settingsRow?.commission_default_rate || 0.06;
      const customRates = settingsRow?.commission_custom_rates || {};

      // 4. Obter IDs das fotos de forma resiliente
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let productIds = [];

      // Prioridade 1: Do registro de billing gravado no checkout
      if (billingRecord?.items && Array.isArray(billingRecord.items) && billingRecord.items.length > 0) {
        productIds = billingRecord.items.filter(id => typeof id === 'string' && uuidRegex.test(id));
      } else if (billingRecord?.metadata?.photoIds && Array.isArray(billingRecord.metadata.photoIds)) {
        productIds = billingRecord.metadata.photoIds.filter(id => typeof id === 'string' && uuidRegex.test(id));
      }

      // Prioridade 2: Dos dados brutos do webhook da Appmax
      if (productIds.length === 0) {
        const rawProducts = orderData.products || orderData.items || orderData.order_products || [];
        rawProducts.forEach(p => {
          [p.sku, p.id, p.product_id, p.external_id, p.custom_id].forEach(val => {
            if (val && typeof val === 'string' && uuidRegex.test(val) && !productIds.includes(val)) {
              productIds.push(val);
            }
          });
        });
      }

      // Prioridade 3: Do carrinho ativo do usuário caso não tenha sido possível recuperar
      if (productIds.length === 0 && buyerId) {
        const { data: cartData } = await supabase.from('carts').select('items').eq('user_id', buyerId).maybeSingle();
        if (cartData && Array.isArray(cartData.items) && cartData.items.length > 0) {
          productIds = cartData.items.filter(id => typeof id === 'string' && uuidRegex.test(id));
        }
      }

      // 5. Buscar fotos reais no banco
      let photos = [];
      if (productIds.length > 0) {
        const { data: dbPhotos } = await supabase
          .from('photos')
          .select('*')
          .in('id', productIds);
        photos = dbPhotos || [];
      }

      if (photos.length === 0) {
        console.warn(`[Appmax Webhook] Nenhuma foto correspondente encontrada para o pedido ${orderId}.`);
      }

      const isCard = (orderData.payment_method || '').toLowerCase().includes('card');
      const holdDays = isCard ? 30 : 0;
      const isAvailable = !isCard; // PIX fica disponível imediatamente (D+0)
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
          is_available: isAvailable,
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

      // 6. Atualizar registro de faturamento para PAID com marcação de e-mail disparado
      try {
        await supabase.from('abacate_pay_billings').upsert({
          billing_id: orderId,
          user_id: buyerId,
          status: 'PAID',
          payment_method: (orderData.payment_method || 'PIX').toUpperCase(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(billingRecord?.metadata || {}),
            email_sent: true,
            email_dispatched_at: new Date().toISOString(),
            sales_inserted: insertedCount
          }
        }, { onConflict: 'billing_id' });
      } catch (bErr) {
        console.warn('[Appmax Webhook] Erro ao atualizar status do faturamento:', bErr);
      }

      // 7. Limpar carrinho do comprador no banco
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

      // Buscar dados dos fotógrafos para inclusão no e-mail
      const photographerIds = [...new Set(photos.map(p => p.photographer_id).filter(Boolean))];
      let photographerMap = {};
      if (photographerIds.length > 0) {
        const { data: photogList } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', photographerIds);
        if (photogList) {
          photogList.forEach(ph => {
            photographerMap[ph.id] = ph;
          });
        }
      }

      // --- DISPARO DE E-MAILS DE CONFIRMAÇÃO ---
      // Disparar apenas se houver fotos e vendas registradas com sucesso
      if (photos.length > 0 && insertedCount > 0) {
        const rawTotal = Number(orderData.total || orderData.total_amount || 0);
        const totalAmountNum = rawTotal > 0 ? rawTotal : (billingRecord?.metadata?.total || photos.reduce((s, p) => s + (Number(p.price) || 0), 0));
        const totalAmountFormatted = `R$ ${totalAmountNum.toFixed(2).replace('.', ',')}`;
        const siteUrl = process.env.VITE_SITE_URL || 'https://www.fotoclic.com.br';
        const methodFormatted = (orderData.payment_method || 'PIX').toUpperCase();

        // 1. E-mail Completo para o Comprador (com Preview, Nome da Foto, Fotógrafo e Link)
        if (customerEmail) {
        const photoListHtml = photos.map(p => {
          const photogName = photographerMap[p.photographer_id]?.name || 'Fotógrafo FotoClic';
          const priceFormatted = `R$ ${(Number(p.price) || 0).toFixed(2).replace('.', ',')}`;
          return `
            <div style="display: flex; align-items: center; margin-bottom: 14px; padding: 14px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
              ${p.preview_url ? `
                <img src="${p.preview_url}" width="75" height="75" style="object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; display: block; margin-right: 14px;" alt="${p.title || 'Foto'}" />
              ` : `
                <div style="width: 75px; height: 75px; background: #e2e8f0; border-radius: 8px; display: inline-block; margin-right: 14px; text-align: center; line-height: 75px; font-size: 24px;">📷</div>
              `}
              <div style="display: inline-block; vertical-align: middle;">
                <div style="font-weight: bold; color: #1e293b; font-size: 15px; margin-bottom: 4px;">
                  ${p.title || 'Foto Digital em Alta Resolução'}
                </div>
                <div style="color: #64748b; font-size: 13px; margin-bottom: 4px;">
                  📸 Fotógrafo: <strong style="color: #334155;">${photogName}</strong>
                </div>
                <div style="font-weight: bold; color: #FF6B00; font-size: 14px;">
                  ${priceFormatted}
                </div>
              </div>
            </div>
          `;
        }).join('');

        const buyerHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
              
              <!-- Header com Logo FotoClic -->
              <div style="background: #ffffff; padding: 28px 24px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">
                  Foto<span style="color: #FF6B00;">Clic</span>
                </h1>
              </div>

              <!-- Conteúdo Principal -->
              <div style="padding: 32px 28px;">
                <p style="font-size: 16px; color: #334155; margin-top: 0; margin-bottom: 8px;">
                  Olá, <strong style="color: #0f172a;">${buyerName}</strong>!
                </p>
                <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 14px;">
                  Recebemos seu pagamento pelo ${methodFormatted}. 🎉
                </h2>
                <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">
                  Valor Recebido: <strong style="font-size: 16px; color: #FF6B00;">${totalAmountFormatted}</strong>
                </p>

                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 12px;">
                  Itens do seu pedido (#${orderId})
                </div>

                <!-- Lista de Fotos com Preview, Nome e Fotógrafo -->
                <div style="margin-bottom: 24px;">
                  ${photoListHtml}
                </div>

                <!-- Botão de Ação para o Painel do Cliente -->
                <div style="text-align: center; margin: 32px 0 24px;">
                  <a href="${siteUrl}/minhas-compras" style="background-color: #FF6B00; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 50px; font-size: 15px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.35);">
                    📥 Acessar Meu Painel e Baixar Fotos
                  </a>
                </div>

                <div style="background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;">
                  💡 Suas fotos já estão disponíveis em alta definição no seu painel. Basta clicar no botão acima para fazer o download a qualquer momento.
                </div>
              </div>

              <!-- Rodapé -->
              <div style="background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0 0 6px 0;">FotoClic &bull; Conectando momentos inesquecíveis e fotógrafos</p>
                <p style="margin: 0;"><a href="${siteUrl}" style="color: #FF6B00; text-decoration: none;">www.fotoclic.com.br</a></p>
              </div>

            </div>
          </body>
          </html>
        `;

        await sendLocawebEmail({
          to: customerEmail,
          subject: `✅ Pagamento confirmado - Suas fotos estão prontas! (Pedido #${orderId})`,
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
        } catch (phErr) {
          console.warn('[Appmax Webhook] Erro ao enviar email para fotógrafo:', phErr.message);
        }
      }
    }

      // --- DISPARO DE NOTIFICAÇÃO EM TEMPO REAL NO TELEGRAM ---
      try {
        const uniquePhotogNames = [...new Set(Object.values(photographerMap).map(p => p.name).filter(Boolean))];
        const rawTotalTg = Number(orderData.total || orderData.total_amount || 0);
        const totalAmountNum = rawTotalTg > 0 ? rawTotalTg : (billingRecord?.metadata?.total || photos.reduce((s, p) => s + (Number(p.price) || 0), 0));
        await notifyNewSaleToTelegram({
          orderId,
          buyerName,
          customerEmail,
          totalAmount: totalAmountNum,
          photos,
          paymentMethod: (orderData.payment_method || 'PIX').toUpperCase(),
          photographerNames: uniquePhotogNames
        });
      } catch (tgErr) {
        console.warn('[Appmax Webhook Telegram Notification Error]:', tgErr.message);
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
