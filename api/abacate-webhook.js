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

    const signature = req.headers['x-abacatepay-signature'] || req.headers['x-webhook-signature'];
    const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;

    try {
        const rawBody = await getRawBody(req);
        const body = JSON.parse(rawBody.toString());

        // Verificação de Assinatura HMAC-SHA256
        if (signature && secret) {
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(rawBody).digest('hex');
            if (signature !== digest) {
                console.error('[AbacatePay Webhook] Assinatura inválida! Recebida:', signature, 'Calculada:', digest);
                // Em produção, se a assinatura falhar mas o segredo existir, bloqueamos.
                return res.status(401).json({ error: 'Assinatura inválida.' });
            }
        } else if (secret) {
            console.warn('[AbacatePay Webhook] Segredo configurado mas assinatura ausente no cabeçalho.');
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

            // 1. Garantir que o Cliente (Customer) exista no nosso sistema (tabela users)
            let userId = 'guest-id';
            const customerEmail = checkout.customer?.email || payerInfo?.email;
            const customerName = checkout.customer?.name || payerInfo?.name || 'Cliente FotoClic';

            if (customerEmail) {
                // Verificar se o usuário já existe
                const { data: existingUser } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('email', customerEmail)
                    .maybeSingle();

                if (existingUser) {
                    userId = existingUser.id;
                    console.log('[AbacatePay Webhook] Usuário já existente encontrado:', userId);
                } else {
                    // Criar novo usuário com role 'customer'
                    const { data: newUser, error: createError } = await supabaseAdmin
                        .from('users')
                        .insert({
                            email: customerEmail,
                            name: customerName,
                            role: 'customer',
                            is_active: true
                        })
                        .select('id')
                        .single();

                    if (!createError && newUser) {
                        userId = newUser.id;
                        console.log('[AbacatePay Webhook] Novo cliente cadastrado no sistema:', userId);
                    } else {
                        console.error('[AbacatePay Webhook] Erro ao cadastrar novo cliente:', createError);
                    }
                }
            }

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
            let metadata = billingRecord?.metadata || checkout.metadata || {};
            
            // Garantir que metadata seja um objeto (caso venha como string JSON do gateway)
            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata);
                } catch (e) {
                    console.error('[AbacatePay Webhook] Erro ao parsear metadata string:', e);
                    metadata = {};
                }
            }

            if (!billingRecord) {
                console.warn('[AbacatePay Webhook] Registro de cobrança não encontrado no banco (ID: ' + checkout.id + '). Usando metadata do payload para processar a venda.');
            }

            if (metadata && Object.keys(metadata).length > 0) {
                try {
                    const cartIds = metadata.cartIds || [];
                    // Usamos o userId que acabamos de encontrar ou criar
                    const finalUserId = userId !== 'guest-id' ? userId : (metadata.userId || 'guest-id');

                    if (cartIds.length > 0) {
                        const { data: photos, error: photosError } = await supabaseAdmin
                            .from('photos')
                            .select('*')
                            .in('id', cartIds);

                        if (photosError) throw new Error('Erro ao buscar fotos: ' + photosError.message);

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
                                    buyer_id: finalUserId,
                                    buyer_name: customerName || metadata.customerName || null,
                                    price: finalPrice,
                                    commission: commissionValue,
                                    photographer_id: photo.photographer_id,
                                    commission_rate: rate,
                                    sale_date: new Date().toISOString(),
                                    billing_id: checkout.id
                                });

                                if (saleError) {
                                    throw new Error(`Erro ao salvar venda da foto ${photo.id}: ${saleError.message}`);
                                }
                            }
                            console.log('[AbacatePay Webhook] Vendas registradas com sucesso.');
                        }
                    }
                } catch (processError) {
                    console.error('[AbacatePay Webhook] Erro no processamento de vendas:', processError);
                    // LOG DE ERRO NO BANCO: Atualiza o metadata da cobrança com o erro para debug
                    await supabaseAdmin
                        .from('abacate_pay_billings')
                        .update({ 
                            metadata: { 
                                ...(metadata || {}), 
                                webhook_error: processError.message,
                                error_at: new Date().toISOString() 
                            } 
                        })
                        .eq('billing_id', checkout.id);
                }
            }
        }

        // checkout.refunded — reembolso confirmado pelo AbacatePay
        if (body.event === 'checkout.refunded') {
            const checkout = body.data?.checkout;
            if (checkout?.id) {
                // 1. Atualizar o billing
                await supabaseAdmin
                    .from('abacate_pay_billings')
                    .update({ status: 'REFUNDED' })
                    .eq('billing_id', checkout.id);
                
                // 2. Atualizar as Vendas vinculadas para status 'refunded' (Anti-Fraude)
                // Isso fará com que o valor seja subtraído do saldo disponível na View
                const { error: saleRefundError } = await supabaseAdmin
                    .from('sales')
                    .update({ status: 'refunded' })
                    .eq('billing_id', checkout.id);

                if (saleRefundError) {
                    console.error('[AbacatePay Webhook] Erro ao estornar vendas no banco:', saleRefundError);
                } else {
                    console.log('[AbacatePay Webhook] Vendas marcadas como estornadas para billing:', checkout.id);
                }
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
