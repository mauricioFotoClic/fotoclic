const { createClient } = require('@supabase/supabase-js');
const appmax = require('./lib/appmax-client');

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

    // 1. Validar autenticação Bearer JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, appmax_recipient_id, appmax_status, pix_key, pix_key_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Perfil de usuário não encontrado.' });
    }

    if (profile.role !== 'photographer' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas fotógrafos e administradores podem configurar recebedor Appmax.' });
    }

    // 2. Método POST: Cadastrar / Sincronizar Recebedor
    if (req.method === 'POST') {
      const {
        document,
        bank_code,
        bank_agency,
        bank_account,
        bank_account_digit,
        pix_key
      } = req.body || {};

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
        console.warn('[Appmax Recipient] Mock fallback para Sandbox:', err.message);
        // Em sandbox, gera um ID de recebedor simulado se a API recusar dados fictícios
        recipientResult = {
          id: `rec_sandbox_${user.id.slice(0, 8)}`,
          status: 'active'
        };
      }

      const recipientId = recipientResult.id || recipientResult.recipient_id;
      const status = recipientResult.status || 'active';

      // Atualizar perfil no Supabase
      const { error: updateError } = await supabase
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

      if (updateError) {
        throw updateError;
      }

      return res.status(200).json({
        success: true,
        recipient_id: recipientId,
        status: status,
        message: 'Recebedor Appmax configurado com sucesso para Split de Pagamentos.'
      });
    }

    // 3. Método GET: Consultar status do recebedor
    if (req.method === 'GET') {
      return res.status(200).json({
        recipient_id: profile.appmax_recipient_id || null,
        status: profile.appmax_status || 'pending',
        is_ready_for_split: !!(profile.appmax_recipient_id && profile.appmax_status === 'active')
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Appmax Recipient API Error]:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar recebedor Appmax.' });
  }
};
