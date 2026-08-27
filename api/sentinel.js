import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase Client with Service Role
const getSupabase = () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
    return createClient(supabaseUrl, supabaseKey);
};

// Send Markdown Formatted Alert to Telegram
async function sendTelegramAlert({ botToken, chatId, title, severity, eventType, ipAddress, endpoint, diagnosis, remediation, actionTaken, logId }) {
    const finalToken = (botToken || process.env.TELEGRAM_BOT_TOKEN || '8854659202:AAHOiJHH5rjJ1PJPjuDx26UAYcyafm3BEzY').trim();
    const finalChatId = (chatId || process.env.TELEGRAM_CHAT_ID || '5525056555').trim();
    const groupId = (process.env.TELEGRAM_GROUP_ID || '-5372484924').trim();

    if (!finalToken) return false;

    const severityEmojis = {
        low: '🟡 [BAIXO]',
        medium: '🟠 [MÉDIO]',
        high: '🔴 [ALTO]',
        critical: '🚨 [CRÍTICO - AMEAÇA GRAVE]',
    };

    const actionEmojis = {
        auto_banned_ip: '🚫 IP AUTOMATICAMENTE BANIDO',
        blocked_request: '🛑 REQUISIÇÃO BLOQUEADA (403)',
        account_locked: '🔒 CONTA BLOQUEADA POR SEGURANÇA',
        reported_telegram: '⚠️ ALERTA CONSULTIVO ENVIADO',
        logged: '📝 INCIDENTE REGISTRADO',
    };

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let message = `🛡️ *FOTOCLIC SENTINEL AI - ALERTA DE SEGURANÇA*\n\n`;
    message += `*Severidade:* ${severityEmojis[severity] || severity.toUpperCase()}\n`;
    message += `*Evento:* \`${eventType}\`\n`;
    message += `*Origem (IP):* \`${ipAddress || 'Não identificado'}\`\n`;
    message += `*Rota / Alvo:* \`${endpoint || '/api'}\`\n`;
    message += `*Data/Hora:* \`${now}\`\n\n`;

    if (diagnosis) {
        message += `🧠 *Diagnóstico da IA:*\n_${diagnosis}_\n\n`;
    }

    if (remediation) {
        message += `💡 *Solução / Recomendações:*\n${remediation}\n\n`;
    }

    message += `⚡ *Ação Executada:* ${actionEmojis[actionTaken] || actionTaken}\n`;

    // Inline Keyboard Buttons for 1-Click Action in Telegram
    const inlineKeyboard = {
        inline_keyboard: [
            [
                { text: '🚫 Banir IP', callback_data: `ban_${ipAddress}` },
                { text: '🔓 Desbloquear IP', callback_data: `unban_${ipAddress}` }
            ],
            [
                { text: '🖥️ Acessar Painel FotoClic', url: 'https://fotoclic.com.br/admin' }
            ]
        ]
    };

    try {
        const url = `https://api.telegram.org/bot${finalToken}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: finalChatId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard,
            })
        });
        const json = await res.json();
        return json.ok;
    } catch (err) {
        console.error('[Sentinel Telegram] Error sending message:', err.message);
        return false;
    }
}

// Generate AI Diagnosis using Google Gemini (fallback to structured rules if unavailable)
async function generateAiDiagnosis(eventType, severity, payload, endpoint) {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (geminiKey) {
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `Você é o Sentinel AI, o analista sênior de cibersegurança do FotoClic Marketplace.
Analise a seguinte tentativa de ataque e retorne um JSON estrito com dois campos: "diagnosis" (explicação clara e direta em 2 frases sobre o que o hacker tentou fazer) e "remediation" (1 a 2 passos práticos para o administrador).

Tipo de Evento: ${eventType}
Severidade: ${severity}
Rota: ${endpoint}
Payload Detectado: ${JSON.stringify(payload)}

Responda APENAS com o JSON:
{"diagnosis": "...", "remediation": "..."}`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const cleanJson = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
                diagnosis: parsed.diagnosis,
                remediation: parsed.remediation,
            };
        } catch (e) {
            console.warn('[Sentinel Gemini] Fallback heuristic:', e.message);
        }
    }

    // Heuristic Fallback
    const heuristics = {
        sql_injection: {
            diagnosis: 'O invasor tentou injetar comandos SQL maliciosos na consulta para extrair dados ou burlar a autenticação.',
            remediation: 'Mantenha as políticas RLS ativas e garanta que todas as consultas usem parâmetros tipados.',
        },
        xss_attempt: {
            diagnosis: 'Tentativa de injeção de scripts JavaScript maliciosos (XSS) no formulário para roubar sessões de usuários.',
            remediation: 'Sanitização automática de inputs está ativa. O IP de origem foi registrado.',
        },
        brute_force: {
            diagnosis: 'Múltiplas falhas sucessivas de login em curto intervalo, caracterizando ataque de força bruta por dicionário.',
            remediation: 'Recomenda-se manter o bloqueio temporário do IP e notificar o titular da conta se necessário.',
        },
        unauthorized_role_change: {
            diagnosis: 'Tentativa de elevação não autorizada de privilégios para Administrador na tabela de usuários.',
            remediation: 'Revogue imediatamente tokens do usuário suspeito e verifique os logs de auditoria.',
        },
        payment_tampering: {
            diagnosis: 'Tentativa de manipular valores de checkout ou falsificar confirmações de webhook da Appmax.',
            remediation: 'A assinatura criptográfica do gateway rejeitou a requisição adulterada.',
        },
        scanner_detected: {
            diagnosis: 'Robô ou scanner automatizado (ex: Gobuster/Nmap) buscando arquivos confidenciais (.env, config, wp-admin).',
            remediation: 'O IP foi neutralizado pelo Sentinel Shield com resposta 403.',
        },
    };

    return heuristics[eventType] || {
        diagnosis: `Comportamento anômalo detectado na rota ${endpoint}.`,
        remediation: 'Monitore o histórico de acessos deste IP no painel administrativo.',
    };
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const supabase = getSupabase();
    const action = req.query.action || req.body?.action;

    try {
        // 1. REPORT THREAT (Usado internamente e por middlewares)
        if (action === 'reportThreat') {
            const {
                eventType,
                severity = 'medium',
                ipAddress,
                userId,
                endpoint,
                requestMethod = 'GET',
                payloadSummary = {},
            } = req.body;

            if (!eventType) {
                return res.status(400).json({ error: 'eventType is required' });
            }

            // Buscar configurações ativas
            const { data: settings } = await supabase
                .from('security_settings')
                .select('*')
                .eq('id', 1)
                .single();

            // Gerar diagnóstico com IA
            const { diagnosis, remediation } = await generateAiDiagnosis(
                eventType,
                severity,
                payloadSummary,
                endpoint
            );

            let actionTaken = 'logged';

            // Decisão de Auto-Ban
            const shouldAutoBan = (settings?.auto_ban_enabled && (severity === 'critical' || severity === 'high')) || eventType === 'sql_injection' || eventType === 'unauthorized_role_change';

            if (shouldAutoBan && ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
                await supabase.from('banned_ips').upsert({
                    ip_address: ipAddress,
                    reason: `Auto-ban Sentinel: ${eventType} (${severity})`,
                    banned_by: 'Sentinel AI Engine',
                    is_active: true,
                    created_at: new Date().toISOString(),
                });
                actionTaken = 'auto_banned_ip';
            } else if (severity === 'medium' || severity === 'high') {
                actionTaken = 'blocked_request';
            }

            // Inserir Log no Banco
            const { data: logData, error: logError } = await supabase
                .from('security_logs')
                .insert({
                    event_type: eventType,
                    severity,
                    ip_address: ipAddress,
                    user_id: userId || null,
                    endpoint,
                    request_method: requestMethod,
                    payload_summary: payloadSummary,
                    ai_diagnosis: diagnosis,
                    ai_remediation: remediation,
                    action_taken: actionTaken,
                })
                .select()
                .single();

            // Enviar Alerta no Telegram se configurado
            if (settings?.telegram_alerts_enabled && settings?.telegram_bot_token && settings?.telegram_chat_id) {
                await sendTelegramAlert({
                    botToken: settings.telegram_bot_token,
                    chatId: settings.telegram_chat_id,
                    title: 'Tentativa de Ataque Detectada',
                    severity,
                    eventType,
                    ipAddress,
                    endpoint,
                    diagnosis,
                    remediation,
                    actionTaken,
                    logId: logData?.id,
                });
            }

            return res.json({
                success: true,
                actionTaken,
                diagnosis,
                remediation,
                logId: logData?.id,
            });
        }

        // 2. GET STATS (Para Dashboard Admin)
        if (action === 'getStats') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: totalLogs } = await supabase
                .from('security_logs')
                .select('id', { count: 'exact', head: true });

            const { count: attacksToday } = await supabase
                .from('security_logs')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            const { count: criticalThreats } = await supabase
                .from('security_logs')
                .select('id', { count: 'exact', head: true })
                .in('severity', ['critical', 'high']);

            const { count: activeBans } = await supabase
                .from('banned_ips')
                .select('ip_address', { count: 'exact', head: true })
                .eq('is_active', true);

            const { data: recentEvents } = await supabase
                .from('security_logs')
                .select('event_type, severity')
                .order('created_at', { ascending: false })
                .limit(100);

            const typeCounts = {};
            (recentEvents || []).forEach(e => {
                typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
            });

            return res.json({
                success: true,
                stats: {
                    totalLogs: totalLogs || 0,
                    attacksToday: attacksToday || 0,
                    criticalThreats: criticalThreats || 0,
                    activeBans: activeBans || 0,
                    typeBreakdown: typeCounts,
                }
            });
        }

        // 3. GET LOGS (Para Tabela do Dashboard Admin)
        if (action === 'getLogs') {
            const limit = parseInt(req.query.limit || '50', 10);
            const { data: logs, error } = await supabase
                .from('security_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return res.json({ success: true, logs });
        }

        // 4. GET BANNED IPS
        if (action === 'getBannedIps') {
            const { data: bans, error } = await supabase
                .from('banned_ips')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.json({ success: true, bans });
        }

        // 5. BAN IP
        if (action === 'banIp') {
            const { ipAddress, reason = 'Bloqueio manual pelo Administrador' } = req.body;
            if (!ipAddress) return res.status(400).json({ error: 'ipAddress is required' });

            await supabase.from('banned_ips').upsert({
                ip_address: ipAddress,
                reason,
                banned_by: 'Admin',
                is_active: true,
                created_at: new Date().toISOString(),
            });

            return res.json({ success: true, message: `IP ${ipAddress} banido com sucesso.` });
        }

        // 6. UNBAN IP
        if (action === 'unbanIp') {
            const { ipAddress } = req.body;
            if (!ipAddress) return res.status(400).json({ error: 'ipAddress is required' });

            await supabase.from('banned_ips').update({ is_active: false }).eq('ip_address', ipAddress);
            return res.json({ success: true, message: `IP ${ipAddress} desbanido com sucesso.` });
        }

        // 7. GET / UPDATE SETTINGS
        if (action === 'getSettings') {
            const { data: settings } = await supabase
                .from('security_settings')
                .select('*')
                .eq('id', 1)
                .single();
            return res.json({ success: true, settings });
        }

        if (action === 'updateSettings') {
            const {
                telegram_bot_token,
                telegram_chat_id,
                telegram_alerts_enabled,
                auto_ban_enabled,
                max_failed_logins,
                rate_limit_rpm,
            } = req.body;

            const { data: updated, error } = await supabase
                .from('security_settings')
                .upsert({
                    id: 1,
                    telegram_bot_token,
                    telegram_chat_id,
                    telegram_alerts_enabled: Boolean(telegram_alerts_enabled),
                    auto_ban_enabled: Boolean(auto_ban_enabled),
                    max_failed_logins: Number(max_failed_logins || 5),
                    rate_limit_rpm: Number(rate_limit_rpm || 120),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return res.json({ success: true, settings: updated });
        }

        // 8. TEST TELEGRAM ALERT
        if (action === 'testTelegram') {
            const { botToken, chatId } = req.body || {};
            const success = await sendTelegramAlert({
                botToken,
                chatId,
                title: 'Teste de Integração Sentinel AI',
                severity: 'low',
                eventType: 'sentinel_test_connection',
                ipAddress: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
                endpoint: '/admin/security-test',
                diagnosis: 'Teste de conectividade bem-sucedido! O FotoClic Sentinel AI está pronto para vigiar e proteger seu sistema 24/7.',
                remediation: 'Nenhuma ação necessária. Seu canal de alertas no Telegram está 100% operacional.',
                actionTaken: 'logged',
            });

            if (!success) {
                return res.status(400).json({ error: 'Falha ao enviar mensagem para o Telegram. Verifique o Token do Bot e o Chat ID.' });
            }

            return res.json({ success: true, message: 'Mensagem de teste enviada com sucesso no Telegram!' });
        }

        // 9. TELEGRAM WEBHOOK (Interação direta pelo Telegram)
        if (action === 'telegramWebhook') {
            const callbackQuery = req.body?.callback_query;
            if (callbackQuery) {
                const data = callbackQuery.data || '';
                const chatId = callbackQuery.message?.chat?.id;

                const { data: settings } = await supabase
                    .from('security_settings')
                    .select('telegram_bot_token')
                    .eq('id', 1)
                    .single();

                const botToken = settings?.telegram_bot_token;

                if (data.startsWith('ban_')) {
                    const ip = data.replace('ban_', '');
                    await supabase.from('banned_ips').upsert({
                        ip_address: ip,
                        reason: 'Banido manualmente via Bot do Telegram',
                        banned_by: 'Admin via Telegram',
                        is_active: true,
                        created_at: new Date().toISOString(),
                    });

                    if (botToken) {
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: `✅ *IP ${ip} foi BANIDO com sucesso pelo Telegram.*`,
                                parse_mode: 'Markdown',
                            })
                        });
                    }
                } else if (data.startsWith('unban_')) {
                    const ip = data.replace('unban_', '');
                    await supabase.from('banned_ips').update({ is_active: false }).eq('ip_address', ip);

                    if (botToken) {
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: `🔓 *IP ${ip} foi DESBANIDO pelo Telegram.*`,
                                parse_mode: 'Markdown',
                            })
                        });
                    }
                }
            }
            return res.json({ ok: true });
        }

        return res.status(400).json({ error: 'Ação do Sentinel inválida' });

    } catch (err) {
        console.error('[Sentinel Error]:', err);
        return res.status(500).json({ error: err.message || 'Erro interno no Sentinel' });
    }
}
