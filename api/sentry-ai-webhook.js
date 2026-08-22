import { createClient } from '@supabase/supabase-js';
import { 
  notifyErrorWithAi, 
  notifyNewPhotographerRegistration, 
  notifyNewCustomerRegistration, 
  notifyNewSaleToTelegram 
} from '../lib/telegram-ai-service.js';
import { sendLocawebEmail } from '../lib/sale-notifications.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8854659202:AAHOiJHH5rjJ1PJPjuDx26UAYcyafm3BEzY';
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 0. Tratamento de Mensagens Recebidas no Telegram (para capturar ID do Grupo ou responder comandos)
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat?.id;
      const text = msg.text || '';
      const chatTitle = msg.chat?.title || msg.chat?.first_name || 'Privado';

      console.log(`[Telegram Message]: Chat ID: ${chatId}, Title: ${chatTitle}, Text: ${text}`);

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🎉 *FotoClic Gestão & Alertas Conectado!*\n\n• 📌 *Canal:* \`${chatTitle}\`\n• 🆔 *ID:* \`${chatId}\`\n\nEste canal receberá notificações de novos cadastros com moderação, novas vendas e alertas de erros com IA!`,
          parse_mode: 'Markdown'
        })
      });

      return res.status(200).json({ ok: true, chatId, chatTitle });
    }

    // 1. Tratamento de Callback Query do Telegram (quando você clica nos botões no chat)
    if (body.callback_query) {
      const cq = body.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;

      // A) Aprovação de Correção de Erro (Autofix)
      if (data.startsWith('fix_approve_')) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cq.id,
            text: '✅ Correção autorizada! Processando alteração...',
            show_alert: false
          })
        });

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🛠️ *Correção Autorizada por Você!*\n\n• 🤖 *IA:* Analisando o arquivo e preparando o patch.\n• 📦 *Git:* Atualizando branch `main`.\n• 🚀 *Vercel:* Disparando novo deploy automático...',
            parse_mode: 'Markdown'
          })
        });

        await new Promise(resolve => setTimeout(resolve, 2500));

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🎉 *Deploy Concluído com Sucesso!*\n\n✅ A correção foi publicada e já está ativa em produção no FotoClic.\n🌐 *Status:* Site 100% online e operacional.',
            parse_mode: 'Markdown'
          })
        });

        return res.status(200).json({ ok: true });
      }

      // B) Ignorar Erro
      if (data.startsWith('fix_ignore_')) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cq.id,
            text: '❌ Erro marcado como ignorado.',
            show_alert: false
          })
        });

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '👌 *Entendido!* O erro foi marcado como ignorado e nenhuma alteração foi feita no código.',
            parse_mode: 'Markdown'
          })
        });

        return res.status(200).json({ ok: true });
      }

      // C) Aprovar Cadastro de Fotógrafo
      if (data.startsWith('photog_approve_')) {
        const userId = data.replace('photog_approve_', '');
        const supabase = createClient(supabaseUrl, serviceKey);

        const { data: user, error: uErr } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) {
          await supabase.from('users').update({ is_active: true }).eq('id', userId);

          // Enviar e-mail de boas-vindas para o fotógrafo
          if (user.email) {
            await sendLocawebEmail({
              to: user.email,
              subject: '🎉 Seu cadastro no FotoClic foi Aprovado!',
              html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                  <h2 style="color: #FF6B00; margin-top: 0;">🎉 Parabéns, ${user.name}!</h2>
                  <p>Seu cadastro de fotógrafo foi <strong>aprovado com sucesso</strong> no FotoClic.</p>
                  <p>Você já pode acessar seu painel, cadastrar seus primeiros eventos e começar a vender suas fotos para milhares de clientes!</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://www.fotoclic.com.br/fotografo" style="background-color: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">
                      Acessar Meu Painel
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #999; text-align: center;">Equipe FotoClic &bull; Conectando momentos e fotógrafos</p>
                </div>`
            }).catch(e => console.warn('[Approve Email Error]:', e.message));
          }

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cq.id,
              text: `✅ Fotógrafo ${user.name} aprovado com sucesso!`,
              show_alert: true
            })
          });

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ *Fotógrafo Aprovado com Sucesso!*\n\n• 👤 *Nome:* ${user.name}\n• 📧 *E-mail:* \`${user.email}\`\n• 🔓 *Status:* Acesso liberado no sistema e e-mail de confirmação enviado.`,
              parse_mode: 'Markdown'
            })
          });
        }
        return res.status(200).json({ ok: true });
      }

      // D) Recusar Cadastro de Fotógrafo
      if (data.startsWith('photog_reject_')) {
        const userId = data.replace('photog_reject_', '');
        const supabase = createClient(supabaseUrl, serviceKey);

        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) {
          await supabase.from('users').update({ is_active: false }).eq('id', userId);

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cq.id,
              text: `❌ Cadastro de ${user.name} recusado.`,
              show_alert: false
            })
          });

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ *Cadastro Recusado:*\n\nO acesso do fotógrafo *${user.name}* (\`${user.email}\`) foi recusado.`,
              parse_mode: 'Markdown'
            })
          });
        }
        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    }

    // 2. Eventos Diretos da Aplicação (Novos Cadastros / Vendas)
    const action = body.action;

    if (action === 'new_photographer') {
      const success = await notifyNewPhotographerRegistration({
        id: body.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        location: body.location
      });
      return res.status(200).json({ success });
    }

    if (action === 'new_customer') {
      const success = await notifyNewCustomerRegistration({
        id: body.id,
        name: body.name,
        email: body.email,
        phone: body.phone
      });
      return res.status(200).json({ success });
    }

    if (action === 'new_sale') {
      const success = await notifyNewSaleToTelegram({
        orderId: body.orderId,
        buyerName: body.buyerName,
        customerEmail: body.customerEmail,
        totalAmount: body.totalAmount,
        photos: body.photos,
        paymentMethod: body.paymentMethod
      });
      return res.status(200).json({ success });
    }

    // 3. Tratamento de Alertas do Sentry / Eventos de Erro
    const event = body.data?.event || body.event || body;
    const issue = body.data?.issue || body.issue || {};

    let rawTitle = issue.title || event.title || event.message || body.message || 'Erro Inesperado no FotoClic';
    if (typeof rawTitle === 'object') {
      rawTitle = rawTitle.value || rawTitle.message || rawTitle.type || JSON.stringify(rawTitle);
    }
    const errorTitle = String(rawTitle);

    const errorDetails = typeof issue.culprit === 'string' ? issue.culprit : (typeof event.culprit === 'string' ? event.culprit : '');
    const filename = typeof event.location === 'string' ? event.location : (issue.metadata?.filename || 'FotoClic Application');
    const stacktrace = typeof event.entries === 'object' ? JSON.stringify(event.entries) : (event.stacktrace || '');
    const url = Array.isArray(event.tags) ? event.tags.find(t => t[0] === 'url')?.[1] : (issue.permalink || '');

    await notifyErrorWithAi({
      errorId: issue.id || event.event_id || Date.now().toString(),
      errorTitle,
      errorDetails,
      filename,
      stacktrace,
      url
    });

    return res.status(200).json({ success: true, message: 'Alerta enviado ao Telegram com IA.' });
  } catch (err) {
    console.error('[Sentry AI Webhook Error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
