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
        let rawBody;
        if (req.rawBody) {
            // Se vier do Express com middleware de rawBody
            rawBody = req.rawBody;
        } else {
            // Se vier do Vercel/Next.js (Stream)
            rawBody = await getRawBody(req);
        }
        
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

            // Prioridade para identificar o método usado
            let method = 'PIX'; // Default seguro
            if (payerInfo?.cardBrand || checkout.methods?.includes('CARD') && !checkout.methods?.includes('PIX')) {
                method = 'CARD';
            } else if (Array.isArray(checkout.methods) && checkout.methods.length === 1) {
                method = checkout.methods[0];
            }
            
            // Tenta pegar o método específico do objeto payment se disponível (v2)
            if (checkout.payment?.method) {
                method = checkout.payment.method;
            }

            // 1. Garantir que o Cliente (Customer) exista no nosso sistema (tabela users)
            let userId = null; // Inicia como null (guest)
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

            // --- CRITICAL FIX: Update status to PAID IMMEDIATELY ---
            const { data: billingRecord, error: updateError } = await supabaseAdmin
                .from('abacate_pay_billings')
                .update({ 
                    status: 'PAID', 
                    payment_method: method,
                    updated_at: new Date().toISOString()
                })
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
                    // PRIORIDADE: Se o usuário estava logado no ato da compra (metadata.userId), 
                    // vinculamos a venda a ele, mesmo que ele use outro e-mail para pagar no Abacate Pay.
                    const finalUserId = (metadata.userId && metadata.userId !== 'guest-id' && metadata.userId !== null) 
                        ? metadata.userId 
                        : userId; 

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
                                .eq('id', 1)
                                .single();

                            // Obter dados dos fotógrafos
                            const photographerIds = [...new Set(photos.map(p => p.photographer_id))];
                            const { data: photographersData } = await supabaseAdmin
                                .from('users')
                                .select('id, name, email')
                                .in('id', photographerIds);
                            
                            const photographerMap = (photographersData || []).reduce((acc, p) => {
                                acc[p.id] = p;
                                return acc;
                            }, {});
                            const photographerSalesMap = {};

                            const defaultRate = settingsRow?.commission_default_rate || 0.06;
                            const customRates = settingsRow?.commission_custom_rates || {};

                            let insertedCount = 0;

                            for (const photo of photos) {
                                try {
                                    let rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                                    const finalPrice = photo.price;
                                    const commissionValue = finalPrice * rate;

                                    const { data: existingSale } = await supabaseAdmin.from('sales')
                                        .select('id')
                                        .eq('buyer_id', finalUserId)
                                        .eq('photo_id', photo.id)
                                        .maybeSingle();

                                    if (existingSale) {
                                        console.log(`[AbacatePay Webhook] Venda duplicada prevenida para a foto ${photo.id}.`);
                                        continue; // skip insert
                                    }

                                    // Registrar venda para o email do fotógrafo APENAS SE FOR NOVA
                                    if (!photographerSalesMap[photo.photographer_id]) {
                                        photographerSalesMap[photo.photographer_id] = {
                                            photographer: photographerMap[photo.photographer_id],
                                            totalCommission: 0,
                                            photos: []
                                        };
                                    }
                                    photographerSalesMap[photo.photographer_id].totalCommission += commissionValue;
                                    photographerSalesMap[photo.photographer_id].photos.push({
                                        title: photo.title,
                                        price: finalPrice,
                                        commission: commissionValue,
                                        preview_url: photo.preview_url
                                    });

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
                                        console.error(`[AbacatePay Webhook] Falha ao registrar venda para foto ${photo.id}:`, saleError.message);
                                    } else {
                                        insertedCount++;
                                    }
                                } catch (loopErr) {
                                    console.error(`[AbacatePay Webhook] Erro crítico no loop de vendas para foto ${photo.id}:`, loopErr);
                                }
                            }
                            console.log('[AbacatePay Webhook] Processamento de vendas concluído. Inserções:', insertedCount);

                            if (insertedCount > 0) {
                                // --- NOVIDADE: Enviar Email de Confirmação para o Comprador (Dinamizado pelo Banco) ---
                                if (customerEmail) {
                                try {
                                    // 1. Buscar Templates do Banco
                                    const { data: settingsRow } = await supabaseAdmin
                                        .from('system_settings')
                                        .select('email_templates')
                                        .eq('id', 1)
                                        .single();
                                    
                                    const templates = settingsRow?.email_templates || {};
                                    const template = templates.purchaseConfirmation || {
                                        subject: '✅ Sua compra no FotoClic foi confirmada!',
                                        body: 'Olá {{nome_cliente}}!\n\nSeu pagamento foi confirmado.\n\nFotos:\n{{lista_fotos}}\n\nTotal: R$ {{valor_total}}'
                                    };

                                    // 2. Preparar Variáveis
                                    const photoListText = photos.map(p => `- ${p.title || 'Foto'}: R$ ${p.price.toFixed(2).replace('.', ',')}`).join('\n');
                                    const photoListHtml = photos.map(p => `
                                        <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
                                            <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
                                            <div>
                                                <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto'}</div>
                                                <div style="color: #718096; font-size: 12px;">Preço: R$ ${p.price.toFixed(2).replace('.', ',')}</div>
                                            </div>
                                        </div>
                                    `).join('');
                                    const totalAmount = (checkout.amount / 100).toFixed(2).replace('.', ',');

                                    const replacements = {
                                        'nome_cliente': customerName,
                                        'valor_total': totalAmount,
                                        'quantidade_fotos': photos.length.toString(),
                                        'lista_fotos': photoListText
                                    };

                                    // 3. Substituir Placeholders
                                    let subject = template.subject || 'Sua compra foi confirmada!';
                                    let body = template.body || '';
                                    
                                    Object.entries(replacements).forEach(([key, val]) => {
                                        subject = subject.split(`{{${key}}}`).join(val);
                                        body = body.split(`{{${key}}}`).join(val);
                                    });

                                    // 4. Montar HTML Final (Injetando a lista HTML no lugar da de texto se necessário)
                                    let bodyHtml = body;
                                    if (body.includes(photoListText)) {
                                        bodyHtml = body.replace(photoListText, photoListHtml);
                                    }

                                    const finalHtml = `
                                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                            <div style="background-color: #FF6B00; padding: 32px 20px; text-align: center;">
                                                <h1 style="color: white; margin: 0; font-size: 24px;">Compra Confirmada!</h1>
                                            </div>
                                            <div style="padding: 32px 24px;">
                                                <div style="font-size: 16px; line-height: 1.6; color: #475569; white-space: pre-wrap;">${bodyHtml}</div>
                                                <div style="text-align: center; margin: 40px 0;">
                                                    <a href="${process.env.VITE_SITE_URL || 'https://fotoclic.com.br'}/minhas-compras" style="background-color: #FF6B00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                                                        Acessar Minhas Fotos
                                                    </a>
                                                </div>
                                            </div>
                                        </div>`;

                                    console.log('[AbacatePay Webhook] Enviando e-mail para:', customerEmail);
                                    const resendRes = await fetch('https://api.resend.com/emails', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            from: 'FotoClic <nao-responda@fotoclic.com.br>',
                                            to: customerEmail,
                                            subject: subject,
                                            html: finalHtml
                                        }),
                                    });

                                    const resendData = await resendRes.json();
                                    if (resendRes.ok) {
                                        console.log('[AbacatePay Webhook] E-mail enviado com sucesso:', resendData.id);
                                    } else {
                                        console.error('[AbacatePay Webhook] Erro na API do Resend:', resendData);
                                    }
                                } catch (emailErr) {
                                    console.error('[AbacatePay Webhook] Erro fatal ao enviar email de confirmação:', emailErr);
                                }
                            }

                            // --- NOVIDADE 2: Enviar Email para os Fotógrafos ---
                            for (const [pId, saleData] of Object.entries(photographerSalesMap)) {
                                if (saleData.photographer && saleData.photographer.email) {
                                    try {
                                        const photoListHtmlPhotog = saleData.photos.map(p => `
                                            <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
                                                <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
                                                <div>
                                                    <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto'}</div>
                                                    <div style="color: #718096; font-size: 12px;">Venda: R$ ${p.price.toFixed(2).replace('.', ',')} | Comissão: <strong style="color: #059669;">R$ ${p.commission.toFixed(2).replace('.', ',')}</strong></div>
                                                </div>
                                            </div>
                                        `).join('');
                                        
                                        const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';
                                        const finalHtmlPhotog = `
                                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                                <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                                                    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nova Venda Realizada!</h1>
                                                </div>
                                                <div style="padding: 32px 24px;">
                                                    <p style="font-size: 16px;">Olá, <strong>${saleData.photographer.name || 'Fotógrafo'}</strong>!</p>
                                                    <p style="font-size: 16px; color: #475569;">Excelentes notícias! Você acabou de realizar <strong>${saleData.photos.length} venda(s)</strong> no FotoClic.</p>
                                                    
                                                    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
                                                        <p style="margin: 0; color: #065f46; font-size: 14px;">Comissão Recebida</p>
                                                        <p style="margin: 4px 0 0 0; color: #047857; font-size: 28px; font-weight: bold;">R$ ${saleData.totalCommission.toFixed(2).replace('.', ',')}</p>
                                                    </div>

                                                    <h3 style="color: #1e293b; margin-top: 24px;">Fotos Vendidas:</h3>
                                                    ${photoListHtmlPhotog}

                                                    <div style="text-align: center; margin: 40px 0;">
                                                        <a href="${siteUrl}/photographer-dashboard" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                                                            Ver Central Financeira
                                                        </a>
                                                    </div>
                                                </div>
                                                <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                                                    © ${new Date().getFullYear()} FotoClic Marketplace. Todos os direitos reservados.
                                                </div>
                                            </div>`;

                                        console.log('[AbacatePay Webhook] Enviando e-mail para Fotógrafo:', saleData.photographer.email);
                                        await fetch('https://api.resend.com/emails', {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                from: 'FotoClic <nao-responda@fotoclic.com.br>',
                                                to: saleData.photographer.email,
                                                subject: '🎉 Você realizou uma nova venda no FotoClic!',
                                                html: finalHtmlPhotog
                                            }),
                                        });
                                    } catch (err) {
                                        console.error('[AbacatePay Webhook] Erro ao enviar email para o fotografo:', err);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (processError) {
                    console.error('[AbacatePay Webhook] Erro fatal no processamento de vendas:', processError);
                    // LOG DE ERRO NO BANCO
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
