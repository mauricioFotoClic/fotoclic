import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceSync() {
  console.log('--- Iniciando Sincronização Manual de Payout ---');
  
  const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f';
  const email = 'mauricio@fvimagem.com';
  const name = 'Mauricio Val';
  const grossAmount = 101.52;
  const netAmount = 100.52;
  const pixKey = '21992580137';
  const pixKeyType = 'phone';
  
  try {
    // 1. Criar o registro de payout no Supabase
    console.log('Gravando registro de payout no Supabase...');
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        photographer_id: photographerId,
        amount: grossAmount,
        status: 'paid',
        request_date: new Date().toISOString(),
        scheduled_date: new Date().toISOString(),
        processed_date: new Date().toISOString(),
        external_id: `manual_sync_${Date.now()}`
      })
      .select()
      .single();

    if (payoutError) throw payoutError;
    console.log('Payout gravado com sucesso! ID:', payout.id);

    // 2. Vincular as vendas ao payout_id
    console.log('Vinculando vendas pendentes ao payout...');
    const { data: updatedSales, error: updateSalesError } = await supabase
      .from('sales')
      .update({ payout_id: payout.id })
      .eq('photographer_id', photographerId)
      .is('payout_id', null)
      .lte('available_at', new Date().toISOString())
      .select();

    if (updateSalesError) throw updateSalesError;
    console.log(`Sucesso! ${updatedSales ? updatedSales.length : 0} vendas vinculadas ao payout.`);

    // 3. Enviar o e-mail de confirmação ao fotógrafo via Resend
    if (process.env.RESEND_API_KEY) {
      console.log('Disparando e-mail de confirmação via Resend...');
      const grossAmountFormatted = grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const netAmountFormatted = netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const pixKeyTypeTranslated = pixKeyType.toUpperCase() === 'PHONE' ? 'Celular' : 'Chave Pix';
      const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">💰 Pagamento Confirmado!</h1>
            </div>
            <div style="padding: 32px 24px; background-color: white;">
                <p style="font-size: 16px;">Olá, <strong>${name}</strong>!</p>
                <p style="font-size: 16px; color: #475569;">O seu saldo acumulado no FotoClic foi enviado com sucesso via Pix para a sua conta bancária.</p>
                
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
                            <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #e11d48;">- R$ 1,00</td>
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
                            <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b; font-family: monospace;">${pixKey}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Tipo de Chave:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${pixKeyTypeTranslated}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin: 40px 0;">
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
          to: email,
          subject: `💰 Seu pagamento de ${netAmountFormatted} foi enviado!`,
          html: emailHtml
        })
      });

      const resendData = await resendResponse.json();
      if (resendResponse.ok) {
        console.log(`E-mail de payout enviado com sucesso: ${resendData.id}`);
      } else {
        console.error('Erro ao enviar e-mail via Resend:', resendData);
      }
    }

    console.log('--- Sincronização Concluída com Sucesso! ---');

  } catch (err) {
    console.error('Erro ao executar sincronização:', err);
  }
}

forceSync();
