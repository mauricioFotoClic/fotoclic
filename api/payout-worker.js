import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key (Required for writing payouts and reading all users)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ABACATE_PAY_API_KEY = process.env.ABACATEPAY_API_KEY;

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://www.fotoclic.com.br',
    'https://fotoclic.com.br',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.fotoclic.com.br');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado: Token ausente.' });
  }

  const token = authHeader.split(' ')[1];

  // Identifica se é o Cron Job automático ou um Saque Manual do Admin
  const isCronJob = token === process.env.CRON_SECRET;

  if (!isCronJob) {
    // --- FLUXO DE SAQUE MANUAL DO ADMIN ---
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido para saques manuais.' });
    }

    let adminUserId = null;
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return res.status(401).json({ error: 'Não autorizado: Token inválido.' });
      }
      adminUserId = authUser.id;

      // Verifica role na tabela public.users
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (dbUserError || !dbUser || dbUser.role !== 'admin') {
        return res.status(403).json({ error: 'Proibido: Apenas administradores podem realizar saques manuais.' });
      }
    } catch (secError) {
      console.error('[PayoutWorker - Manual] Erro na verificação de segurança:', secError);
      return res.status(401).json({ error: 'Falha na autenticação do administrador.' });
    }

    const { photographerId, isManualBypass } = req.body;
    if (!photographerId) {
      return res.status(400).json({ error: 'ID do fotógrafo é obrigatório.' });
    }

    try {
      console.log(`[PayoutWorker - Manual] Iniciando saque manual para o fotógrafo: ${photographerId}`);

      // Buscar saldo do fotógrafo
      const { data: wallet, error: walletError } = await supabase
        .from('photographer_wallet_summary')
        .select('*')
        .eq('photographer_id', photographerId)
        .single();

      if (walletError || !wallet) {
        console.error('[PayoutWorker - Manual] Erro ao buscar saldo do fotógrafo:', walletError);
        return res.status(404).json({ error: 'Fotógrafo ou saldo não encontrado.' });
      }

      const balanceAvailable = wallet.balance_available;
      if (!balanceAvailable || balanceAvailable <= 0) {
        return res.status(400).json({ error: 'Este fotógrafo não possui saldo disponível para saque.' });
      }

      // Buscar detalhes do fotógrafo
      const { data: photographer, error: photographerError } = await supabase
        .from('users')
        .select('id, name, email, pix_key, pix_key_type, payout_blocked')
        .eq('id', photographerId)
        .single();

      if (photographerError || !photographer) {
        console.error('[PayoutWorker - Manual] Erro ao buscar dados do fotógrafo:', photographerError);
        return res.status(404).json({ error: 'Dados cadastrais do fotógrafo não encontrados.' });
      }

      if (photographer.payout_blocked) {
        return res.status(400).json({ error: 'Os saques deste fotógrafo estão bloqueados.' });
      }

      if (!photographer.pix_key) {
        return res.status(400).json({ error: 'O fotógrafo não possui uma chave Pix configurada.' });
      }

      const PAYOUT_FEE = 0.80; // Taxa de saque
      const grossAmount = balanceAvailable;
      const netAmount = Math.max(0, grossAmount - PAYOUT_FEE);

      if (netAmount <= 0) {
        return res.status(400).json({ error: 'O saldo disponível é insuficiente para cobrir a taxa de transferência (R$ 0,80).' });
      }

      let cleanPixKey = photographer.pix_key.trim();
      const upperKeyType = (photographer.pix_key_type || '').toUpperCase();
      
      if (upperKeyType === 'PHONE' || upperKeyType === 'CPF' || upperKeyType === 'CNPJ') {
        cleanPixKey = cleanPixKey.replace(/\D/g, '');
      }

      let abacateTx = null;
      let abacateStatus = 'COMPLETE';
      let isPaid = true;

      if (!isManualBypass) {
        console.log(`[PayoutWorker - Manual] Enviando Pix via AbacatePay: Bruto R$ ${grossAmount}, Líquido R$ ${netAmount}`);

        const abacateResponse = await fetch('https://api.abacatepay.com/v2/pix/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(netAmount * 100),
            externalId: `payout_manual_${photographerId}_${Date.now()}`,
            description: `FotoClic - Saque Manual Liberado por Admin`,
            pix: {
              key: cleanPixKey,
              type: upperKeyType
            }
          })
        });

        const abacateData = await abacateResponse.json();

        if (!abacateResponse.ok || !abacateData.success || !abacateData.data) {
          console.error('[PayoutWorker - Manual] Erro do AbacatePay:', abacateData);
          return res.status(500).json({ 
            error: 'Erro no gateway de pagamento ao realizar a transferência.', 
            details: abacateData.error || abacateData.message || abacateData 
          });
        }

        abacateTx = abacateData.data;
        abacateStatus = (abacateTx.status || '').toUpperCase();
        isPaid = abacateStatus === 'COMPLETE';
      } else {
        console.log(`[PayoutWorker - Manual] Bypass manual ativado. Pulando chamada do AbacatePay.`);
        abacateTx = {
          id: `manual_bypass_${photographerId}_${Date.now()}`,
          receiptUrl: ''
        };
      }

      // Gravar registro de Payout
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          photographer_id: photographerId,
          amount: grossAmount,
          status: isPaid ? 'paid' : 'pending',
          request_date: new Date().toISOString(),
          scheduled_date: new Date().toISOString(),
          processed_date: isPaid ? new Date().toISOString() : null,
          external_id: abacateTx.id
        })
        .select()
        .single();

      if (payoutError) {
        console.error('[PayoutWorker - Manual] Erro ao gravar payout no Supabase:', payoutError);
        throw payoutError;
      }

      // Vincular vendas ao saque
      const { error: updateSalesError } = await supabase
        .from('sales')
        .update({ payout_id: payout.id })
        .eq('photographer_id', photographerId)
        .is('payout_id', null)
        .lte('available_at', new Date().toISOString());

      if (updateSalesError) {
        console.error('[PayoutWorker - Manual] Erro ao vincular vendas ao saque:', updateSalesError);
      }

      // Enviar e-mail de confirmação via Locaweb SMTP (não-bloqueante)
      if (process.env.LOCAWEB_SMTP_TOKEN) {
        try {
          console.log(`[PayoutWorker - Manual] Enviando e-mail de confirmação para ${photographer.email}...`);

          // Buscar templates do banco de dados system_settings
          const { data: settingsRow } = await supabase.from('system_settings').select('email_templates').eq('id', 1).single();
          const templates = settingsRow?.email_templates || {};
          const template = templates.payoutProcessed || {
            subject: 'Seu pagamento está sendo processado',
            body: 'Olá {{nome_fotografo}},\n\nInformamos que estamos processando seu pagamento no valor de {{valor_pagamento}}.\n\nData do pagamento: {{data_pagamento}}.'
          };

          const photographerName = photographer.name || 'Fotógrafo';
          const grossAmountFormatted = grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const netAmountFormatted = netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const payoutFeeFormatted = PAYOUT_FEE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const pixKeyTypeTranslated = upperKeyType === 'PHONE' ? 'Celular' : upperKeyType === 'CPF' ? 'CPF' : upperKeyType === 'CNPJ' ? 'CNPJ' : upperKeyType === 'EMAIL' ? 'E-mail' : 'Chave Aleatória';
          const receiptUrl = abacateTx.receiptUrl || '';
          const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';

          // Substituir placeholders do template
          const replacements = {
            'nome_fotografo': photographerName,
            'valor_pagamento': netAmountFormatted,
            'data_pagamento': new Date().toLocaleDateString('pt-BR')
          };

          let subject = template.subject || `💰 Seu saque de ${netAmountFormatted} foi processado!`;
          let bodyHtml = template.body || '';
          Object.entries(replacements).forEach(([key, val]) => {
            subject = subject.split(`{{${key}}}`).join(val);
            bodyHtml = bodyHtml.split(`{{${key}}}`).join(val);
          });

          const emailHtml = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">💰 Saque Processado com Sucesso!</h1>
                </div>
                <div style="padding: 32px 24px; background-color: white;">
                    <div style="font-size: 16px; line-height: 1.6; color: #475569; white-space: pre-wrap; margin-bottom: 24px;">${bodyHtml}</div>
                    
                    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
                        <p style="margin: 0; color: #065f46; font-size: 14px;">Valor Líquido Recebido</p>
                        <p style="margin: 4px 0 0 0; color: #047857; font-size: 28px; font-weight: bold;">${netAmountFormatted}</p>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 15px;">Detalhes da Transação:</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Valor Bruto Acumulado:</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${grossAmountFormatted}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Taxa de Pix:</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #e11d48;">- ${payoutFeeFormatted}</td>
                            </tr>
                            <tr style="border-top: 1px solid #e2e8f0;">
                                <td style="padding: 10px 0 6px 0; color: #1e293b; font-weight: bold;">Valor Líquido Creditado:</td>
                                <td style="padding: 10px 0 6px 0; text-align: right; font-weight: bold; color: #047857;">${netAmountFormatted}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 15px;">Dados do Destinatário:</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Chave Pix:</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b; font-family: monospace;">${cleanPixKey}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Tipo de Chave:</td>
                                <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${pixKeyTypeTranslated}</td>
                            </tr>
                        </table>
                    </div>

                    ${receiptUrl ? `
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${receiptUrl}" target="_blank" style="background-color: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
                            Ver Comprovante Oficial do Pix
                        </a>
                    </div>
                    ` : ''}

                    <div style="text-align: center; margin: ${receiptUrl ? '20px' : '40px'} 0;">
                        <a href="${siteUrl}/photographer-dashboard" style="color: #059669; text-decoration: underline; font-weight: bold; font-size: 14px;">
                            Acessar minha Central Financeira
                        </a>
                    </div>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                    © ${new Date().getFullYear()} FotoClic. Todos os direitos reservados.
                </div>
            </div>`;

          const locawebRes = await fetch('https://api.smtplw.com.br/v1/messages', {
            method: 'POST',
            headers: {
              'x-auth-token': process.env.LOCAWEB_SMTP_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'nao-responda@email.fotoclic.com.br',
              to: [photographer.email],
              subject: subject,
              body: emailHtml
            })
          });

          const locawebData = locawebRes.headers.get('content-type')?.includes('application/json')
            ? await locawebRes.json()
            : { message: await locawebRes.text() };

          if (locawebRes.ok) {
            console.log('[PayoutWorker - Manual] E-mail de payout enviado com sucesso:', locawebData.id || locawebData);
          } else {
            console.error('[PayoutWorker - Manual] Erro ao enviar e-mail via Locaweb:', locawebData);
          }
        } catch (emailErr) {
          console.error('[PayoutWorker - Manual] Erro ao enviar email de notificação:', emailErr);
        }
      }

      return res.status(200).json({ 
        success: true, 
        payoutId: payout.id, 
        amount: grossAmount, 
        txId: abacateTx.id,
        status: abacateStatus 
      });

    } catch (manualError) {
      console.error('[PayoutWorker - Manual] Erro ao executar saque manual:', manualError);
      return res.status(500).json({ error: 'Erro interno ao processar o saque manual.', details: manualError.message });
    }
  }

  // --- FLUXO DO CRON JOB AUTOMÁTICO ---
  try {
    console.log('--- Inciando Processamento de Payouts ---');

    // 2. Fetch photographers eligible for payout
    // Rules: 
    // - balance_available >= 100
    // - pix_key is present
    // - payout_blocked is false
    // - frequency matches today (simplified for this example, usually handled by checking last payout date)
    const { data: eligibleBalances, error: balanceError } = await supabase
      .from('photographer_wallet_summary')
      .select('*')
      .gte('balance_available', 100);

    if (balanceError) throw balanceError;

    if (!eligibleBalances || eligibleBalances.length === 0) {
      console.log('Nenhum fotógrafo com saldo >= 100.');
      return res.status(200).json({ processed: 0, details: [] });
    }

    const photographerIds = eligibleBalances.map(p => p.photographer_id);

    // Fetch user pix details
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, pix_key, pix_key_type, payout_frequency, payout_blocked, email')
      .in('id', photographerIds);

    if (usersError) throw usersError;

    const userMap = {};
    usersData.forEach(u => { userMap[u.id] = u; });

    const eligiblePhotographers = eligibleBalances.map(p => ({
      ...p,
      users: userMap[p.photographer_id] || null
    }));

    const results = [];

    const PAYOUT_FEE = 0.80; // Taxa de saque cobrada do fotógrafo (R$ 0,80)

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    const dayOfMonth = now.getDate();

    // Buscar templates do banco de dados uma única vez
    let emailTemplates = {};
    try {
      const { data: settingsRow } = await supabase.from('system_settings').select('email_templates').eq('id', 1).single();
      emailTemplates = settingsRow?.email_templates || {};
    } catch (dbErr) {
      console.warn('[PayoutWorker - Cron] Falha ao buscar templates de e-mail do banco:', dbErr);
    }

    for (const photographer of eligiblePhotographers) {
      const user = photographer.users;
      
      // Frequency Check
      const frequency = (user.payout_frequency || 'diario').toLowerCase();
      let shouldProcessToday = false;

      if (frequency === 'diario') {
        shouldProcessToday = true;
      } else if (frequency === 'semanal' && dayOfWeek === 1) { // Monday
        shouldProcessToday = true;
      } else if (frequency === 'mensal' && dayOfMonth === 1) { // 1st of the month
        shouldProcessToday = true;
      }

      // Special case: if photographer has a massive balance, maybe we should override? 
      // For now, respect the frequency strictly as requested.
      
      if (!shouldProcessToday) {
        console.log(`Pulando ${user.email}: Frequência ${frequency} não coincide com hoje.`);
        continue;
      }

      // Additional validations
      if (user.payout_blocked || !user.pix_key) continue;

      const grossAmount = photographer.balance_available;
      const netAmount   = Math.max(0, grossAmount - PAYOUT_FEE);
      
      console.log(`Processando saque para ${user.email}: Total R$ ${grossAmount}, Líquido R$ ${netAmount}`);

      try {
        // 3. Format and clean Pix Key and Key Type
        let cleanPixKey = user.pix_key.trim();
        const upperKeyType = (user.pix_key_type || '').toUpperCase();
        
        // Remove formatting from phone numbers, CPFs, or CNPJs
        if (upperKeyType === 'PHONE' || upperKeyType === 'CPF' || upperKeyType === 'CNPJ') {
          cleanPixKey = cleanPixKey.replace(/\D/g, '');
        }

        // 4. Call AbacatePay API to send Pix to third party
        const abacateResponse = await fetch('https://api.abacatepay.com/v2/pix/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(netAmount * 100), // Valor líquido em centavos
            externalId: `payout_${photographer.photographer_id}_${Date.now()}`,
            description: `FotoClic - Pagamento de Saldo Acumulado`,
            pix: {
              key: cleanPixKey,
              type: upperKeyType
            }
          })
        });

        const abacateData = await abacateResponse.json();

        if (!abacateResponse.ok || !abacateData.success || !abacateData.data) {
          throw new Error(`AbacatePay Error: ${JSON.stringify(abacateData)}`);
        }

        const abacateTx = abacateData.data;
        const abacateStatus = (abacateTx.status || '').toUpperCase();
        const isPaid = abacateStatus === 'COMPLETE';

        // 5. Record Payout in Database
        const { data: payout, error: payoutError } = await supabase
          .from('payouts')
          .insert({
            photographer_id: photographer.photographer_id,
            amount: photographer.balance_available,
            status: isPaid ? 'paid' : 'pending',
            request_date: new Date().toISOString(),
            scheduled_date: new Date().toISOString(),
            processed_date: isPaid ? new Date().toISOString() : null,
            external_id: abacateTx.id
          })
          .select()
          .single();

        if (payoutError) throw payoutError;

        // 6. Mark Sales as Processed (link to payout_id)
        const { error: updateSalesError } = await supabase
          .from('sales')
          .update({ payout_id: payout.id })
          .eq('photographer_id', photographer.photographer_id)
          .is('payout_id', null)
          .lte('available_at', new Date().toISOString());

        if (updateSalesError) throw updateSalesError;

        results.push({ email: user.email, status: 'success', amount: photographer.balance_available, txId: abacateTx.id });

        // 7. Send Payout Email Notification to Photographer (Non-blocking for core transaction)
        if (process.env.LOCAWEB_SMTP_TOKEN) {
          try {
            console.log(`Enviando e-mail de confirmação para ${user.email}...`);
            const photographerName = photographer.photographer_name || 'Fotógrafo';
            const grossAmountFormatted = grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const netAmountFormatted = netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const payoutFeeFormatted = PAYOUT_FEE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const pixKeyTypeTranslated = upperKeyType === 'PHONE' ? 'Celular' : upperKeyType === 'CPF' ? 'CPF' : upperKeyType === 'CNPJ' ? 'CNPJ' : upperKeyType === 'EMAIL' ? 'E-mail' : 'Chave Aleatória';
            const receiptUrl = abacateTx.receiptUrl || '';
            const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';

            const template = emailTemplates.payoutProcessed || {
              subject: 'Seu pagamento está sendo processado',
              body: 'Olá {{nome_fotografo}},\n\nInformamos que estamos processando seu pagamento no valor de {{valor_pagamento}}.\n\nData do pagamento: {{data_pagamento}}.'
            };

            const replacements = {
              'nome_fotografo': photographerName,
              'valor_pagamento': netAmountFormatted,
              'data_pagamento': new Date().toLocaleDateString('pt-BR')
            };

            let subject = template.subject || `💰 Seu pagamento de ${netAmountFormatted} foi enviado!`;
            let bodyHtml = template.body || '';
            Object.entries(replacements).forEach(([key, val]) => {
              subject = subject.split(`{{${key}}}`).join(val);
              bodyHtml = bodyHtml.split(`{{${key}}}`).join(val);
            });

            const emailHtml = `
              <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">💰 Pagamento Processado com Sucesso!</h1>
                  </div>
                  <div style="padding: 32px 24px; background-color: white;">
                      <div style="font-size: 16px; line-height: 1.6; color: #475569; white-space: pre-wrap; margin-bottom: 24px;">${bodyHtml}</div>
                      
                      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
                          <p style="margin: 0; color: #065f46; font-size: 14px;">Valor Líquido Recebido</p>
                          <p style="margin: 4px 0 0 0; color: #047857; font-size: 28px; font-weight: bold;">${netAmountFormatted}</p>
                      </div>

                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                          <h3 style="margin-top: 0; color: #1e293b; font-size: 15px;">Detalhes da Transação:</h3>
                          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                              <tr>
                                  <td style="padding: 6px 0; color: #64748b;">Valor Bruto Acumulado:</td>
                                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${grossAmountFormatted}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 6px 0; color: #64748b;">Taxa de Pix:</td>
                                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #e11d48;">- ${payoutFeeFormatted}</td>
                              </tr>
                              <tr style="border-top: 1px solid #e2e8f0;">
                                  <td style="padding: 10px 0 6px 0; color: #1e293b; font-weight: bold;">Valor Líquido Creditado:</td>
                                  <td style="padding: 10px 0 6px 0; text-align: right; font-weight: bold; color: #047857;">${netAmountFormatted}</td>
                              </tr>
                          </table>
                      </div>

                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                          <h3 style="margin-top: 0; color: #1e293b; font-size: 15px;">Dados do Destinatário:</h3>
                          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                              <tr>
                                  <td style="padding: 6px 0; color: #64748b;">Chave Pix:</td>
                                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b; font-family: monospace;">${cleanPixKey}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 6px 0; color: #64748b;">Tipo de Chave:</td>
                                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${pixKeyTypeTranslated}</td>
                              </tr>
                          </table>
                      </div>

                      ${receiptUrl ? `
                      <div style="text-align: center; margin: 32px 0;">
                          <a href="${receiptUrl}" target="_blank" style="background-color: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
                              Ver Comprovante Oficial do Pix
                          </a>
                      </div>
                      ` : ''}

                      <div style="text-align: center; margin: ${receiptUrl ? '20px' : '40px'} 0;">
                          <a href="${siteUrl}/photographer-dashboard" style="color: #059669; text-decoration: underline; font-weight: bold; font-size: 14px;">
                              Acessar minha Central Financeira
                        </a>
                      </div>
                  </div>
                  <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                      © ${new Date().getFullYear()} FotoClic. Todos os direitos reservados.
                  </div>
              </div>`;

            const locawebRes = await fetch('https://api.smtplw.com.br/v1/messages', {
              method: 'POST',
              headers: {
                'x-auth-token': process.env.LOCAWEB_SMTP_TOKEN,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'nao-responda@email.fotoclic.com.br',
                to: [user.email],
                subject: subject,
                body: emailHtml
              })
            });

            const locawebData = locawebRes.headers.get('content-type')?.includes('application/json')
              ? await locawebRes.json()
              : { message: await locawebRes.text() };

            if (locawebRes.ok) {
              console.log(`E-mail de payout enviado com sucesso: ${locawebData.id || locawebData}`);
            } else {
              console.error('Erro ao enviar e-mail via Locaweb:', locawebData);
            }
          } catch (emailErr) {
            console.error('Erro de rede ao enviar e-mail via Locaweb:', emailErr);
          }
        } else {
          console.warn('LOCAWEB_SMTP_TOKEN não configurada no ambiente. E-mail de confirmação pulado.');
        }

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
