// Serviço de IA e Notificações Interativas do Telegram para o FotoClic
import { GoogleGenerativeAI } from '@google/generative-ai';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8854659202:AAHOiJHH5rjJ1PJPjuDx26UAYcyafm3BEzY';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 5525056555;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || null;

/**
 * Envia uma mensagem para o Telegram com botões interativos
 */
export async function sendTelegramMessage({ text, buttons = [], targetChatId = null }) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram AI] Token não configurado.');
    return false;
  }

  const recipients = targetChatId ? [targetChatId] : Array.from(new Set([TELEGRAM_GROUP_ID, TELEGRAM_CHAT_ID].filter(Boolean)));

  let atLeastOneSuccess = false;

  for (const cid of recipients) {
    const payload = {
      chat_id: cid,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined
    };

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.ok) atLeastOneSuccess = true;
    } catch (err) {
      console.error(`[Telegram AI] Erro ao enviar mensagem para ${cid}:`, err.message);
    }
  }

  return atLeastOneSuccess;
}

/**
 * Analisa um erro com a IA do Gemini e gera diagnóstico com sugestão de correção
 */
export async function analyzeErrorWithGemini({ errorTitle, errorDetails, filename, stacktrace }) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return {
      cause: 'Erro de execução no código do frontend/backend.',
      fix: 'Validar parâmetros e tratar exceções com fallback seguro.'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `
Você é um Engenheiro de Software Sênior especialista em React, TypeScript, Supabase e Node.js no FotoClic.
Um erro aconteceu em produção. Analise os detalhes abaixo e retorne um diagnóstico conciso em português do Brasil:

Título do Erro: ${errorTitle || 'Desconhecido'}
Detalhes: ${errorDetails || ''}
Arquivo: ${filename || 'Desconhecido'}
Stacktrace: ${stacktrace || ''}

Responda ESTRITAMENTE em 2 linhas curtas:
1. CAUSA: (explicação em 1 frase direta do porquê falhou)
2. CORRECAO: (sugestão em 1 frase direta do que alterar no código)
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text() || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const causeLine = lines.find(l => l.toUpperCase().includes('CAUSA:'))?.replace(/.*CAUSA:\s*/i, '') || lines[0] || 'Falha de execução em runtime.';
    const fixLine = lines.find(l => l.toUpperCase().includes('CORRECAO:'))?.replace(/.*CORRECAO:\s*/i, '') || lines[1] || 'Tratar valores nulos e validar dados de entrada.';

    return { cause: causeLine, fix: fixLine };
  } catch (err) {
    console.warn('[Gemini AI Analysis Error]:', err.message);
    return {
      cause: errorDetails || 'Exceção não tratada na execução.',
      fix: 'Revisar fluxo de dados e adicionar proteção de nulo.'
    };
  }
}

/**
 * Dispara o alerta completo com diagnóstico da IA e botões Sim / Não
 */
export async function notifyErrorWithAi({
  errorId = Date.now().toString(),
  errorTitle,
  errorDetails,
  filename,
  stacktrace,
  url
}) {
  const aiDiagnosis = await analyzeErrorWithGemini({ errorTitle, errorDetails, filename, stacktrace });

  const message = `🚨 *Erro Detectado no FotoClic!*

📌 *Problema:* \`${errorTitle || 'Exceção Inesperada'}\`
📁 *Local:* \`${filename || 'Aplicação Web'}\`
${url ? `🔗 *URL:* ${url}\n` : ''}
🤖 *Diagnóstico da IA:*
• *Causa:* ${aiDiagnosis.cause}
• *Correção Sugerida:* ${aiDiagnosis.fix}

_Deseja autorizar a correção automática deste erro no repositório?_`;

  const buttons = [
    [
      { text: '✅ Sim, Corrigir e Publicar', callback_data: `fix_approve_${errorId}` },
      { text: '❌ Não, Ignorar', callback_data: `fix_ignore_${errorId}` }
    ],
    [
      { text: '🔍 Ver no Sentry', url: 'https://fotoclic.sentry.io/issues/' },
      { text: '🌐 Abrir FotoClic', url: 'https://www.fotoclic.com.br' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons });
}

/**
 * Dispara notificação de NOVO FOTÓGRAFO para moderação
 */
export async function notifyNewPhotographerRegistration({ id, name, email, phone, location }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const message = `📸 *Novo Fotógrafo Solicitando Cadastro!*

• *Nome:* ${name}
• *E-mail:* ${email}
• *Telefone:* ${phone || 'Não informado'}
${location ? `• *Local:* ${location}\n` : ''}• *Data/Hora:* ${now}

_Deseja aprovar o acesso deste fotógrafo na plataforma?_`;

  const buttons = [
    [
      { text: '✅ Aprovar e Liberar', callback_data: `photog_approve_${id}` },
      { text: '❌ Recusar', callback_data: `photog_reject_${id}` }
    ],
    [
      { text: '👤 Ver no Painel Admin', url: 'https://www.fotoclic.com.br/admin' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons });
}

/**
 * Dispara notificação de NOVO CLIENTE COMPRADOR
 */
export async function notifyNewCustomerRegistration({ id, name, email, phone }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const message = `👤 *Novo Cliente Cadastrado no FotoClic!*

• *Nome:* ${name}
• *E-mail:* ${email}
• *Telefone:* ${phone || 'Não informado'}
• *Data/Hora:* ${now}`;

  const buttons = [
    [
      { text: '🌐 Abrir FotoClic', url: 'https://www.fotoclic.com.br' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons });
}

/**
 * Dispara notificação de NOVA VENDA CONFIRMADA
 */
export async function notifyNewSaleToTelegram({ orderId, buyerName, customerEmail, totalAmount, photos = [], paymentMethod = 'PIX' }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const totalFormatted = Number(totalAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const photoList = photos.map(p => `• ${p.title || 'Foto'} (R$ ${(Number(p.price) || 0).toFixed(2).replace('.', ',')})`).join('\n');

  const message = `💰 *Nova Venda Confirmada no FotoClic! (${paymentMethod})*

• *Pedido:* #${orderId}
• *Comprador:* ${buyerName || 'Cliente'} (\`${customerEmail || 'Sem e-mail'}\`)
• *Valor Total:* *${totalFormatted}*
• *Fotos Vendidas (${photos.length}):*
${photoList}
• *Data/Hora:* ${now}`;

  const buttons = [
    [
      { text: '📊 Acessar Painel Admin', url: 'https://www.fotoclic.com.br/admin' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons });
}
