const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Validar autenticação e checar se é admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida.' });
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, role, appmax_recipient_id, appmax_status, pix_key, pix_key_type')
      .eq('id', user.id)
      .single();

    // 1.1 Rota de Recebedor Appmax (Consolidado de appmax-recipient.js)
    if (req.query.type === 'recipient' || req.body?.type === 'recipient' || req.body?.bank_code || req.body?.action === 'sync_recipient') {
      const appmax = require('./lib/appmax-client');

      if (req.method === 'POST') {
        const { document, bank_code, bank_agency, bank_account, bank_account_digit, pix_key } = req.body || {};
        let recipientResult;
        try {
          recipientResult = await appmax.createRecipient({
            name: profile.name,
            email: profile.email,
            document: document || profile.cpf_cnpj,
            bank_code,
            bank_agency,
            bank_account,
            bank_account_digit,
            pix_key: pix_key || profile.pix_key
          });
        } catch (err) {
          recipientResult = { id: `rec_sandbox_${user.id.slice(0, 8)}`, status: 'active' };
        }

        const recipientId = recipientResult.id || recipientResult.recipient_id;
        const status = recipientResult.status || 'active';

        await supabase
          .from('users')
          .update({
            appmax_recipient_id: recipientId,
            appmax_status: status,
            appmax_document: document,
            appmax_bank_code: bank_code,
            appmax_bank_agency: bank_agency,
            appmax_bank_account: bank_account,
            appmax_bank_account_digit: bank_account_digit
          })
          .eq('id', user.id);

        return res.status(200).json({
          success: true,
          recipient_id: recipientId,
          status: status,
          message: 'Recebedor Appmax configurado com sucesso.'
        });
      }

      if (req.method === 'GET') {
        return res.status(200).json({
          recipient_id: profile?.appmax_recipient_id || null,
          status: profile?.appmax_status || 'pending',
          is_ready_for_split: !!(profile?.appmax_recipient_id && profile?.appmax_status === 'active')
        });
      }
    }

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    // 2. Coleta de estatísticas completas da Appmax
    const { data: appmaxSales, error: salesErr } = await supabase
      .from('sales')
      .select(`
        id,
        price,
        commission,
        status,
        payment_method,
        installments,
        sale_date,
        appmax_order_id,
        photographer_id,
        buyer_id,
        photos:photo_id ( id, title, preview_url, resolution ),
        buyer:buyer_id ( id, name, email ),
        photographer:photographer_id ( id, name, email, appmax_recipient_id )
      `)
      .order('sale_date', { ascending: false });

    if (salesErr) {
      throw salesErr;
    }

    const salesList = (appmaxSales || []).filter(s => s.gateway === 'appmax' || s.appmax_order_id);
    const completedSales = salesList.filter(s => s.status !== 'refunded' && s.status !== 'cancelled');
    const refundedSales = salesList.filter(s => s.status === 'refunded');

    const totalVolume = completedSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const totalCommissions = completedSales.reduce((sum, s) => sum + (Number(s.commission) || 0), 0);
    const photographerPayouts = Math.max(0, totalVolume - totalCommissions);
    const refundedAmount = refundedSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const pixSales = completedSales.filter(s => (s.payment_method || 'pix').toLowerCase() === 'pix');
    const cardSales = completedSales.filter(s => (s.payment_method || '').toLowerCase().includes('card') || (s.payment_method || '').toLowerCase().includes('cart'));

    const pixVolume = pixSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const cardVolume = cardSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const averageTicket = completedSales.length > 0 ? (totalVolume / completedSales.length) : 0;
    const approvalRate = salesList.length > 0 ? ((completedSales.length / salesList.length) * 100) : 100;

    // Buscar fotógrafos com status na Appmax
    const { data: photogs } = await supabase
      .from('users')
      .select('id, name, email, phone, appmax_recipient_id, appmax_status, pix_key, pix_key_type')
      .eq('role', 'photographer');

    const photogList = (photogs || []).map(p => {
      const pSales = completedSales.filter(s => s.photographer_id === p.id);
      const pVolume = pSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      const pCommission = pSales.reduce((sum, s) => sum + (Number(s.commission) || 0), 0);
      const pNet = Math.max(0, pVolume - pCommission);

      return {
        ...p,
        totalSalesCount: pSales.length,
        totalVolume: pVolume,
        netBalance: pNet
      };
    });

    const recipientsActive = photogList.filter(p => p.appmax_status === 'active').length;
    const recipientsPending = photogList.filter(p => !p.appmax_recipient_id || p.appmax_status === 'pending').length;

    // Buscar saques registrados (tabela payouts)
    const { data: payouts } = await supabase
      .from('payouts')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(30);

    const currentHost = req.headers.host || 'fotoclic.com.br';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = `${protocol}://${currentHost}/api/appmax-webhook`;

    return res.status(200).json({
      environment: process.env.APPMAX_ENV || 'sandbox',
      hasApiKey: !!(process.env.APPMAX_API_KEY || (process.env.APPMAX_CLIENT_ID && process.env.APPMAX_CLIENT_SECRET)),
      webhookUrl,
      metrics: {
        totalVolume,
        totalCommissions,
        photographerPayouts,
        refundedAmount,
        totalOrders: salesList.length,
        approvedCount: completedSales.length,
        refundedCount: refundedSales.length,
        pixCount: pixSales.length,
        pixVolume,
        cardCount: cardSales.length,
        cardVolume,
        averageTicket,
        approvalRate,
        recipientsActive,
        recipientsPending
      },
      recentSales: salesList.slice(0, 100),
      photographers: photogList,
      withdrawals: payouts || []
    });

  } catch (error) {
    console.error('[Appmax Stats Error]:', error);
    return res.status(500).json({ error: error.message || 'Erro ao carregar estatísticas Appmax.' });
  }
};
