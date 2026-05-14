import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Configuração ausente: ABACATEPAY_API_KEY.' });
    }

    try {
        console.log('[AbacatePay] Corpo da requisição recebido:', JSON.stringify(req.body, null, 2));
        const { items, customer, metadata } = req.body;

        if (!items || !customer) {
            console.error('[AbacatePay] Erro: items ou customer ausentes no corpo da requisição.');
            return res.status(400).json({ error: 'Dados do checkout (items/customer) são obrigatórios.' });
        }

        // Normalizar a URL do site (remover barra final se existir para evitar barras duplas)
        const siteUrl = (process.env.VITE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
        console.log('[AbacatePay] siteUrl normalizada:', siteUrl);

            // Na API v2 do Abacate Pay, precisamos criar os produtos antes do checkout
            const itemsV2 = await Promise.all(items.map(async (item) => {
                // Usamos ID + Preço no externalId para permitir variações de preço se houver descontos
                const externalId = `${item.id}_${item.price}`;
                
                try {
                    const prodRes = await fetch('https://api.abacatepay.com/v2/products/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            externalId: externalId,
                            name: String(item.title || 'Foto FotoClic'),
                            description: 'Foto digital',
                            price: Math.round(Number(item.price)),
                            currency: "BRL"
                        })
                    });
                    
                    const prodData = await prodRes.json();
                    
                    // Se sucesso ou se já existir (alguns gateways retornam erro mas o produto serve)
                    if (prodData.success) {
                        return { id: prodData.data.id, quantity: 1 };
                    } else {
                        const errorDetail = prodData.error || prodData.message || "";
                        
                        // Se o erro for de produto já existente, vamos buscar o ID dele na lista
                        if (errorDetail.includes('already exists') || prodRes.status === 409 || prodRes.status === 400) {
                            console.log(`[AbacatePay] Produto "${item.title}" já existe. Buscando ID...`);
                            
                            const listRes = await fetch('https://api.abacatepay.com/v2/products/list', {
                                method: 'GET',
                                headers: { 'Authorization': `Bearer ${apiKey}` }
                            });
                            
                            const listData = await listRes.json();
                            if (listData.success && Array.isArray(listData.data)) {
                                const existingProd = listData.data.find(p => p.externalId === externalId);
                                if (existingProd) {
                                    console.log(`[AbacatePay] ID do produto existente encontrado:`, existingProd.id);
                                    return { id: existingProd.id, quantity: 1 };
                                }
                            }
                        }

                        console.error('[AbacatePay] Erro ao criar produto v2:', prodData);
                        throw new Error(`Falha ao registrar produto "${item.title}": ${errorDetail || JSON.stringify(prodData)}`);
                    }
                } catch (err) {
                    console.error('[AbacatePay] Exceção na criação do produto:', err);
                    throw err;
                }
            }));

            // 1. Criar ou buscar o cliente no Abacate Pay (Padrão v2)
        let customerId = null;
        try {
            const customerRes = await fetch('https://api.abacatepay.com/v2/customer/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: String(customer.name).substring(0, 100),
                    email: String(customer.email),
                    taxId: String(customer.taxId || customer.cpf || '').replace(/\D/g, '').substring(0, 11),
                    cellphone: String(customer.phone || '').replace(/\D/g, '').substring(0, 15),
                }),
            });
            const customerData = await customerRes.json();
            if (customerData.success && customerData.data?.id) {
                customerId = customerData.data.id;
                console.log('[AbacatePay] Cliente criado/encontrado:', customerId);
            } else {
                console.warn('[AbacatePay] Falha ao criar cliente (continuando sem ID):', customerData);
            }
        } catch (err) {
            console.error('[AbacatePay] Erro na criação de cliente:', err);
        }

        const body = {
            frequency: "ONE_TIME",
            methods: ["PIX", "CARD"],
            items: itemsV2,
            returnUrl: siteUrl + '/checkout-success',
            completionUrl: siteUrl + '/sales',
            customerId: customerId, // Aqui vinculamos o cliente criado
            metadata: {
                cartIds: items.map(i => i.id),
                userId: customer.id || 'guest-id',
                customerName: String(customer.name).substring(0, 50)
            }
        };

        // Se não conseguimos o customerId, tentamos passar o objeto customer como fallback (v1 style)
        if (!customerId) {
            body.customer = {
                name: String(customer.name).substring(0, 100),
                email: String(customer.email),
                taxId: String(customer.taxId || customer.cpf || '').replace(/\D/g, ''), 
                cellphone: customer.phone ? String(customer.phone).replace(/\D/g, '') : "11999999999"
            };
        }

        console.log('[AbacatePay] Iniciando criação de cobrança V2...', body);

        const response = await fetch('https://api.abacatepay.com/v2/checkouts/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        let result;
        const textResponse = await response.text();
        
        try {
            result = JSON.parse(textResponse);
        } catch (e) {
            console.error('[Pagamento] Resposta não é JSON:', textResponse);
            return res.status(500).json({ error: 'Falha de comunicação com o gateway de pagamento.' });
        }

        console.log('[AbacatePay] Resposta da API:', result);

        if (!response.ok) {
            console.error('[AbacatePay] Erro detalhado da API:', JSON.stringify(result, null, 2));
            const errorMessage = result.error || result.message || (result.errors && result.errors[0]?.message);
            return res.status(response.status).json({ 
                error: 'Erro no gateway de pagamento',
                details: errorMessage || result
            });
        }

        // Salvar a cobrança no banco de dados como pendente
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // Calculamos o total em centavos que está sendo cobrado
            const totalCents = items.reduce((acc, item) => acc + Math.round(item.price), 0);

            const { error: dbError } = await supabase
                .from('abacate_pay_billings')
                .insert({
                    billing_id: result.data.id,
                    amount: totalCents,
                    status: 'PENDING',
                    checkout_url: result.data.url,
                    customer_name: customer.name || 'Cliente FotoClic',
                    customer_email: customer.email,
                    customer_cpf: customer.taxId || '12345678909',
                    metadata: metadata || {}
                });

            if (dbError) {
                console.error('[AbacatePay] Erro ao salvar cobrança no banco:', dbError);
                // Não falhamos o checkout se não salvou, mas logamos. O ideal seria falhar.
                // Mas vamos prosseguir por resiliência ou alertar.
            } else {
                console.log('[AbacatePay] Cobrança salva no banco com sucesso (PENDING).');
            }
        } else {
            console.warn('[AbacatePay] Supabase service role não configurada, pulando salvamento.');
        }

        // Retornamos a URL de checkout para o frontend redirecionar
        return res.status(200).json({
            url: result.data.url,
            id: result.data.id
        });

    } catch (error) {
        console.error('[Pagamento] Erro Crítico:', error);
        return res.status(500).json({ 
            error: 'Erro interno ao processar pagamento.',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
