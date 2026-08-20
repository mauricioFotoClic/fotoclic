const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
      console.warn('[Appmax Webhook] Pedido sem ID no payload.');
      return res.status(200).json({ received: true, note: 'No order ID' });
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

      // Processar produtos comprados (fotos)
      const products = orderData.products || orderData.items || [];
      const salesToInsert = [];
      const photoIds = [];

      for (const prod of products) {
        const photoId = prod.id || prod.sku;
        if (!photoId) continue;

        photoIds.push(photoId);

        // Buscar fotógrafo da foto
        const { data: photoData } = await supabase
          .from('photos')
          .select('id, photographer_id, price')
          .eq('id', photoId)
          .maybeSingle();

        if (photoData) {
          const itemPrice = Number(prod.price) || photoData.price || 0;
          const commissionRate = 0.06; // 6% taxa da plataforma FotoClic
          const commission = Number((itemPrice * commissionRate).toFixed(2));

          salesToInsert.push({
            photo_id: photoData.id,
            photographer_id: photoData.photographer_id,
            buyer_id: buyerId,
            price: itemPrice,
            commission: commission,
            status: 'completed',
            appmax_order_id: orderId,
            gateway: 'appmax',
            payment_method: (orderData.payment_method || 'pix').toLowerCase(),
            sale_date: new Date().toISOString()
          });
        }
      }

      if (salesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('sales')
          .insert(salesToInsert);

        if (insertError) {
          console.error('[Appmax Webhook] Erro ao inserir vendas:', insertError);
          return res.status(500).json({ error: 'Falha ao salvar vendas no banco' });
        }

        // Incrementar contador de vendas das fotos
        for (const pid of photoIds) {
          await supabase.rpc('increment_photo_sales', { photo_id: pid }).catch(() => {
            // Se a RPC não existir, atualiza diretamente
            supabase.from('photos').update({ sales_count: 1 }).eq('id', pid);
          });
        }

        console.log(`[Appmax Webhook] ${salesToInsert.length} fotos liberadas com sucesso para o pedido ${orderId}`);
      }

      return res.status(200).json({ received: true, processed: true });
    }

    // 2. Tratar estornos
    if (eventType.includes('refunded')) {
      const { error: refundError } = await supabase
        .from('sales')
        .update({ status: 'refunded' })
        .eq('appmax_order_id', orderId);

      if (refundError) {
        console.error('[Appmax Webhook] Erro ao estornar pedido:', refundError);
      }
      return res.status(200).json({ received: true, refunded: true });
    }

    return res.status(200).json({ received: true, unhandledEvent: eventType });

  } catch (error) {
    console.error('[Appmax Webhook Critical Error]:', error);
    return res.status(500).json({ error: error.message });
  }
};
