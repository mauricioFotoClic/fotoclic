import { supabase } from '../services/supabaseClient';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

    try {
        // Buscamos as cobranças registradas na nossa nova tabela
        const { data: billings, error } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            // Se a tabela ainda não existir, retornamos dados vazios para não quebrar a UI
            if (error.code === 'PGRST116' || error.message.includes('relation "abacate_pay_billings" does not exist')) {
                return res.status(200).json({ billings: [], stats: { total_paid: 0, pending_count: 0, balance: 0 } });
            }
            throw error;
        }

        // Calculamos estatísticas básicas
        const totalPaid = billings
            .filter(b => b.status === 'PAID')
            .reduce((sum, b) => sum + b.amount, 0);

        const pendingCount = billings
            .filter(b => b.status === 'PENDING')
            .length;

        return res.status(200).json({
            billings,
            stats: {
                total_paid: totalPaid,
                pending_count: pendingCount,
                balance: totalPaid * 0.95 // Exemplo de cálculo de saldo (ajustar conforme taxas reais)
            }
        });

    } catch (error) {
        console.error('[AbacateStats] Erro:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas da Abacate Pay.' });
    }
}
