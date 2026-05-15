import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado.' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Sessão inválida.' });
    }

    try {
        // 1. Buscar todas as cobranças pagas deste usuário que NÃO estão na tabela sales
        const { data: billings, error: bError } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID')
            .filter('metadata->>userId', 'eq', user.id);

        if (bError) throw bError;

        if (!billings || billings.length === 0) {
            return res.status(200).json({ message: 'Tudo sincronizado.', count: 0 });
        }

        // 2. Buscar vendas existentes para este usuário para evitar duplicidade
        const { data: existingSales, error: sError } = await supabase
            .from('sales')
            .select('billing_id')
            .eq('buyer_id', user.id);

        if (sError) throw sError;

        const saleBillingIds = new Set(existingSales.map(s => s.billing_id));
        const orphans = billings.filter(b => !saleBillingIds.has(b.billing_id));

        if (orphans.length === 0) {
            return res.status(200).json({ message: 'Tudo sincronizado.', count: 0 });
        }

        // 3. Processar órfãos (similar ao webhook)
        let createdCount = 0;
        const { data: settingsRow } = await supabase.from('system_settings').select('*').eq('id', 1).single();
        const defaultRate = settingsRow?.commission_default_rate || 0.06;
        const customRates = settingsRow?.commission_custom_rates || {};

        for (const billing of orphans) {
            const metadata = billing.metadata || {};
            const cartIds = metadata.cartIds || [];

            if (cartIds.length > 0) {
                const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                
                if (photos) {
                    for (const photo of photos) {
                        let rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        
                        await supabase.from('sales').insert({
                            photo_id: photo.id,
                            buyer_id: user.id,
                            price: photo.price,
                            commission: photo.price * rate,
                            commission_rate: rate,
                            photographer_id: photo.photographer_id,
                            billing_id: billing.billing_id,
                            status: 'completed',
                            is_available: true,
                            available_at: new Date().toISOString(),
                            sale_date: billing.updated_at || new Date().toISOString()
                        });
                        createdCount++;
                    }
                }
            }
        }

        return res.status(200).json({ message: 'Sincronização concluída.', count: createdCount });
    } catch (err) {
        console.error('Erro no sync-purchases:', err);
        return res.status(500).json({ error: 'Falha na sincronização.' });
    }
}
