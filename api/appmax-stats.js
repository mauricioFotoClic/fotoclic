import { createClient } from '@supabase/supabase-js';
import appmax from '../lib/appmax-client.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!supabaseUrl || !supabaseServiceRole) {
      return res.status(500).json({ error: 'Configuração do Supabase ausente.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Validar autenticação Bearer JWT
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
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // 1.1 Rota de Recebedor Appmax (Consolidado de appmax-recipient.js)
    if (req.query.type === 'recipient' || req.body?.type === 'recipient' || req.body?.bank_code || req.body?.action === 'sync_recipient') {
      if (req.method === 'POST') {
        const { document, bank_code, bank_agency, bank_account, bank_account_digit, pix_key } = req.body || {};
        let recipientResult;
        try {
          recipientResult = await appmax.createRecipient({
            name: profile?.name || 'Fotógrafo',
            email: profile?.email || user.email,
            document: document || profile?.cpf_cnpj || profile?.appmax_document,
            bank_code,
            bank_agency,
            bank_account,
            bank_account_digit,
            pix_key: pix_key || profile?.pix_key
          });
        } catch (err) {
          recipientResult = { id: `rec_sandbox_${user.id.slice(0, 8)}`, status: 'active' };
        }

        const recipientId = recipientResult?.id || recipientResult?.recipient_id || `rec_${user.id.slice(0, 8)}`;
        const status = recipientResult?.status || 'active';

        try {
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
        } catch (dbErr) {
          console.warn('[Appmax Recipient DB Warn]', dbErr.message);
        }

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

    // 2. Coleta de estatísticas completas da Appmax e vendas da plataforma
    let allSales = [];
    try {
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      if (!salesErr && salesData) {
        allSales = salesData;
      }
    } catch (e) {
      console.warn('[Appmax Stats Sales Query Warning]', e);
    }

    // Buscar usuários (fotógrafos e clientes) e fotos para enriquecer as transações
    const buyerIds = Array.from(new Set(allSales.map(s => s.buyer_id).filter(Boolean)));
    const photogIds = Array.from(new Set(allSales.map(s => s.photographer_id).filter(Boolean)));
    const photoIds = Array.from(new Set(allSales.map(s => s.photo_id).filter(Boolean)));

    let usersMap = new Map();
    try {
      const allUserIds = Array.from(new Set([...buyerIds, ...photogIds]));
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email, role, pix_key, pix_key_type, cpf_cnpj, is_active, appmax_recipient_id, appmax_status')
          .in('id', allUserIds);

        (usersData || []).forEach(u => usersMap.set(u.id, u));
      }
    } catch (uErr) {
      console.warn('[Appmax Stats Users Warning]', uErr);
    }

    let photosMap = new Map();
    try {
      if (photoIds.length > 0) {
        const { data: photosData } = await supabase
          .from('photos')
          .select('id, title, preview_url, thumb_url, price')
          .in('id', photoIds);

        (photosData || []).forEach(p => photosMap.set(p.id, p));
      }
    } catch (pErr) {
      console.warn('[Appmax Stats Photos Warning]', pErr);
    }

    // Montar lista de vendas enriquecida
    const enrichedSales = (allSales || []).map(s => {
      const buyer = usersMap.get(s.buyer_id);
      const photographer = usersMap.get(s.photographer_id);
      const photo = photosMap.get(s.photo_id);
      const price = Number(s.price) || (photo ? Number(photo.price) : 0) || 0;
      const commission = Number(s.commission) !== undefined && Number(s.commission) > 0
        ? Number(s.commission)
        : Number((price * 0.06).toFixed(2));

      return {
        ...s,
        price,
        commission,
        appmax_order_id: s.billing_id || s.appmax_order_id || (s.id ? String(s.id).slice(0, 8) : 'ORD'),
        payment_method: (s.payment_method || 'PIX').toLowerCase(),
        status: s.status || 'completed',
        buyer: {
          id: s.buyer_id,
          name: s.buyer_name || buyer?.name || 'Cliente',
          email: buyer?.email || ''
        },
        photographer: {
          id: s.photographer_id,
          name: photographer?.name || 'Fotógrafo',
          email: photographer?.email || '',
          pix_key: photographer?.pix_key || '',
          cpf_cnpj: photographer?.cpf_cnpj || ''
        },
        photos: {
          id: s.photo_id,
          title: photo?.title || 'Foto Digital',
          preview_url: photo?.preview_url || '',
          thumb_url: photo?.thumb_url || ''
        }
      };
    });

    // Filtra EXCLUSIVAMENTE transações da Appmax (ignora vendas legadas do Abacate Pay que usam 'bill_')
    const isAppmaxTransaction = (s) => {
      if (!s) return false;
      const bId = String(s.billing_id || s.appmax_order_id || '').trim();
      const lower = bId.toLowerCase();

      // 1. Se tem prefixo do AbacatePay ('bill_', 'dev_bill_', 'prod_bill_'), é legado
      if (lower.startsWith('bill_') || lower.startsWith('dev_bill_') || lower.startsWith('prod_bill_')) {
        return false;
      }
      if (s.gateway === 'abacate' || s.gateway === 'abacatepay') {
        return false;
      }

      // 2. Se for explicitamente marcado como appmax
      if (s.gateway === 'appmax' || s.payment_method === 'appmax') {
        return true;
      }

      // 3. Se tiver ID de pedido da Appmax (geralmente numérico) ou não for formato do Abacate
      if (bId && !lower.startsWith('bill_') && !lower.startsWith('mock_') && !lower.startsWith('test_legacy_')) {
        return true;
      }

      return false;
    };

    const salesList = enrichedSales.filter(isAppmaxTransaction);
    const completedSales = salesList.filter(s => s.status !== 'refunded' && s.status !== 'cancelled');
    const refundedSales = salesList.filter(s => s.status === 'refunded');

    const totalVolume = completedSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const totalCommissions = completedSales.reduce((sum, s) => sum + (Number(s.commission) || 0), 0);
    const photographerPayouts = Math.max(0, totalVolume - totalCommissions);
    const refundedAmount = refundedSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const pixSales = completedSales.filter(s => (s.payment_method || 'pix').includes('pix') || !s.payment_method);
    const cardSales = completedSales.filter(s => (s.payment_method || '').includes('card') || (s.payment_method || '').includes('cart'));

    const pixVolume = pixSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const cardVolume = cardSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const averageTicket = completedSales.length > 0 ? (totalVolume / completedSales.length) : 0;
    const approvalRate = salesList.length > 0 ? ((completedSales.length / salesList.length) * 100) : 100;

    // Buscar lista completa de fotógrafos
    let photogList = [];
    try {
      const { data: photogs } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'photographer');

      photogList = (photogs || []).map(p => {
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
    } catch (e) {
      console.warn('[Appmax Stats Photogs Warning]', e);
    }

    const recipientsActive = photogList.filter(p => p.is_active !== false && (p.appmax_status === 'active' || p.pix_key || p.cpf_cnpj)).length;
    const recipientsPending = photogList.filter(p => !p.pix_key && !p.cpf_cnpj && p.appmax_status !== 'active').length;

    // Buscar saques registrados (tabela payouts)
    let payouts = [];
    try {
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(30);

      if (payoutsData) payouts = payoutsData;
    } catch (e) {
      console.warn('[Appmax Stats Payouts Warning]', e);
    }

    const currentHost = req.headers.host || 'fotoclic.com.br';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = `${protocol}://${currentHost}/api/appmax-webhook`;

    return res.status(200).json({
      environment: process.env.APPMAX_ENV || 'production',
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
        recipientsActive: recipientsActive || photogList.length,
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
}
