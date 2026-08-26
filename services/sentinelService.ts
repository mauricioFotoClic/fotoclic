import { supabase } from './supabaseClient';

export interface SecurityLog {
    id: string;
    event_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip_address?: string;
    user_id?: string;
    endpoint?: string;
    request_method?: string;
    payload_summary?: Record<string, any>;
    ai_diagnosis?: string;
    ai_remediation?: string;
    action_taken: string;
    created_at: string;
}

export interface BannedIp {
    ip_address: string;
    reason: string;
    banned_by: string;
    is_active: boolean;
    expires_at?: string;
    created_at: string;
}

export interface SecuritySettings {
    id?: number;
    telegram_bot_token?: string;
    telegram_chat_id?: string;
    telegram_alerts_enabled: boolean;
    auto_ban_enabled: boolean;
    max_failed_logins: number;
    rate_limit_rpm: number;
    notification_min_severity: string;
}

export interface SecurityStats {
    totalLogs: number;
    attacksToday: number;
    criticalThreats: number;
    activeBans: number;
    typeBreakdown: Record<string, number>;
}

const API_BASE = '';

export const sentinelService = {
    async getStats(): Promise<SecurityStats> {
        const res = await fetch(`${API_BASE}/api/sentinel?action=getStats`);
        if (!res.ok) throw new Error('Falha ao carregar estatísticas do Sentinel');
        const data = await res.json();
        return data.stats;
    },

    async getLogs(limit = 50): Promise<SecurityLog[]> {
        const res = await fetch(`${API_BASE}/api/sentinel?action=getLogs&limit=${limit}`);
        if (!res.ok) throw new Error('Falha ao carregar logs de segurança');
        const data = await res.json();
        return data.logs || [];
    },

    async getBannedIps(): Promise<BannedIp[]> {
        const res = await fetch(`${API_BASE}/api/sentinel?action=getBannedIps`);
        if (!res.ok) throw new Error('Falha ao carregar lista de IPs banidos');
        const data = await res.json();
        return data.bans || [];
    },

    async banIp(ipAddress: string, reason: string): Promise<void> {
        const res = await fetch(`${API_BASE}/api/sentinel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'banIp', ipAddress, reason }),
        });
        if (!res.ok) throw new Error('Falha ao banir IP');
    },

    async unbanIp(ipAddress: string): Promise<void> {
        const res = await fetch(`${API_BASE}/api/sentinel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unbanIp', ipAddress }),
        });
        if (!res.ok) throw new Error('Falha ao desbanir IP');
    },

    async getSettings(): Promise<SecuritySettings> {
        const res = await fetch(`${API_BASE}/api/sentinel?action=getSettings`);
        if (!res.ok) throw new Error('Falha ao carregar configurações de segurança');
        const data = await res.json();
        return data.settings || {
            telegram_alerts_enabled: true,
            auto_ban_enabled: true,
            max_failed_logins: 5,
            rate_limit_rpm: 120,
            notification_min_severity: 'medium',
        };
    },

    async updateSettings(settings: Partial<SecuritySettings>): Promise<void> {
        const res = await fetch(`${API_BASE}/api/sentinel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateSettings', ...settings }),
        });
        if (!res.ok) throw new Error('Falha ao salvar configurações de segurança');
    },

    async testTelegram(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
        const res = await fetch(`${API_BASE}/api/sentinel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'testTelegram', botToken, chatId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha no teste do Telegram');
        return data;
    },

    // Inspecionar e relatar ameaça no cliente (ex: injeção em formulário)
    async reportClientThreat(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', payload: Record<string, any>, endpoint = window.location.pathname) {
        try {
            await fetch(`${API_BASE}/api/sentinel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reportThreat',
                    eventType,
                    severity,
                    endpoint,
                    payloadSummary: payload,
                }),
            });
        } catch (e) {
            console.warn('[Sentinel Client] Failed to report threat:', e);
        }
    }
};
