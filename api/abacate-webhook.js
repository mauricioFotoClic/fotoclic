import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.ABACATEPAY_WEBHOOK_SECRET || process.env.ABACATEPAY_API_KEY;

    try {
        const rawBody = await getRawBody(req);
        const body = JSON.parse(rawBody.toString());

        // Verificação de Assinatura HMAC-SHA256
        if (signature && secret) {
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(rawBody).digest('hex');
            if (signature !== digest) {
                console.error('[AbacatePay Webhook] Assinatura inválida!');
                return res.status(401).json({ error: 'Assinatura inválida.' });
            }
        }

        console.log('[AbacatePay Webhook] Evento recebido:', body.event);

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[AbacatePay Webhook] Supabase não configurado.');
            return res.status(500).json({ error: 'Configuração de banco ausente.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // checkout.completed — pagamento confirmado
        if (body.event === 'checkout.completed') {
            const checkout = body.data?.checkout;
            const payerInfo = body.data?.payerInformation;

            if (!checkout?.id) {
                console.error('[AbacatePay Webhook] Payload sem checkout.id');
                return res.status(400).json({ error: 'Payload inválido.' });
            }

            console.log('[AbacatePay Webhook] Pagamento confirmado! Checkout ID:', checkout.id);

            const method = Array.isArray(checkout.methods) && checkout.methods.length > 0
                ? checkout.methods[0]
                : (payerInfo?.cardBrand ? 'CARD' : 'PIX');

            const { data: billingRecord, error: updateError } = await supabaseAdmin
                .from('abacate_pay_billings')
                .update({ status: 'PAID', payment_method: method })
                .eq('billing_id', checkout.id)
                .select()
                .maybeSingle();

            if (updateError) {
                console.error('[AbacatePay Webhook] Erro ao atualizar billing:', updateError);
            }

            // Se não encontrou o billingRecord (pode ter sido perdido em um restore de banco),
            // tentamos usar o metadata que vem diretamente no payload do webhook.
            const metadata = billingRecord?.metadata || checkout.metadata || {};
            
            if (!billingRecord) {
                console.warn('[AbacatePay Webhook] Registro de cobrança não encontrado no banco (ID: ' + checkout.id + '). Usando metadata do payload para processar a venda.');
            }

            if (metadata && Object.keys(metadata).length > 0) {
                const cartIds = metadata.cartIds || [];
                const userId = metadata.userId || 'guest-id';

                if (cartIds.length > 0) {
                    const { data: photos } = await supabaseAdmin
                        .from('photos')
                        .select('*')
                        .in('id', cartIds);

                    if (photos && photos.length > 0) {
                        const { data: settingsRow, error: settingsError } = await supabaseAdmin
                            .from('system_settings')
                            .select('*')
                            .single();

                        if (settingsError) {
                            console.warn('[AbacatePay Webhook] Erro ao buscar system_settings, usando taxas padrão:', settingsError.message);
                        }

                        let settings = { 
                            defaultRate: settingsRow?.commission_default_rate || 0.15, 
                            customRates: settingsRow?.commission_custom_rates || {} 
                        };

                        for (const photo of photos) {
                            let rate = settings.defaultRate;
                            if (settings.customRates?.[photo.photographer_id] !== undefined) {
                                rate = settings.customRates[photo.photographer_id];
                            }

                            const finalPrice = photo.price;
                            const commissionValue = finalPrice * rate;

                            const { error: saleError } = await supabaseAdmin.from('sales').insert({
                                photo_id: photo.id,
                                buyer_id: userId,
                                buyer_name: metadata.customerName || null,
                                price: finalPrice,
                                commission: commissionValue,
                                photographer_id: photo.photographer_id,
                                commission_rate: rate,
                                sale_date: new Date().toISOString()
                            });

                            if (saleError) {
                                console.error('[AbacatePay Webhook] Erro ao salvar venda:', saleError);
                            }
                        }
                        console.log('[AbacatePay Webhook] Vendas registradas com sucesso.');
                    }
                }
            }
        }

        // checkout.refunded — reembolso confirmado pelo AbacatePay
        if (body.event === 'checkout.refunded') {
            const checkout = body.data?.checkout;
            if (checkout?.id) {
                await supabaseAdmin
                    .from('abacate_pay_billings')
                    .update({ status: 'REFUNDED' })
                    .eq('billing_id', checkout.id);
                console.log('[AbacatePay Webhook] Estorno registrado para checkout:', checkout.id);
            }
        }

        // checkout.disputed — contestação iniciada
        if (body.event === 'checkout.disputed') {
            const checkout = body.data?.checkout;
            if (checkout?.id) {
                await supabaseAdmin
                    .from('abacate_pay_billings')
                    .update({ status: 'DISPUTED' })
                    .eq('billing_id', checkout.id);
                console.log('[AbacatePay Webhook] Contestação registrada para checkout:', checkout.id);
            }
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('[AbacatePay Webhook] Erro:', error);
        return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
    }
}
