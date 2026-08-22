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
            text: '✅ Correção autorizada! A IA está processando o patch no repositório.',
            show_alert: true
          })
        });

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🚀 *Autorização Confirmada!*\n\nA IA do FotoClic iniciou o processo de correção. Você pode acompanhar o status ou aprovar o Pull Request diretamente no GitHub/Sentry.',
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
      }

      return res.status(200).json({ ok: true });
    }

    // 2. Tratamento de Alertas do Sentry / Eventos de Erro
    const event = body.data?.event || body.event || body;
    const issue = body.data?.issue || body.issue || {};

    const errorTitle = issue.title || event.title || event.message || body.message || 'Erro Inesperado no FotoClic';
    const errorDetails = issue.culprit || event.culprit || '';
    const filename = event.location || issue.metadata?.filename || 'FotoClic Application';
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
