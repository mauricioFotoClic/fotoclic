const https = require('https');
require('dotenv').config({ path: '.env.local' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = process.env.VITE_SITE_URL || 'https://www.fotoclic.com.br';
const webhookUrl = `${siteUrl}/api/telegram-agent`;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN não encontrado no .env.local');
  process.exit(1);
}

function telegramApi(method, data = null) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const payload = data ? JSON.stringify(data) : null;

    const options = {
      method: payload ? 'POST' : 'GET',
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : {}
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🤖 === CONFIGURANDO TELEGRAM AI DEVELOPER AGENT ===\n');

  // 1. Verificar Bot
  const me = await telegramApi('getMe');
  if (!me.ok) {
    console.error('❌ Token inválido do Telegram:', me);
    return;
  }
  console.log(`✅ Bot autenticado: @${me.result.username} (${me.result.first_name})`);

  // 2. Definir Webhook
  console.log(`📡 Registrando Webhook em: ${webhookUrl}...`);
  const setHook = await telegramApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'edited_message']
  });

  if (setHook.ok) {
    console.log('🎉 Webhook registrado com sucesso no Telegram!');
  } else {
    console.error('⚠️ Falha ao registrar webhook:', setHook);
  }

  // 3. Checar status do Webhook
  const info = await telegramApi('getWebhookInfo');
  console.log('\n📊 Status Atual do Webhook:');
  console.log(info.result);
  console.log('\n✅ Concluído! O bot responderá a mensagens enviadas no Telegram.');
}

main().catch(console.error);
