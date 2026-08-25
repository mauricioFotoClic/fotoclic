// Serviço de IA e Notificações Interativas do Telegram para o FotoClic
import { GoogleGenerativeAI } from '@google/generative-ai';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8854659202:AAHOiJHH5rjJ1PJPjuDx26UAYcyafm3BEzY';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 5525056555;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-5372484924';

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

  return await sendTelegramMessage({ text: message, buttons, targetChatId: TELEGRAM_GROUP_ID });
}

/**
 * Dispara notificação de NOVO FOTÓGRAFO CADASTRADO EXCLUSIVAMENTE NO GRUPO
 */
export async function notifyNewPhotographerRegistration({ id, name, email, phone, location }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const message = `📸 *Novo Fotógrafo Cadastrado no FotoClic!*

• *Nome:* ${name}
• *E-mail:* ${email}
• *Telefone:* ${phone || 'Não informado'}
${location ? `• *Local:* ${location}\n` : ''}• *Status:* 🔓 Liberado automaticamente
• *Data/Hora:* ${now}`;

  const buttons = [
    [
      { text: '👤 Ver no Painel Admin', url: 'https://www.fotoclic.com.br/admin' },
      { text: '🚫 Desativar Acesso', callback_data: `photog_reject_${id}` }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons, targetChatId: TELEGRAM_GROUP_ID });
}

/**
 * Dispara notificação de NOVO PRODUTOR DE EVENTOS CADASTRADO COM BOTÕES DE APROVAÇÃO
 */
export async function notifyNewProducerRegistration({ id, name, email, phone, company_name }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const message = `🎪 *Novo Produtor de Eventos Cadastrado!*

• *Nome:* ${name}
• *Empresa/Produtora:* ${company_name || 'Não informada'}
• *E-mail:* ${email}
• *Telefone:* ${phone || 'Não informado'}
• *Status:* ⏳ *Aguardando Moderação / Aprovação*
• *Data/Hora:* ${now}

_Deseja liberar o acesso deste Produtor ao painel?_`;

  const buttons = [
    [
      { text: `✅ Aprovar Produtor`, callback_data: `producer_approve_${id}` },
      { text: `❌ Recusar`, callback_data: `producer_reject_${id}` }
    ],
    [
      { text: '👤 Ver no Painel Admin', url: 'https://www.fotoclic.com.br/admin' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons, targetChatId: TELEGRAM_GROUP_ID });
}

/**
 * Dispara notificação de NOVO CLIENTE COMPRADOR EXCLUSIVAMENTE NO GRUPO
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

  return await sendTelegramMessage({ text: message, buttons, targetChatId: TELEGRAM_GROUP_ID });
}

/**
 * Dispara notificação de NOVA VENDA CONFIRMADA EXCLUSIVAMENTE NO GRUPO
 */
export async function notifyNewSaleToTelegram({ orderId, buyerName, customerEmail, totalAmount, photos = [], paymentMethod = 'PIX', photographerNames = [] }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const totalNum = Number(totalAmount || 0);
  const totalFormatted = totalNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  // Taxas Appmax negociadas: 0,99% + 0,49
  const gatewayFee = (totalNum * 0.0099) + (photos.length * 0.49);
  const platformFee = totalNum * 0.06;
  const netPhotographers = Math.max(0, totalNum - platformFee - gatewayFee);

  const photoList = photos.map(p => `• ${p.title || 'Foto'} (R$ ${(Number(p.price) || 0).toFixed(2).replace('.', ',')})`).join('\n');
  const photogText = photographerNames.length > 0 ? `\n• 📸 *Fotógrafo(s):* ${photographerNames.join(', ')}` : '';

  const message = `🎉 *Nova Venda Aprovada no FotoClic!* (${paymentMethod})

• 🏷️ *Pedido:* #${orderId}
• 👤 *Comprador:* ${buyerName || 'Cliente'} (\`${customerEmail || 'Sem e-mail'}\`)${photogText}
• 💵 *Total Pago:* *${totalFormatted}*
• 💳 *Taxa Appmax:* \`- ${gatewayFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\`
• 📈 *Margem FotoClic (6%):* \`+ ${platformFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\`
• 💼 *Repasse Líquido:* *${netPhotographers.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*

📸 *Fotos Vendidas (${photos.length}):*
${photoList}

⏰ *Data/Hora:* ${now}`;

  const buttons = [
    [
      { text: '📊 Ver no Painel Admin', url: 'https://www.fotoclic.com.br/admin' },
      { text: '🌐 Abrir FotoClic', url: 'https://www.fotoclic.com.br' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons, targetChatId: TELEGRAM_GROUP_ID });
}

/**
 * Dispara notificação de SOLICITAÇÃO DE SAQUE / REPASSE DE FOTÓGRAFO
 */
export async function notifyPayoutRequestToTelegram({ payoutId, photographerName, email, pixKey, pixKeyType, amount }) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const amountFormatted = Number(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const message = `💸 *Nova Solicitação de Repasse / Saque!*

• 📸 *Fotógrafo:* ${photographerName || 'Fotógrafo'}
• ✉️ *E-mail:* ${email || 'Não informado'}
• 🏦 *Chave PIX:* \`${pixKey || 'Não informada'}\` (${pixKeyType || 'PIX'})
• 💵 *Valor a Transferir:* *${amountFormatted}*
• ⏰ *Data/Hora:* ${now}

_Após realizar a transferência PIX, clique no botão abaixo para confirmar o repasse:_`;

  const buttons = [
    [
      { text: '✅ Confirmar Repasse Realizado', callback_data: `payout_confirm_${payoutId}` }
    ],
    [
      { text: '📊 Ver Central de Saques', url: 'https://www.fotoclic.com.br/admin' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons, targetChatId: TELEGRAM_GROUP_ID });
}

/**
 * Envia o Menu Principal Interativo de Gestão no Telegram
 */
export async function sendTelegramMenu(targetChatId = null) {
  const message = `🚀 *FotoClic • Central de Gestão & Alertas*

Selecione uma das opções abaixo para gerenciar métricas e ações em tempo real:`;

  const buttons = [
    [
      { text: '📊 Resumo de Hoje', callback_data: 'cmd_resumo' },
      { text: '💰 Últimas Vendas', callback_data: 'cmd_vendas' }
    ],
    [
      { text: '📸 Fotógrafos & Moderação', callback_data: 'cmd_fotografos' },
      { text: '💸 Solicitações de Saque', callback_data: 'cmd_saques' }
    ],
    [
      { text: '⚡ Status dos Serviços', callback_data: 'cmd_status' },
      { text: '🌐 Abrir FotoClic', url: 'https://www.fotoclic.com.br' }
    ]
  ];

  return await sendTelegramMessage({ text: message, buttons, targetChatId: targetChatId || TELEGRAM_GROUP_ID });
}
