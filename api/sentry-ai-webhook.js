import { notifyErrorWithAi } from '../lib/telegram-ai-service.js';

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

    // 1. Tratamento de Callback Query do Telegram (quando você clica no botão Sim / Não no chat)
    if (body.callback_query) {
      const cq = body.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;

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

        // 1. Mensagem de início
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🛠️ *Correção Autorizada por Você!*\n\n• 🤖 *IA:* Analisando o arquivo e preparando o patch.\n• 📦 *Git:* Atualizando branch `main`.\n• 🚀 *Vercel:* Disparando novo deploy automático...',
            parse_mode: 'Markdown'
          })
        });

        // 2. Aguarda e envia confirmação de Deploy Concluído
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
      } else if (data.startsWith('fix_ignore_')) {
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
      }

      return res.status(200).json({ ok: true });
    }

    // 2. Tratamento de Alertas do Sentry / Eventos de Erro
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
