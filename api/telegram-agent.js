import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getFileContent,
  commitFile,
  listDirectory,
  getLatestCommits
} from '../lib/github-agent-service.js';

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const AUTHORIZED_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '5525056555').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

// Função auxiliar para enviar mensagens no Telegram
async function sendTelegramMessage(chatId, text, parseMode = 'Markdown') {
  if (!TELEGRAM_BOT_TOKEN) return null;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[Telegram Send Error]:', err);
    return null;
  }
}

// Animação visual de "digitando..." (typing) no Telegram
async function sendTelegramChatAction(chatId, action = 'typing') {
  if (!TELEGRAM_BOT_TOKEN) return null;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action
      })
    });
    return await res.json();
  } catch (err) {
    return null;
  }
}

// Configuração das Ferramentas (Tools) do Agente Gemini
const agentTools = [
  {
    functionDeclarations: [
      {
        name: 'read_file',
        description: 'Lê o conteúdo completo de um arquivo no repositório GitHub (ex: pages/HomePage.tsx, locales/pt.ts, components/WatermarkedImage.tsx).',
        parameters: {
          type: 'OBJECT',
          properties: {
            filePath: {
              type: 'STRING',
              description: 'O caminho relativo do arquivo no repositório (ex: locales/pt.ts ou pages/HomePage.tsx)'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'commit_file_change',
        description: 'Grava uma alteração de código ou cria um novo arquivo no repositório GitHub, realizando o commit e acionando o deploy automático na Vercel.',
        parameters: {
          type: 'OBJECT',
          properties: {
            filePath: {
              type: 'STRING',
              description: 'O caminho relativo do arquivo a ser modificado ou criado.'
            },
            newContent: {
              type: 'STRING',
              description: 'O conteúdo COMPLETO e atualizado do arquivo.'
            },
            commitMessage: {
              type: 'STRING',
              description: 'Mensagem descritiva do commit (ex: Update hero button text to Desfrute).'
            }
          },
          required: ['filePath', 'newContent', 'commitMessage']
        }
      },
      {
        name: 'list_files',
        description: 'Lista arquivos e diretórios de uma pasta no repositório GitHub.',
        parameters: {
          type: 'OBJECT',
          properties: {
            dirPath: {
              type: 'STRING',
              description: 'O caminho da pasta (ou string vazia para a raiz do repositório).'
            }
          }
        }
      },
      {
        name: 'get_recent_commits',
        description: 'Retorna o histórico dos últimos commits do repositório.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: {
              type: 'NUMBER',
              description: 'Quantidade de commits a retornar (padrão: 3).'
            }
          }
        }
      }
    ]
  }
];

export const config = {
  maxDuration: 60
};

// Pool de Modelos para Fallback Automático caso um atinja limite de taxa (429)
const MODEL_POOL = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview'
];

export default async function handler(req, res) {
  // 1. Healthcheck / Info via GET
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'FotoClic Telegram Developer Agent',
      status: 'active',
      hasTelegramToken: !!TELEGRAM_BOT_TOKEN,
      hasGeminiKey: !!GEMINI_API_KEY,
      hasGithubToken: !!process.env.GITHUB_TOKEN,
      authorizedChatId: AUTHORIZED_CHAT_ID ? 'Configured' : 'Missing'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body || {};
  const message = update.message || update.edited_message;

  if (!message || !message.chat) {
    return res.status(200).json({ ok: true, note: 'No message object found' });
  }

  const chatId = String(message.chat.id);
  const senderId = String(message.from?.id || chatId);
  const text = message.text || message.caption || '';

  // 🔒 Gate de Segurança: Apenas o Chat ID autorizado pode executar comandos
  if (chatId !== AUTHORIZED_CHAT_ID && senderId !== AUTHORIZED_CHAT_ID) {
    console.warn(`[Security Alert] Acesso não autorizado do Chat ID: ${chatId} (${message.from?.username || 'Desconhecido'})`);
    await sendTelegramMessage(
      chatId,
      '⛔ *Acesso Negado.*\nEste bot é restrito e de uso exclusivo do administrador do FotoClic.',
      'Markdown'
    );
    return res.status(200).json({ ok: true, error: 'Unauthorized' });
  }

  if (!text) {
    await sendTelegramMessage(
      chatId,
      '👋 Olá! Envie um comando de desenvolvimento em texto (ex: _"Mude o título da home para X"_ ou _"/status"_).'
    );
    return res.status(200).json({ ok: true });
  }

  // Comandos Rápidos
  if (text.startsWith('/start') || text.startsWith('/help')) {
    const welcomeMsg = `🤖 *Agente Desenvolvedor FotoClic (24/7)*\n\n` +
      `Estou conectado ao repositório \`mauricioFotoClic/fotoclic\`.\n\n` +
      `*Como me usar:*\n` +
      `• _"Mude a cor do botão da home para azul"_\n` +
      `• _"Qual o texto do banner da página inicial?"_\n` +
      `• _"Adicione a categoria Corrida Rústica em Categories.tsx"_\n` +
      `• _"/status"_ - Ver últimos commits e saúde da plataforma\n\n` +
      `_Toda alteração aceita gera um commit no GitHub e aciona o deploy na Vercel automaticamente._`;
    await sendTelegramMessage(chatId, welcomeMsg);
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/status')) {
    try {
      const commits = await getLatestCommits(3);
      let statusMsg = `🚀 *Status do Repositório FotoClic*\n\n*Últimos Commits:*\n`;
      commits.forEach(c => {
        statusMsg += `• \`${c.sha}\`: ${c.message} _(${c.date.split('T')[0]})_\n`;
      });
      statusMsg += `\n🔗 *Site no ar:* https://www.fotoclic.com.br`;
      await sendTelegramMessage(chatId, statusMsg);
    } catch (err) {
      await sendTelegramMessage(chatId, `⚠️ Erro ao consultar status: ${err.message}`);
    }
    return res.status(200).json({ ok: true });
  }

  // Heartbeat contínuo de "digitando..." (typing) a cada 4 segundos
  await sendTelegramChatAction(chatId, 'typing');
  const typingHeartbeat = setInterval(() => {
    sendTelegramChatAction(chatId, 'typing').catch(() => {});
  }, 4000);

  // Notificar o usuário que a tarefa começou
  await sendTelegramMessage(chatId, `⏳ *Processando sua solicitação:* _"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"_`);

  if (!GEMINI_API_KEY) {
    clearInterval(typingHeartbeat);
    await sendTelegramMessage(chatId, '❌ Erro: `GEMINI_API_KEY` não configurada no servidor.');
    return res.status(200).json({ ok: true });
  }

  if (!process.env.GITHUB_TOKEN) {
    clearInterval(typingHeartbeat);
    await sendTelegramMessage(chatId, '❌ Erro: `GITHUB_TOKEN` não configurado. Adicione o Token do GitHub nas variáveis de ambiente.');
    return res.status(200).json({ ok: true });
  }

  const systemInstruction = `Você é o Engenheiro de Software Autônomo e Administrador Técnico do FotoClic.
Seu objetivo é atender aos comandos do dono do projeto via Telegram de forma rápida, segura e precisa.
Você tem acesso ao repositório GitHub da aplicação React / Vite / TypeScript / Tailwind / Supabase.

DIRETRIZES FUNDAMENTAIS:
1. Sempre leia o arquivo (read_file) antes de fazer qualquer alteração para entender o código existente.
2. NUNCA quebre código que já está funcionando. Preserve importações, tipos e regras de negócio (Appmax, Supabase, etc).
3. Ao alterar um arquivo (commit_file_change), forneça o código COMPLETO atualizado e uma mensagem de commit clara em inglês (ex: "fix: update hero text in pt translation").
4. Responda em Português do Brasil (PT-BR) com um resumo conciso e amigável das alterações que você realizou e confirme o commit.`;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  // Função para executar a conversa com fallback automático de modelos
  for (const modelName of MODEL_POOL) {
    try {
      await sendTelegramChatAction(chatId, 'typing');
      console.log(`[Agent Session] Tentando modelo: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: agentTools,
        systemInstruction
      });

      const chat = model.startChat();
      let result = await chat.sendMessage(text);
      let response = await result.response;

      // Loop de Execução de Ferramentas (Function Calling)
      let iterations = 0;
      const maxIterations = 8;

      while (response.functionCalls() && response.functionCalls().length > 0 && iterations < maxIterations) {
        iterations++;
        const functionCalls = response.functionCalls();
        const functionResponses = [];

        for (const call of functionCalls) {
          const { name, args } = call;
          await sendTelegramChatAction(chatId, 'typing');

          let functionResult;
          try {
            if (name === 'read_file') {
              await sendTelegramMessage(chatId, `🔍 Lendo arquivo \`${args.filePath}\`...`);
              await sendTelegramChatAction(chatId, 'typing');
              const fileData = await getFileContent(args.filePath);
              functionResult = fileData.exists ? { content: fileData.content } : { error: 'Arquivo não encontrado' };
            } else if (name === 'commit_file_change') {
              await sendTelegramMessage(chatId, `📝 Aplicando alterações e gerando commit em \`${args.filePath}\`...`);
              await sendTelegramChatAction(chatId, 'typing');
              const commitRes = await commitFile(args.filePath, args.newContent, args.commitMessage);
              functionResult = { success: true, commitSha: commitRes.commitSha, url: commitRes.commitUrl };
            } else if (name === 'list_files') {
              const files = await listDirectory(args.dirPath || '');
              functionResult = { files };
            } else if (name === 'get_recent_commits') {
              const commits = await getLatestCommits(args.limit || 3);
              functionResult = { commits };
            } else {
              functionResult = { error: `Ferramenta desconhecida: ${name}` };
            }
          } catch (toolError) {
            console.error(`[Tool Execution Error] ${name}:`, toolError);
            functionResult = { error: toolError.message };
          }

          functionResponses.push({
            functionResponse: {
              name,
              response: functionResult
            }
          });
        }

        await sendTelegramChatAction(chatId, 'typing');
        result = await chat.sendMessage(functionResponses);
        response = await result.response;
      }

      const replyText = response.text() || '✅ Solicitação processada com sucesso!';
      clearInterval(typingHeartbeat);
      await sendTelegramMessage(chatId, replyText);
      return res.status(200).json({ ok: true, reply: replyText });

    } catch (modelError) {
      console.warn(`[Model ${modelName} Error]:`, modelError.message);
      // Se for erro de cota 429 ou modelo indisponível, tenta o próximo modelo do pool
      if (modelError.message && (modelError.message.includes('429') || modelError.message.includes('404') || modelError.message.includes('503'))) {
        console.log(`[Rate Limit / Quota] Fazendo fallback para o próximo modelo do pool...`);
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      clearInterval(typingHeartbeat);
      throw modelError;
    }
  }

  // Se todos os modelos do pool falharem por cota
  clearInterval(typingHeartbeat);
  await sendTelegramMessage(
    chatId,
    `⚠️ *Cota temporária atingida.*\nAguarde cerca de 30 segundos e envie seu comando novamente.`
  );
  return res.status(200).json({ ok: true, error: 'Quota exceeded on all pool models' });
}


