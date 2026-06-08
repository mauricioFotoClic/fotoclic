import { createClient } from '@supabase/supabase-js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  // 1. Security Check: Authenticate Admin via Supabase token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado: Token ausente.' });
  }

  const token = authHeader.split(' ')[1];
  let adminUserId = null;

  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Não autorizado: Token inválido.' });
    }
    adminUserId = authUser.id;

    // Verify role in the public.users table
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (dbUserError || !dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Proibido: Apenas administradores podem realizar saques manuais.' });
    }
  } catch (secError) {
    console.error('[PayoutTransfer] Erro na verificação de segurança:', secError);
    return res.status(401).json({ error: 'Falha na autenticação do administrador.' });
  }

  // 2. Body parameters check
  const { photographerId } = req.body;
  if (!photographerId) {
    return res.status(400).json({ error: 'ID do fotógrafo é obrigatório.' });
  }

  try {
    console.log(`[PayoutTransfer] Iniciando saque manual para o fotógrafo: ${photographerId}`);

    // 3. Fetch photographer wallet summary to get available balance
    const { data: wallet, error: walletError } = await supabase
      .from('photographer_wallet_summary')
      .select('*')
      .eq('photographer_id', photographerId)
      .single();

    if (walletError || !wallet) {
      console.error('[PayoutTransfer] Erro ao buscar saldo do fotógrafo:', walletError);
      return res.status(404).json({ error: 'Fotógrafo ou saldo não encontrado.' });
    }

    const balanceAvailable = wallet.balance_available;
    if (!balanceAvailable || balanceAvailable <= 0) {
      return res.status(400).json({ error: 'Este fotógrafo não possui saldo disponível para saque.' });
    }

    // 4. Fetch photographer details (Pix details and status)
    const { data: photographer, error: photographerError } = await supabase
      .from('users')
      .select('id, name, email, pix_key, pix_key_type, payout_blocked')
      .eq('id', photographerId)
      .single();

    if (photographerError || !photographer) {
      console.error('[PayoutTransfer] Erro ao buscar dados cadastrais do fotógrafo:', photographerError);
      return res.status(404).json({ error: 'Dados cadastrais do fotógrafo não encontrados.' });
    }

    if (photographer.payout_blocked) {
      return res.status(400).json({ error: 'Os saques deste fotógrafo estão bloqueados.' });
    }

    if (!photographer.pix_key) {
      return res.status(400).json({ error: 'O fotógrafo não possui uma chave Pix configurada.' });
    }

    // 5. Calculate payout fee and net amount
    const PAYOUT_FEE = 0.80; // Taxa de saque
    const grossAmount = balanceAvailable;
    const netAmount = Math.max(0, grossAmount - PAYOUT_FEE);

    if (netAmount <= 0) {
      return res.status(400).json({ error: 'O saldo disponível é insuficiente para cobrir a taxa de transferência (R$ 0,80).' });
    }

    // 6. Format and clean Pix Key and Key Type
    let cleanPixKey = photographer.pix_key.trim();
    const upperKeyType = (photographer.pix_key_type || '').toUpperCase();
    
    // Remove formatting from phone numbers, CPFs, or CNPJs
    if (upperKeyType === 'PHONE' || upperKeyType === 'CPF' || upperKeyType === 'CNPJ') {
      cleanPixKey = cleanPixKey.replace(/\D/g, '');
    }

    console.log(`[PayoutTransfer] Enviando Pix via AbacatePay: Bruto R$ ${grossAmount}, Líquido R$ ${netAmount}, Destinatário ${photographer.email}`);

    // 7. Call AbacatePay API to send Pix
    const abacateResponse = await fetch('https://api.abacatepay.com/v2/pix/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(netAmount * 100), // Valor líquido em centavos
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
      console.error('[PayoutTransfer] Resposta de erro do AbacatePay:', abacateData);
      return res.status(500).json({ 
        error: 'Erro no gateway de pagamento ao realizar a transferência.', 
        details: abacateData.error || abacateData.message || abacateData 
      });
    }

    const abacateTx = abacateData.data;
    const abacateStatus = (abacateTx.status || '').toUpperCase();
    const isPaid = abacateStatus === 'COMPLETE';

    // 8. Record Payout in Database
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
      console.error('[PayoutTransfer] Erro ao gravar registro de payout no Supabase:', payoutError);
      throw payoutError;
    }

    // 9. Link associated sales to this payout
    const { error: updateSalesError } = await supabase
      .from('sales')
      .update({ payout_id: payout.id })
      .eq('photographer_id', photographerId)
      .is('payout_id', null)
      .lte('available_at', new Date().toISOString());

    if (updateSalesError) {
      console.error('[PayoutTransfer] Erro ao vincular vendas ao saque no Supabase:', updateSalesError);
      // Log critical but do not fail the transaction since Pix was already sent.
    }

    // 10. Send Payout Email Notification to Photographer (Non-blocking)
    if (process.env.RESEND_API_KEY) {
      try {
        console.log(`[PayoutTransfer] Enviando e-mail de saque manual para ${photographer.email}...`);
        const photographerName = photographer.name || 'Fotógrafo';
        const grossAmountFormatted = grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const netAmountFormatted = netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const payoutFeeFormatted = PAYOUT_FEE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const pixKeyTypeTranslated = upperKeyType === 'PHONE' ? 'Celular' : upperKeyType === 'CPF' ? 'CPF' : upperKeyType === 'CNPJ' ? 'CNPJ' : upperKeyType === 'EMAIL' ? 'E-mail' : 'Chave Aleatória';
        const receiptUrl = abacateTx.receiptUrl || '';
        const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';

        const emailHtml = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">💰 Saque Processado com Sucesso!</h1>
              </div>
              <div style="padding: 32px 24px; background-color: white;">
                  <p style="font-size: 16px;">Olá, <strong>${photographerName}</strong>!</p>
                  <p style="font-size: 16px; color: #475569;">O seu saque de saldo acumulado foi autorizado manualmente pelo administrador e enviado para a sua conta Pix.</p>
                  
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

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'FotoClic <nao-responda@fotoclic.com.br>',
            to: photographer.email,
            subject: `💰 Seu saque de ${netAmountFormatted} foi processado!`,
            html: emailHtml
          })
        });

        const resendData = await resendResponse.json();
        if (resendResponse.ok) {
          console.log(`[PayoutTransfer] E-mail de confirmação enviado para o fotógrafo: ${resendData.id}`);
        } else {
          console.error('[PayoutTransfer] Erro de resposta do Resend ao enviar e-mail:', resendData);
        }
      } catch (emailErr) {
        console.error('[PayoutTransfer] Erro ao processar envio de e-mail via Resend:', emailErr);
      }
    }

    return res.status(200).json({ 
      success: true, 
      payoutId: payout.id, 
      amount: grossAmount, 
      txId: abacateTx.id,
      status: abacateStatus 
    });

  } catch (error) {
    console.error('[PayoutTransfer] Erro ao realizar transferência de saque manual:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a transferência de saque.', details: error.message });
  }
}
