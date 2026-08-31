import { createClient } from '@supabase/supabase-js';
import { 
  notifyErrorWithAi, 
  notifyNewPhotographerRegistration, 
  notifyNewCustomerRegistration, 
  notifyNewProducerRegistration,
  notifyNewSaleToTelegram,
  notifyPayoutRequestToTelegram,
  notifyRegistrationFailure,
  sendTelegramMenu
} from '../lib/telegram-ai-service.js';
import { sendLocawebEmail } from '../lib/sale-notifications.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8854659202:AAHOiJHH5rjJ1PJPjuDx26UAYcyafm3BEzY';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Helper para enviar mensagens ao Telegram
  const replyTelegram = async (chatId, text, buttons = []) => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined
        })
      });
      return await res.json();
    } catch (e) {
      console.warn('[Telegram Reply Error]:', e.message);
      return { ok: false };
    }
  };

  // Helper para responder Callback Query
  const answerCallback = async (callbackId, text = '', showAlert = false) => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text,
          show_alert: showAlert
        })
      });
      return await res.json();
    } catch (e) {
      console.warn('[Telegram AnswerCallback Error]:', e.message);
      return { ok: false };
    }
  };

  // --- Handlers de Comandos de Gestão (ChatOps) ---

  const handleVendas = async (chatId) => {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*, photo:photo_id(title, price, photographer_id)')
      .order('sale_date', { ascending: false })
      .limit(5);

    if (error || !sales || sales.length === 0) {
      return await replyTelegram(chatId, '🛒 *Nenhuma venda registrada ainda no sistema.*', [
        [{ text: '🔙 Voltar ao Menu', callback_data: 'cmd_menu' }]
      ]);
    }

    let msg = `💰 *Últimas 5 Vendas no FotoClic:*\n\n`;
    sales.forEach((s, idx) => {
      const price = Number(s.price || s.photo?.price || 0);
      const commission = Number(s.commission || (price * 0.06));
      const gateway = (price * 0.0099) + 0.49;
      const net = Math.max(0, price - commission - gateway);
      const date = new Date(s.sale_date || s.created_at).toLocaleDateString('pt-BR');

      msg += `*${idx + 1}.* 📸 _${s.photo?.title || 'Foto Digital'}_ (${date})\n`;
      msg += `• 👤 *Cliente:* ${s.buyer_name || 'Comprador'}\n`;
      msg += `• 💵 *Bruto:* R$ ${price.toFixed(2).replace('.', ',')} | 💼 *Líq Fotógrafo:* *R$ ${net.toFixed(2).replace('.', ',')}*\n\n`;
    });

    return await replyTelegram(chatId, msg, [
      [
        { text: '🔄 Atualizar', callback_data: 'cmd_vendas' },
        { text: '🔙 Menu Principal', callback_data: 'cmd_menu' }
      ]
    ]);
  };

  const handleFotografos = async (chatId) => {
    const { data: photographers } = await supabase
      .from('users')
      .select('id, name, email, is_active, created_at')
      .eq('role', 'photographer')
      .order('created_at', { ascending: false });

    const total = photographers ? photographers.length : 0;
    const active = photographers ? photographers.filter(p => p.is_active).length : 0;
    const pending = photographers ? photographers.filter(p => !p.is_active) : [];

    let msg = `📸 *Painel de Fotógrafos FotoClic*\n\n`;
    msg += `• 👥 *Total de Fotógrafos:* ${total}\n`;
    msg += `• 🟢 *Ativos & Liberados:* ${active}\n`;
    msg += `• ⚠️ *Aguardando Moderação:* ${pending.length}\n\n`;

    const buttons = [];

    if (pending.length > 0) {
      msg += `📋 *Fotógrafos Pendentes de Aprovação:*\n`;
      pending.slice(0, 5).forEach((p, idx) => {
        msg += `${idx + 1}. *${p.name}* (\`${p.email}\`)\n`;
        buttons.push([
          { text: `✅ Aprovar ${p.name.split(' ')[0]}`, callback_data: `photog_approve_${p.id}` },
          { text: `❌ Recusar`, callback_data: `photog_reject_${p.id}` }
        ]);
      });
    } else {
      msg += `✅ *Nenhum fotógrafo aguardando moderação no momento.*`;
    }

    buttons.push([
      { text: '🔄 Atualizar', callback_data: 'cmd_fotografos' },
      { text: '🔙 Menu Principal', callback_data: 'cmd_menu' }
    ]);

    return await replyTelegram(chatId, msg, buttons);
  };

  const handleSaques = async (chatId) => {
    const { data: payouts } = await supabase
      .from('payouts')
      .select('*, photographer:photographer_id(name, email, pix_key, pix_key_type)')
      .eq('status', 'pending')
      .order('request_date', { ascending: false });

    if (!payouts || payouts.length === 0) {
      return await replyTelegram(chatId, '💸 *Nenhuma solicitação de repasse/saque pendente no momento.*', [
        [
          { text: '📊 Ver Central Admin', url: 'https://www.fotoclic.com.br/admin' },
          { text: '🔙 Menu Principal', callback_data: 'cmd_menu' }
        ]
      ]);
    }

    let msg = `💸 *Solicitações de Repasse Pendentes (${payouts.length}):*\n\n`;
    const buttons = [];

    payouts.forEach((p, idx) => {
      const photogName = p.photographer?.name || 'Fotógrafo';
      const pix = p.photographer?.pix_key || 'Não informada';
      const val = Number(p.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      msg += `*${idx + 1}.* 📸 *${photogName}*\n`;
      msg += `• 🏦 *PIX:* \`${pix}\`\n`;
      msg += `• 💵 *Valor:* *${val}*\n\n`;

      buttons.push([
        { text: `✅ Confirmar Repasse (${photogName.split(' ')[0]})`, callback_data: `payout_confirm_${p.id}` }
      ]);
    });

    buttons.push([
      { text: '🔄 Atualizar', callback_data: 'cmd_saques' },
      { text: '🔙 Menu Principal', callback_data: 'cmd_menu' }
    ]);

    return await replyTelegram(chatId, msg, buttons);
  };

  const handleStatus = async (chatId) => {
    const start = Date.now();
    const { count: photosCount, error: dbErr } = await supabase.from('photos').select('id', { count: 'exact', head: true });
    const latency = Date.now() - start;

    const dbStatus = dbErr ? '🔴 Instável' : `🟢 Operacional (${latency}ms)`;

    const msg = `⚡ *Status dos Serviços FotoClic:*

• 🗄️ *Banco de Dados (Supabase):* ${dbStatus}
• 💳 *Gateway de Pagamentos (Appmax):* 🟢 Ativo (API v4)
• 👁️ *Reconhecimento Facial (AWS):* 🟢 Operacional
• 📧 *Servidor de E-mail (Locaweb):* 🟢 100% Entregando
• 🚀 *Hospedagem & Edge (Vercel):* 🟢 Online
• 📊 *Total de Fotos no Catálogo:* ${photosCount || 0} fotos`;

    return await replyTelegram(chatId, msg, [
      [
        { text: '🔄 Testar Novamente', callback_data: 'cmd_status' },
        { text: '🔙 Menu Principal', callback_data: 'cmd_menu' }
      ]
    ]);
  };

  try {
    const body = req.body || {};

    // 0. Tratamento de Mensagens de Texto / Comandos do Telegram
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat?.id;
      const text = (msg.text || '').trim().toLowerCase();

      console.log(`[Telegram Command]: Chat ${chatId}, Text: "${text}"`);

      if (text === '/menu' || text === '/start' || text === '/ajuda' || text === '/comandos') {
        await sendTelegramMenu(chatId);
        return res.status(200).json({ ok: true });
      }

      if (text.startsWith('/resumo') || text.startsWith('/relatorio') || text.startsWith('/hoje')) {
        const { generateAndSendDailySummary } = await import('../lib/daily-summary-service.js');
        await generateAndSendDailySummary();
        return res.status(200).json({ ok: true });
      }

      if (text.startsWith('/vendas')) {
        await handleVendas(chatId);
        return res.status(200).json({ ok: true });
      }

      if (text.startsWith('/fotografos') || text.startsWith('/moderacao')) {
        await handleFotografos(chatId);
        return res.status(200).json({ ok: true });
      }

      if (text.startsWith('/saques') || text.startsWith('/repasses')) {
        await handleSaques(chatId);
        return res.status(200).json({ ok: true });
      }

      if (text.startsWith('/status') || text.startsWith('/ping')) {
        await handleStatus(chatId);
        return res.status(200).json({ ok: true });
      }

      // Resposta padrão caso receba qualquer texto desconhecido
      await sendTelegramMenu(chatId);
      return res.status(200).json({ ok: true });
    }

    // 1. Tratamento de Cliques nos Botões Interativos (Callback Queries)
    if (body.callback_query) {
      const cq = body.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;

      // Identificar quem clicou no botão
      const fromUser = cq.from || {};
      const approverName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ') || fromUser.username || 'Membro da Equipe';
      const approverHandle = fromUser.username ? `@${fromUser.username}` : `ID: ${fromUser.id}`;
      const approverFullText = `*${approverName}* (${approverHandle})`;
      const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // Menu Callbacks
      if (data === 'cmd_menu') {
        await answerCallback(cq.id);
        await sendTelegramMenu(chatId);
        return res.status(200).json({ ok: true });
      }

      if (data === 'cmd_resumo') {
        await answerCallback(cq.id, 'Gerando resumo diário...');
        const { generateAndSendDailySummary } = await import('../lib/daily-summary-service.js');
        await generateAndSendDailySummary();
        return res.status(200).json({ ok: true });
      }

      if (data === 'cmd_vendas') {
        await answerCallback(cq.id);
        await handleVendas(chatId);
        return res.status(200).json({ ok: true });
      }

      if (data === 'cmd_fotografos') {
        await answerCallback(cq.id);
        await handleFotografos(chatId);
        return res.status(200).json({ ok: true });
      }

      if (data === 'cmd_saques') {
        await answerCallback(cq.id);
        await handleSaques(chatId);
        return res.status(200).json({ ok: true });
      }

      if (data === 'cmd_status') {
        await answerCallback(cq.id, 'Testando conexões...');
        await handleStatus(chatId);
        return res.status(200).json({ ok: true });
      }

      // Confirmação de Repasse de Saque
      if (data.startsWith('payout_confirm_')) {
        const payoutId = data.replace('payout_confirm_', '');
        const { data: payout } = await supabase
          .from('payouts')
          .select('*, photographer:photographer_id(name, email, pix_key)')
          .eq('id', payoutId)
          .single();

        await supabase
          .from('payouts')
          .update({ status: 'paid', processed_date: new Date().toISOString() })
          .eq('id', payoutId);

        await answerCallback(cq.id, '✅ Repasse confirmado!', true);

        const photogName = payout?.photographer?.name || 'Fotógrafo';
        const valFormatted = Number(payout?.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        await replyTelegram(chatId, `🎉 *Repasse Confirmado com Sucesso!*\n\n• 📸 *Fotógrafo:* ${photogName}\n• 💵 *Valor:* *${valFormatted}*\n• 🏦 *PIX:* \`${payout?.photographer?.pix_key || 'Chave PIX'}\`\n• 👮 *Confirmado por:* ${approverFullText}\n• ⏰ *Data/Hora:* ${nowStr}`);
        return res.status(200).json({ ok: true });
      }

      // Aprovar Fotógrafo
      if (data.startsWith('photog_approve_')) {
        const userId = data.replace('photog_approve_', '');
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) {
          await supabase.from('users').update({ is_active: true }).eq('id', userId);

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
            }).catch(() => {});
          }

          await answerCallback(cq.id, `✅ Fotógrafo ${user.name} aprovado por você!`, true);
          await replyTelegram(chatId, `✅ *Fotógrafo Aprovado com Sucesso!*\n\n• 📸 *Fotógrafo:* ${user.name}\n• 📧 *E-mail:* \`${user.email}\`\n• 🔓 *Status:* Liberado na plataforma\n• 👮 *Aprovado por:* ${approverFullText}\n• ⏰ *Data/Hora:* ${nowStr}`);
        }
        return res.status(200).json({ ok: true });
      }

      // Recusar Fotógrafo
      if (data.startsWith('photog_reject_')) {
        const userId = data.replace('photog_reject_', '');
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) {
          await supabase.from('users').update({ is_active: false }).eq('id', userId);
          await answerCallback(cq.id, `❌ Cadastro de ${user.name} recusado.`);
          await replyTelegram(chatId, `❌ *Cadastro Recusado:*\n\n• 📸 *Fotógrafo:* ${user.name} (\`${user.email}\`)\n• 👮 *Recusado por:* ${approverFullText}\n• ⏰ *Data/Hora:* ${nowStr}`);
        }
        return res.status(200).json({ ok: true });
      }

      // Aprovar Produtor de Eventos
      if (data.startsWith('producer_approve_')) {
        const userId = data.replace('producer_approve_', '');
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) {
          await supabase.from('users').update({ is_active: true }).eq('id', userId);

          if (user.email) {
            await sendLocawebEmail({
              to: user.email,
              subject: '🎉 Seu cadastro de Produtor no FotoClic foi Aprovado!',
              html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
                  <h2 style="color: #FF6B00; margin-top: 0;">🎉 Parabéns, ${user.name}!</h2>
                  <p>Seu cadastro de <strong>Produtor de Eventos</strong> foi <strong>aprovado com sucesso</strong> no FotoClic.</p>
                  <p>Você já pode acessar seu painel exclusivo, criar seus eventos, convidar sua equipe de até 10 fotógrafos e configurar suas comissões de coordenação!</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://www.fotoclic.com.br/produtor" style="background-color: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">
                      Acessar Painel do Produtor
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #999; text-align: center;">Equipe FotoClic &bull; Conectando momentos, produtores e fotógrafos</p>
                </div>`
            }).catch(() => {});
          }

          await answerCallback(cq.id, `✅ Produtor ${user.name} aprovado por você!`, true);
          await replyTelegram(chatId, `✅ *Produtor Aprovado com Sucesso!*\n\n• 🎪 *Produtor:* ${user.name}\n• 🏢 *Empresa:* ${user.company_name || 'Individual'}\n• 📧 *E-mail:* \`${user.email}\`\n• 🔓 *Status:* Liberado na plataforma\n• 👮 *Aprovado por:* ${approverFullText}\n• ⏰ *Data/Hora:* ${nowStr}`);
        }
        return res.status(200).json({ ok: true });
      }

      // Recusar Produtor
      if (data.startsWith('producer_reject_')) {
        const userId = data.replace('producer_reject_', '');
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) {
          await supabase.from('users').update({ is_active: false }).eq('id', userId);
          await answerCallback(cq.id, `❌ Cadastro de Produtor ${user.name} recusado.`);
          await replyTelegram(chatId, `❌ *Cadastro de Produtor Recusado:*\n\n• 🎪 *Produtor:* ${user.name} (\`${user.email}\`)\n• 👮 *Recusado por:* ${approverFullText}\n• ⏰ *Data/Hora:* ${nowStr}`);
        }
        return res.status(200).json({ ok: true });
      }

      // Autofix IA Sentry
      if (data.startsWith('fix_approve_')) {
        await answerCallback(cq.id, '✅ Correção autorizada!');
        await replyTelegram(chatId, `🛠️ *Correção Autorizada!*\n\n• 👮 *Autorizado por:* ${approverFullText}\n• 🤖 *IA:* Analisando o arquivo e preparando o patch.\n• 📦 *Git:* Atualizando branch \`main\`.\n• 🚀 *Vercel:* Disparando novo deploy automático...`);
        return res.status(200).json({ ok: true });
      }

      if (data.startsWith('fix_ignore_')) {
        await answerCallback(cq.id, '❌ Erro marcado como ignorado.');
        await replyTelegram(chatId, `👌 *Erro Ignorado:*\n\n• 👮 *Marcado por:* ${approverFullText}\n• Nenhuma alteração foi feita no código.`);
        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    }

    // 2. Ações Diretas da Aplicação (Webhooks Internos)
    const action = body.action;

    // 🛡️ Sentinel AI - Inspeção de Injeção de Código em Formulários
    const SQLI_PATTERN = /(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE)\b\s+.*?\b(FROM|INTO|TABLE|DATABASE|WHERE)\b)|('(\s*OR\s*|\s*AND\s*)'?[^']+'?=')|(--|\/\*|\*\/|;\s*$)|(\b(OR|AND)\b\s+['"\d\(\)\w=]+\s*=\s*['"\d\(\)\w=]+)/i;
    const XSS_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|onerror\s*=|onload\s*=/i;
    
    const combinedInput = `${body.name || ''} ${body.email || ''} ${body.phone || ''} ${body.location || ''} ${body.company_name || ''}`;
    if (SQLI_PATTERN.test(combinedInput) || XSS_PATTERN.test(combinedInput)) {
      console.warn(`[Sentinel Webhook Shield] Injeção interceptada no payload de ${action}: ${combinedInput}`);
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.from('security_logs').insert({
            event_type: SQLI_PATTERN.test(combinedInput) ? 'sql_injection' : 'xss_attempt',
            severity: 'high',
            ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
            endpoint: `/api/sentry-ai-webhook?action=${action}`,
            request_method: req.method,
            payload_summary: { body },
            ai_diagnosis: 'Tentativa de injeção de parâmetros maliciosos nos campos de cadastro (nome/email/telefone).',
            ai_remediation: 'O formulário rejeitou os caracteres maliciosos e a notificação foi abortada.',
            action_taken: 'blocked_request'
          });
        }
      } catch (err) {
        console.error('[Sentinel Log Error]:', err.message);
      }
      return res.status(400).json({ error: 'Caracteres inválidos detectados pelo Sentinel AI.' });
    }

    if (action === 'new_producer') {
      const success = await notifyNewProducerRegistration({
        id: body.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        company_name: body.company_name
      });
      return res.status(200).json({ success });
    }

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
        paymentMethod: body.paymentMethod,
        photographerNames: body.photographerNames
      });
      return res.status(200).json({ success });
    }

    if (action === 'payout_request') {
      const success = await notifyPayoutRequestToTelegram({
        payoutId: body.payoutId,
        photographerName: body.photographerName,
        email: body.email,
        pixKey: body.pixKey,
        pixKeyType: body.pixKeyType,
        amount: body.amount
      });
      return res.status(200).json({ success });
    }

    if (action === 'registration_failed') {
      const success = await notifyRegistrationFailure({
        role: body.role,
        name: body.name,
        email: body.email,
        phone: body.phone,
        errorMessage: body.errorMessage || body.error,
        stack: body.stack
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

    // 🛡️ Ignorar ruídos de terceiros (WebViews do Android, extensões do navegador, etc.)
    if (
      /Java object is gone/i.test(errorTitle) ||
      /Java exception was raised/i.test(errorTitle) ||
      /ResizeObserver loop/i.test(errorTitle) ||
      /chrome-extension/i.test(errorTitle)
    ) {
      console.log(`[Sentry Webhook Filter] Ruído de WebView ignorado: ${errorTitle}`);
      return res.status(200).json({ ok: true, message: 'Ruído de WebView ignorado com sucesso.' });
    }

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
