
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
    'https://www.fotoclic.com.br',
    'https://fotoclic.com.br',
    'http://localhost:5173',
    'http://localhost:3000'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resetEmailCooldownMap = new Map();
const resetIpWindowMap = new Map();

function isAllowedOrigin(urlOrigin) {
    if (!urlOrigin) return false;
    return ALLOWED_ORIGINS.includes(urlOrigin) || urlOrigin.endsWith('.vercel.app');
}

function sanitizeResetRedirect(redirectTo) {
    const fallback = 'https://www.fotoclic.com.br/reset-password';
    if (!redirectTo || typeof redirectTo !== 'string') return fallback;
    try {
        const parsed = new URL(redirectTo);
        if (!isAllowedOrigin(parsed.origin)) return fallback;
        return `${parsed.origin}/reset-password`;
    } catch {
        return fallback;
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function checkResetRateLimit(ip, email) {
    const now = Date.now();
    const lastEmailReq = resetEmailCooldownMap.get(email);
    if (lastEmailReq && now - lastEmailReq < 60_000) {
        return 'Aguarde 1 minuto antes de solicitar outro link de recuperação para este e-mail.';
    }

    const ipRecord = resetIpWindowMap.get(ip) || { count: 0, resetAt: now + 15 * 60_000 };
    if (now > ipRecord.resetAt) {
        ipRecord.count = 0;
        ipRecord.resetAt = now + 15 * 60_000;
    }
    if (ipRecord.count >= 10) {
        return 'Muitas solicitações de recuperação deste endereço. Aguarde alguns minutos e tente novamente.';
    }

    resetEmailCooldownMap.set(email, now);
    ipRecord.count += 1;
    resetIpWindowMap.set(ip, ipRecord);
    return null;
}

async function sendViaLocaweb({ token, from, to, subject, html }) {
    const res = await fetch('https://api.smtplw.com.br/v1/messages', {
        method: 'POST',
        headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            body: html,
        }),
    });

    const data = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : { message: await res.text() };

    return { ok: res.ok, status: res.status, data };
}

function buildPasswordResetHtml(userName, actionLink) {
    const safeName = escapeHtml(userName || 'Fotógrafo(a) / Cliente');
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #FF6B00; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">FotoClic</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Recuperação de Senha</p>
          </div>
          <div style="padding: 30px 24px; color: #334155;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Olá, ${safeName}!</h2>
            <p style="font-size: 15px; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>FotoClic</strong>.</p>
            <p style="font-size: 15px; line-height: 1.6;">Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${actionLink}" style="background-color: #20C933; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                Redefinir Minha Senha
              </a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="font-size: 12px; color: #475569; word-break: break-all; background: #f1f5f9; padding: 12px; border-radius: 6px;">
              <a href="${actionLink}" style="color: #0f172a;">${actionLink}</a>
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
}

async function handlePasswordReset({ request, response, supabase, locawebToken }) {
    const cleanEmail = String(request.body?.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
        return response.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
    }

    const clientIp = String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const rateLimitError = checkResetRateLimit(clientIp, cleanEmail);
    if (rateLimitError) {
        return response.status(429).json({ error: rateLimitError });
    }

    const safeRedirectTo = sanitizeResetRedirect(request.body?.redirectTo);

    try {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: cleanEmail,
            options: { redirectTo: safeRedirectTo }
        });

        if (linkError) {
            const msg = String(linkError.message || '').toLowerCase();
            if (msg.includes('not found') || linkError.status === 404) {
                return response.status(200).json({ ok: true });
            }
            console.error('[Password Reset] generateLink error:', linkError);
            return response.status(500).json({ error: 'Não foi possível gerar o link de recuperação no momento.' });
        }

        const actionLink = linkData?.properties?.action_link;
        if (!actionLink) {
            return response.status(200).json({ ok: true });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('name')
            .eq('email', cleanEmail)
            .maybeSingle();

        const result = await sendViaLocaweb({
            token: locawebToken,
            from: 'nao-responda@email.fotoclic.com.br',
            to: cleanEmail,
            subject: 'Recuperação de Senha - FotoClic',
            html: buildPasswordResetHtml(profile?.name, actionLink),
        });

        if (!result.ok) {
            console.error('[Password Reset] Locaweb SMTP error:', result.data);
            return response.status(502).json({ error: 'Falha ao enviar o e-mail de recuperação. Tente novamente em instantes.' });
        }

        return response.status(200).json({ ok: true });
    } catch (error) {
        console.error('[Password Reset] Unexpected error:', error);
        return response.status(500).json({ error: 'Erro interno ao processar recuperação de senha.' });
    }
}

export default async function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = request.headers.origin;
    if (isAllowedOrigin(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        response.setHeader('Access-Control-Allow-Origin', 'https://www.fotoclic.com.br');
    }
    response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const LOCAWEB_SMTP_TOKEN = process.env.LOCAWEB_SMTP_TOKEN;

    if (!supabaseUrl || !supabaseKey || !LOCAWEB_SMTP_TOKEN) {
        console.error('[Send Email] Missing server configuration:', {
            hasSupabaseUrl: Boolean(supabaseUrl),
            hasServiceRole: Boolean(supabaseKey),
            hasLocawebToken: Boolean(LOCAWEB_SMTP_TOKEN)
        });
        return response.status(500).json({ error: 'Erro de configuração do servidor de e-mail.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rota pública controlada para recuperação de senha (sem depender do SMTP do Supabase)
    if (request.body?.action === 'password-reset') {
        return handlePasswordReset({ request, response, supabase, locawebToken: LOCAWEB_SMTP_TOKEN });
    }

    // --- Autenticação Obrigatória para envio genérico de e-mails ---
    const authHeader = request.headers.authorization || '';
    const userJwt = authHeader.replace('Bearer ', '').trim();

    if (!userJwt) {
        return response.status(401).json({ error: 'Não autorizado. Autenticação obrigatória para envio de e-mails.' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);

    if (authError || !user) {
        return response.status(401).json({ error: 'Token de autenticação inválido ou expirado.' });
    }

    const { to, subject, html } = request.body || {};

    if (!to || !subject || !html) {
        return response.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    try {
        const result = await sendViaLocaweb({
            token: LOCAWEB_SMTP_TOKEN,
            from: request.body.from || 'contato@email.fotoclic.com.br', // Authenticated subdomain
            to,
            subject,
            html,
        });

        if (!result.ok) {
            console.error('Locaweb SMTP API error:', result.data);
            return response.status(result.status).json(result.data);
        }

        return response.status(200).json(result.data);
    } catch (error) {
        console.error('Failed to send email via Locaweb:', error);
        return response.status(500).json({ error: 'Falha ao enviar e-mail.' });
    }
}
