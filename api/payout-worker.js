import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key (Required for writing payouts and reading all users)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ABACATE_PAY_API_KEY = process.env.ABACATEPAY_API_KEY;

export default async function handler(req, res) {
  // 1. Security Check (Vercel Cron Secret)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('--- Inciando Processamento de Payouts ---');

    // 2. Fetch photographers eligible for payout
    // Rules: 
    // - balance_available >= 100
    // - pix_key is present
    // - payout_blocked is false
    // - frequency matches today (simplified for this example, usually handled by checking last payout date)
    const { data: eligiblePhotographers, error: fetchError } = await supabase
      .from('photographer_wallet_summary')
      .select('*, users(pix_key, pix_key_type, payout_frequency, payout_blocked, email)')
      .gte('balance_available', 100);

    if (fetchError) throw fetchError;

    const results = [];

    for (const photographer of eligiblePhotographers) {
      const user = photographer.users;
      
      // Additional validations
      if (user.payout_blocked || !user.pix_key) continue;

      // TODO: Logic for frequency (diario, semanal, mensal)
      // For now, if they reached 100, we process (aggressive mode)
      
      console.log(`Processando saque para ${user.email}: R$ ${photographer.balance_available}`);

      try {
        // 3. Call AbacatePay API to send Payout (V2)
        const abacateResponse = await fetch('https://api.abacatepay.com/v2/payouts/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(photographer.balance_available * 100), // em centavos
            pixKey: user.pix_key,
            pixKeyType: user.pix_key_type,
            externalId: `payout_${photographer.photographer_id}_${Date.now()}`
          })
        });

        const abacateData = await abacateResponse.json();

        if (!abacateResponse.ok || !abacateData.success) {
          throw new Error(`AbacatePay Error: ${JSON.stringify(abacateData)}`);
        }

        // 4. Record Payout in Database
        const { data: payout, error: payoutError } = await supabase
          .from('payouts')
          .insert({
            photographer_id: photographer.photographer_id,
            amount: photographer.balance_available,
            status: 'paid',
            processed_date: new Date().toISOString(),
            external_id: abacateData.id // ID from AbacatePay
          })
          .select()
          .single();

        if (payoutError) throw payoutError;

        // 5. Mark Sales as Processed (link to payout_id)
        const { error: updateSalesError } = await supabase
          .from('sales')
          .update({ payout_id: payout.id })
          .eq('photographer_id', photographer.photographer_id)
          .is('payout_id', null)
          .lte('available_at', new Date().toISOString());

        if (updateSalesError) throw updateSalesError;

        results.push({ email: user.email, status: 'success', amount: photographer.balance_available });

      } catch (err) {
        console.error(`Erro ao processar payout para ${user.email}:`, err);
        results.push({ email: user.email, status: 'error', error: err.message });
      }
    }

    console.log('--- Fim do Processamento ---');
    return res.status(200).json({ processed: results.length, details: results });

  } catch (error) {
    console.error('Falha crítica no worker:', error);
    return res.status(500).json({ error: error.message });
  }
}
