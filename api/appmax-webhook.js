import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    // A Appmax envia o evento em `event` ou `status` (ex: order_approved, order_paid, order_refunded, order_canceled)
    const eventType = (body.event || body.type || body.status || '').toLowerCase();
    const orderData = body.data || body.order || body;
    const orderId = String(orderData.id || orderData.order_id || body.order_id || '');

    if (!orderId) {
      const externalId = crypto.randomUUID ? crypto.randomUUID() : 'fotoclic-' + Date.now();
      console.warn('[Appmax Webhook] Pedido sem ID no payload (validação / ping).');
      return res.status(200).json({
        received: true,
        status: 'healthy',
        external_id: externalId,
        note: 'Webhook active'
      });
    }

    // 1. Tratar aprovação de pedido
    if (eventType.includes('approved') || eventType.includes('paid')) {
      // Checar se a venda já foi registrada (Idempotência)
      const { data: existingSales } = await supabase
        .from('sales')
        .select('id')
        .eq('appmax_order_id', orderId);

      if (existingSales && existingSales.length > 0) {
        console.log(`[Appmax Webhook] Pedido ${orderId} já processado anteriormente.`);
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      // Buscar comprador
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

      // Registrar vendas para cada produto do pedido
      const products = orderData.products || orderData.items || [];
      const paymentMethod = orderData.payment_method || body.payment_method || 'pix';
      const installments = Number(orderData.installments || 1);

      if (Array.isArray(products) && products.length > 0) {
        for (const item of products) {
          const photoId = item.id || item.sku || item.product_id;
          const price = Number(item.price) || 0;
          const commission = Number((price * 0.06).toFixed(2));

          let photographerId = null;
          if (photoId) {
            const { data: photoData } = await supabase
              .from('photos')
              .select('photographer_id')
              .eq('id', photoId)
              .maybeSingle();

            if (photoData) {
              photographerId = photoData.photographer_id;
            }
          }

          await supabase.from('sales').insert({
            photo_id: photoId,
            photographer_id: photographerId,
            buyer_id: buyerId,
            price: price,
            commission: commission,
            payment_method: paymentMethod,
            installments: installments,
            gateway: 'appmax',
            appmax_order_id: orderId,
            status: 'completed',
            sale_date: new Date().toISOString()
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Pedido ${orderId} aprovado e processado com sucesso.`
      });
    }

    // 2. Tratar cancelamento ou estorno
    if (eventType.includes('refund') || eventType.includes('cancel')) {
      const newStatus = eventType.includes('refund') ? 'refunded' : 'cancelled';

      await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('appmax_order_id', orderId);

      console.log(`[Appmax Webhook] Pedido ${orderId} atualizado para ${newStatus}.`);
      return res.status(200).json({ success: true, status: newStatus });
    }

    return res.status(200).json({ received: true, event: eventType });

  } catch (error) {
    console.error('[Appmax Webhook API Error]:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar webhook da Appmax.' });
  }
}
