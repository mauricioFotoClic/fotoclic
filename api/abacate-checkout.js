
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
                unitPrice: Math.round(item.price), // Já deve vir em centavos ou multiplicamos por 100 se vier em reais
                quantity: item.quantity || 1,
                description: item.description || ''
            })),
            customer: {
                name: customer.name,
                email: customer.email,
                taxId: customer.taxId || '00000000000', // CPF/CNPJ opcional em alguns fluxos mas recomendado
            },
            returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5173'}/checkout-success`,
            completionUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5173'}/sales`,
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

        const result = await response.json();
        console.log('[AbacatePay] Resposta da API:', result);

        if (!response.ok) {
            console.error('[AbacatePay] Erro detalhado da API:', JSON.stringify(result, null, 2));
            return res.status(response.status).json({ 
                error: result.message || 'Erro na API Abacate Pay',
                details: result.errors || null
            });
        }

        // Retornamos a URL de checkout para o frontend redirecionar
        return res.status(200).json({
            url: result.data.url,
            id: result.data.id
        });

    } catch (error) {
        console.error('[AbacatePay] Erro Interno:', error);
        return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
}
