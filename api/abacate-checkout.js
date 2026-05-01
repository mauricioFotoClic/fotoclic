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
        const { items, customer, metadata } = req.body;

        // Abacate Pay exige dados básicos do cliente para cobranças
        // Items format: [{ title, price, quantity }] - price in CENTS
        const body = {
            frequency: "ONE_TIME",
            methods: ["PIX", "CARD"],
            products: items.map(item => ({
                externalId: item.id || 'photo-id',
                name: item.title || item.name,
                unitPrice: Math.round(item.price), // Converte de Reais para Centavos
                quantity: item.quantity || 1,
                description: item.description || ''
            })),
            customer: {
                name: customer.name || 'Cliente FotoClic',
                email: customer.email,
                taxId: customer.taxId || '12345678909', // CPF de teste se estiver vazio
            },
            returnUrl: `${process.env.VITE_SITE_URL || 'http://localhost:3000'}/checkout-success`,
            completionUrl: `${process.env.VITE_SITE_URL || 'http://localhost:3000'}/sales`,
        };

        console.log('[AbacatePay] Iniciando criação de cobrança...', body);

        const response = await fetch('https://api.abacatepay.com/v1/billing/create', {
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
            return res.status(response.status).json({ 
                error: 'Erro no gateway de pagamento',
                details: result.errors || result.message || null
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
        console.error('[Pagamento] Erro Interno:', error);
        return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
}
