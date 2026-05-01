import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Helper para ler o body raw (necessário para verificação de assinatura)
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

        // Verificação de Assinatura (Segurança)
        if (signature) {
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(rawBody).digest('hex');
            
            if (signature !== digest) {
                console.error('[AbacatePay Webhook] Assinatura Inválida!');
                return res.status(401).json({ error: 'Assinatura inválida.' });
            }
        }

        console.log('[AbacatePay Webhook] Evento recebido:', body.event, body.data?.id);

        if (body.event === 'billing.paid') {
            const billing = body.data;
            console.log('[AbacatePay Webhook] Pagamento Confirmado! ID:', billing.id);

            const supabaseUrl = process.env.VITE_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (supabaseUrl && supabaseKey) {
                const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

                // 1. Atualizar o status do billing na nossa tabela
                const method = billing.methods && billing.methods.length > 0 ? billing.methods[0] : null;
                const { data: billingRecord, error: updateError } = await supabaseAdmin
                    .from('abacate_pay_billings')
                    .update({ status: 'PAID', payment_method: method })
                    .eq('billing_id', billing.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('[AbacatePay Webhook] Erro ao atualizar billing:', updateError);
                } else if (billingRecord) {
                    // 2. Extrair metadata e processar fotos
                    const metadata = billingRecord.metadata || {};
                    const cartIds = metadata.cartIds || [];
                    const userId = metadata.userId || 'guest-id';

                    if (cartIds.length > 0) {
                        // Buscar fotos originais
                        const { data: photos } = await supabaseAdmin
                            .from('photos')
                            .select('*')
                            .in('id', cartIds);
                        
                        if (photos && photos.length > 0) {
                            // Buscar config de comissão
                            const { data: settingsRow } = await supabaseAdmin
                                .from('settings')
                                .select('value')
                                .eq('key', 'commission_settings')
                                .single();
                                
                            let settings = { defaultRate: 0.15, customRates: {} };
                            if (settingsRow && settingsRow.value) {
                                settings = settingsRow.value;
                            }

                            // Processar cada foto
                            for (const photo of photos) {
                                let rate = settings.defaultRate;
                                if (settings.customRates && settings.customRates[photo.photographer_id] !== undefined) {
                                    rate = settings.customRates[photo.photographer_id];
                                }
                                
                                // Para simplificar o cálculo do webhook, rateamos o desconto (se houvesse) ou usamos o list price
                                // Se quisermos exatidão, calcular o ratio baseado em billingRecord.amount
                                const finalPrice = photo.price; 
                                const commissionValue = finalPrice * rate;

                                const { error: saleError } = await supabaseAdmin.from('sales').insert({
                                    photo_id: photo.id,
                                    buyer_id: userId,
                                    price: finalPrice,
                                    commission: commissionValue,
                                    photographer_id: photo.photographer_id,
                                    commission_rate: rate,
                                    sale_date: new Date()
                                });

                                if (saleError) {
                                    console.error('[AbacatePay Webhook] Erro ao salvar venda:', saleError);
                                }
                            }
                            console.log('[AbacatePay Webhook] Vendas registradas com sucesso.');
                        }
                    }
                }
            } else {
                console.error('[AbacatePay Webhook] Falta service_role key para processar banco.');
            }
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('[AbacatePay Webhook] Erro:', error);
        return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
    }
}
