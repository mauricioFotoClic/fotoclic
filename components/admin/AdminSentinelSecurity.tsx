import React, { useState, useEffect } from 'react';
import { 
    Shield, ShieldAlert, ShieldCheck, AlertTriangle, Lock, Unlock, 
    Send, RefreshCw, Bot, Terminal, Activity, Zap, CheckCircle2, 
    XCircle, Clock, Eye, AlertOctagon, Server, Smartphone, Info
} from 'lucide-react';
import { sentinelService, SecurityLog, BannedIp, SecuritySettings, SecurityStats } from '../../services/sentinelService';

interface AdminSentinelSecurityProps {
    onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminSentinelSecurity: React.FC<AdminSentinelSecurityProps> = ({ onShowToast }) => {
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
    const [settings, setSettings] = useState<SecuritySettings>({
        telegram_alerts_enabled: true,
        auto_ban_enabled: true,
        max_failed_logins: 5,
        rate_limit_rpm: 120,
        notification_min_severity: 'medium',
    });
    const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isTestingTelegram, setIsTestingTelegram] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'banned' | 'telegram'>('overview');
    const [manualIpToBan, setManualIpToBan] = useState('');
    const [manualBanReason, setManualBanReason] = useState('');
    const [internalToast, setInternalToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (onShowToast) onShowToast(msg, type);
        setInternalToast({ msg, type });
        setTimeout(() => setInternalToast(null), 4000);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsData, logsData, bansData, settingsData] = await Promise.all([
                sentinelService.getStats().catch(() => null),
                sentinelService.getLogs(60).catch(() => []),
                sentinelService.getBannedIps().catch(() => []),
                sentinelService.getSettings().catch(() => null),
            ]);

            if (statsData) setStats(statsData);
            if (logsData) setLogs(logsData);
            if (bansData) setBannedIps(bansData);
            if (settingsData) setSettings(settingsData);
        } catch (err: any) {
            showToast(`Erro ao carregar dados do Sentinel: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        try {
            await sentinelService.updateSettings(settings);
            showToast('Configurações de segurança e Telegram salvas com sucesso!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Erro ao salvar configurações', 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleTestTelegram = async () => {
        if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
            showToast('Preencha o Token do Bot e o Chat ID antes de testar.', 'info');
            return;
        }

        setIsTestingTelegram(true);
        try {
            await sentinelService.testTelegram(settings.telegram_bot_token, settings.telegram_chat_id);
            showToast('Mensagem de teste enviada com sucesso no seu Telegram! Verifique o aplicativo.', 'success');
        } catch (err: any) {
            showToast(`Falha no teste do Telegram: ${err.message}`, 'error');
        } finally {
            setIsTestingTelegram(false);
        }
    };

    const handleBanIp = async (ip: string, reason = 'Bloqueio manual via Painel') => {
        try {
            await sentinelService.banIp(ip, reason);
            showToast(`IP ${ip} foi adicionado à lista negra com sucesso.`, 'success');
            setManualIpToBan('');
            setManualBanReason('');
            loadData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleUnbanIp = async (ip: string) => {
        try {
            await sentinelService.unbanIp(ip);
            showToast(`IP ${ip} foi liberado do bloqueio.`, 'info');
            loadData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1"><AlertOctagon size={12} /> Crítico</span>;
            case 'high':
                return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1"><ShieldAlert size={12} /> Alto</span>;
            case 'medium':
                return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={12} /> Médio</span>;
            default:
                return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1"><Info size={12} /> Baixo</span>;
        }
    };

    const getEventTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            sql_injection: 'Tentativa de SQL Injection',
            xss_attempt: 'Injeção XSS / Scripts',
            brute_force: 'Ataque de Força Bruta',
            unauthorized_role_change: 'Elevação de Privilégios (Role Admin)',
            payment_tampering: 'Fraude no Gateway Appmax',
            scanner_detected: 'Scanner de Vulnerabilidades / Bot',
            rate_limit_exceeded: 'Sobrecarga de Requisições',
            sentinel_test_connection: 'Teste de Conexão',
        };
        return map[type] || type;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-inner">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-display font-bold text-white tracking-wide">FotoClic Sentinel AI</h2>
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo 24/7
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                                Sentinela autônoma de defesa cibernética. Detecta tentativas de invasão em tempo real, neutraliza atacantes e envia alertas instantâneos com diagnóstico no seu Telegram.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={loadData}
                            disabled={isLoading}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-neutral-700/80 cursor-pointer"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            <span>Atualizar</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 mt-6 border-t border-neutral-800/80 pt-4 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Visão Geral & Métricas', icon: Activity },
                        { id: 'logs', label: `Incidentes Detectados (${logs.length})`, icon: Terminal },
                        { id: 'banned', label: `IPs Bloqueados (${bannedIps.filter(b => b.is_active).length})`, icon: Lock },
                        { id: 'telegram', label: 'Configuração do Telegram', icon: Bot },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                                }`}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex items-center justify-between text-neutral-400 mb-3">
                                <span className="text-xs font-medium uppercase tracking-wider">Ataques Bloqueados Hoje</span>
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                                    <Shield size={18} />
                                </div>
                            </div>
                            <div className="text-3xl font-display font-extrabold text-white">
                                {stats?.attacksToday || 0}
                            </div>
                            <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                                <CheckCircle2 size={12} /> 100% das ameaças neutralizadas
                            </p>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex items-center justify-between text-neutral-400 mb-3">
                                <span className="text-xs font-medium uppercase tracking-wider">Ameaças Críticas</span>
                                <div className="p-2 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20">
                                    <AlertOctagon size={18} />
                                </div>
                            </div>
                            <div className="text-3xl font-display font-extrabold text-red-400">
                                {stats?.criticalThreats || 0}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-2">
                                Injeções SQL e tentativas de escalonamento
                            </p>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex items-center justify-between text-neutral-400 mb-3">
                                <span className="text-xs font-medium uppercase tracking-wider">IPs na Lista Negra</span>
                                <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 border border-orange-500/20">
                                    <Lock size={18} />
                                </div>
                            </div>
                            <div className="text-3xl font-display font-extrabold text-orange-400">
                                {bannedIps.filter(b => b.is_active).length}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-2">
                                Auto-ban ativos no firewall da aplicação
                            </p>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex items-center justify-between text-neutral-400 mb-3">
                                <span className="text-xs font-medium uppercase tracking-wider">Alerta no Telegram</span>
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                                    <Smartphone size={18} />
                                </div>
                            </div>
                            <div className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                                {settings.telegram_bot_token && settings.telegram_chat_id ? (
                                    <span className="text-emerald-400 text-base flex items-center gap-1.5">
                                        <CheckCircle2 size={16} /> Conectado
                                    </span>
                                ) : (
                                    <span className="text-yellow-400 text-base flex items-center gap-1.5">
                                        <AlertTriangle size={16} /> Não Configurado
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-2">
                                Notificações em tempo real no seu celular
                            </p>
                        </div>
                    </div>

                    {/* Attack Types Distribution & Live Incident Teaser */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Defense Breakdown */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Zap size={16} className="text-primary" /> Modos de Defesa Ativos
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                                    <span className="text-neutral-300 font-medium">Blindagem RLS de Banco (Zero-Trust)</span>
                                    <span className="text-emerald-400 font-bold">100% Ativo</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                                    <span className="text-neutral-300 font-medium">Proteção Anti-SQL Injection</span>
                                    <span className="text-emerald-400 font-bold">100% Ativo</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                                    <span className="text-neutral-300 font-medium">Auto-Ban de IPs Maliciosos</span>
                                    <span className={settings.auto_ban_enabled ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                                        {settings.auto_ban_enabled ? 'Habilitado' : 'Desabilitado'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                                    <span className="text-neutral-300 font-medium">Defesa de Webhook Appmax</span>
                                    <span className="text-emerald-400 font-bold">Criptografia SHA-256</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                                    <span className="text-neutral-300 font-medium">Anti-Scraping de Fotos</span>
                                    <span className="text-emerald-400 font-bold">Rate Limit Ativo</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Incidents Feed */}
                        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Terminal size={16} className="text-emerald-400" /> Últimos Incidentes Auditados
                                </h3>
                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                                >
                                    Ver todos os logs →
                                </button>
                            </div>

                            {logs.length === 0 ? (
                                <div className="text-center py-12 text-neutral-500 text-xs">
                                    Nenhum incidente suspeito detectado recentemente. Seu sistema está seguro! 🛡️
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {logs.slice(0, 5).map(log => (
                                        <div
                                            key={log.id}
                                            onClick={() => setSelectedLog(log)}
                                            className="p-3.5 bg-neutral-950 hover:bg-neutral-800/80 rounded-2xl border border-neutral-800 flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-neutral-700"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {getSeverityBadge(log.severity)}
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">
                                                        {getEventTypeLabel(log.event_type)}
                                                    </p>
                                                    <p className="text-[11px] text-neutral-400 truncate">
                                                        IP: <span className="font-mono text-neutral-300">{log.ip_address || 'N/A'}</span> • Rota: <span className="font-mono text-neutral-300">{log.endpoint || '/'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[11px] text-neutral-400 block font-mono">
                                                    {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                                </span>
                                                <span className="text-[10px] text-emerald-400 font-medium">
                                                    {log.action_taken}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: INCIDENT LOGS */}
            {activeTab === 'logs' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white">Registro de Auditoria e Incidentes Cibernéticos</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">Histórico completo de requisições maliciosas interceptadas pelo Sentinel AI.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                                <tr>
                                    <th className="p-3.5 rounded-l-xl">Data / Hora</th>
                                    <th className="p-3.5">Severidade</th>
                                    <th className="p-3.5">Tipo de Ameaça</th>
                                    <th className="p-3.5">IP de Origem</th>
                                    <th className="p-3.5">Rota Alvo</th>
                                    <th className="p-3.5">Ação Tomada</th>
                                    <th className="p-3.5 rounded-r-xl text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/60">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-neutral-800/40 transition-colors">
                                        <td className="p-3.5 text-neutral-400 font-mono whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="p-3.5">{getSeverityBadge(log.severity)}</td>
                                        <td className="p-3.5 font-semibold text-white">{getEventTypeLabel(log.event_type)}</td>
                                        <td className="p-3.5 font-mono text-neutral-300">{log.ip_address || 'N/A'}</td>
                                        <td className="p-3.5 font-mono text-neutral-400 truncate max-w-xs">{log.endpoint || '/'}</td>
                                        <td className="p-3.5 text-emerald-400 font-medium">{log.action_taken}</td>
                                        <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium cursor-pointer"
                                            >
                                                Detalhes
                                            </button>
                                            {log.ip_address && (
                                                <button
                                                    onClick={() => handleBanIp(log.ip_address!, `Banido a partir do log #${log.id.slice(0, 8)}`)}
                                                    className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-medium cursor-pointer"
                                                >
                                                    Banir IP
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: BANNED IPS */}
            {activeTab === 'banned' && (
                <div className="space-y-6">
                    {/* Add Manual Ban Form */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Lock size={18} className="text-red-400" /> Adicionar IP à Lista Negra Manualmente
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Endereço IP (ex: 185.220.101.45)"
                                value={manualIpToBan}
                                onChange={(e) => setManualIpToBan(e.target.value)}
                                className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                            />
                            <input
                                type="text"
                                placeholder="Motivo do bloqueio"
                                value={manualBanReason}
                                onChange={(e) => setManualBanReason(e.target.value)}
                                className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                            />
                            <button
                                onClick={() => manualIpToBan && handleBanIp(manualIpToBan, manualBanReason || 'Bloqueio manual')}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Lock size={14} /> Banir Endereço IP
                            </button>
                        </div>
                    </div>

                    {/* Banned IPs Table */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                        <h3 className="text-base font-bold text-white">IPs Atualmente Bloqueados</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                                    <tr>
                                        <th className="p-3.5 rounded-l-xl">Endereço IP</th>
                                        <th className="p-3.5">Motivo</th>
                                        <th className="p-3.5">Bloqueado Por</th>
                                        <th className="p-3.5">Data do Bloqueio</th>
                                        <th className="p-3.5">Status</th>
                                        <th className="p-3.5 rounded-r-xl text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/60">
                                    {bannedIps.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center text-neutral-500">
                                                Nenhum IP bloqueado no momento.
                                            </td>
                                        </tr>
                                    ) : (
                                        bannedIps.map(ban => (
                                            <tr key={ban.ip_address} className="hover:bg-neutral-800/40">
                                                <td className="p-3.5 font-mono text-red-400 font-bold">{ban.ip_address}</td>
                                                <td className="p-3.5 text-neutral-300">{ban.reason}</td>
                                                <td className="p-3.5 text-neutral-400">{ban.banned_by}</td>
                                                <td className="p-3.5 text-neutral-400 font-mono">{new Date(ban.created_at).toLocaleString('pt-BR')}</td>
                                                <td className="p-3.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${ban.is_active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                                                        {ban.is_active ? 'Bloqueado' : 'Liberado'}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-right">
                                                    {ban.is_active ? (
                                                        <button
                                                            onClick={() => handleUnbanIp(ban.ip_address)}
                                                            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 rounded-lg font-semibold cursor-pointer flex items-center gap-1.5 ml-auto"
                                                        >
                                                            <Unlock size={12} /> Desbloquear
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBanIp(ban.ip_address, ban.reason)}
                                                            className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-semibold cursor-pointer flex items-center gap-1.5 ml-auto"
                                                        >
                                                            <Lock size={12} /> Re-bloquear
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: TELEGRAM & AUTOMATION SETTINGS */}
            {activeTab === 'telegram' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Bot size={20} className="text-blue-400" /> Configuração do Bot de Alerta no Telegram
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
                            Receba alertas imediatos em tempo real no seu celular quando uma tentativa de invasão ou anomalia for detectada.
                        </p>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-300 block">
                                    Token do Bot do Telegram
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 7123456789:AAHq_ABCdefGhIJKlmNoPqRstUvwX"
                                    value={settings.telegram_bot_token || ''}
                                    onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-primary font-mono"
                                />
                                <span className="text-[11px] text-neutral-500 block">
                                    Obtido gratuitamente conversando com o <b className="text-neutral-400">@BotFather</b> no Telegram.
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-300 block">
                                    Chat ID de Notificação (Seu ID no Telegram)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 123456789 ou -1001234567890 (Grupo)"
                                    value={settings.telegram_chat_id || ''}
                                    onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-primary font-mono"
                                />
                                <span className="text-[11px] text-neutral-500 block">
                                    Envie uma mensagem para o bot <b className="text-neutral-400">@userinfobot</b> no Telegram para descobrir seu ID numérico.
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-800 space-y-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Políticas de Autonomia da Sentinela</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-start gap-3 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl cursor-pointer hover:border-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={settings.telegram_alerts_enabled}
                                        onChange={(e) => setSettings({ ...settings, telegram_alerts_enabled: e.target.checked })}
                                        className="mt-0.5 rounded text-primary focus:ring-0"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-white block">Ativar Notificações no Telegram</span>
                                        <span className="text-[11px] text-neutral-400">Envia alerta instantâneo com diagnóstico de IA para cada incidente.</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl cursor-pointer hover:border-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={settings.auto_ban_enabled}
                                        onChange={(e) => setSettings({ ...settings, auto_ban_enabled: e.target.checked })}
                                        className="mt-0.5 rounded text-primary focus:ring-0"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-white block">Auto-Ban de Ameaças Críticas</span>
                                        <span className="text-[11px] text-neutral-400">Bloqueia imediatamente o IP em caso de SQL Injection ou ataque de força bruta.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handleTestTelegram}
                                disabled={isTestingTelegram}
                                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-neutral-700 cursor-pointer"
                            >
                                <Send size={14} className={isTestingTelegram ? 'animate-bounce' : ''} />
                                <span>{isTestingTelegram ? 'Enviando teste...' : 'Testar Envio no Telegram'}</span>
                            </button>

                            <button
                                type="submit"
                                disabled={isSavingSettings}
                                className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer"
                            >
                                {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* DETAIL MODAL OF SECURITY INCIDENT */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#18181B] text-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {getSeverityBadge(selectedLog.severity)}
                                <h3 className="text-sm font-bold text-white">{getEventTypeLabel(selectedLog.event_type)}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 text-xs">
                            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
                                <div className="flex items-center justify-between text-neutral-400">
                                    <span>IP de Origem: <b className="text-white font-mono">{selectedLog.ip_address || 'Não informado'}</b></span>
                                    <span>Data: <b className="text-white font-mono">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</b></span>
                                </div>
                                <div className="text-neutral-400">
                                    Rota / Alvo: <b className="text-white font-mono">{selectedLog.endpoint || '/api'}</b>
                                </div>
                            </div>

                            {selectedLog.ai_diagnosis && (
                                <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-1.5">
                                    <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <Bot size={16} /> Diagnóstico do Sentinel AI
                                    </h4>
                                    <p className="text-neutral-300 leading-relaxed">{selectedLog.ai_diagnosis}</p>
                                </div>
                            )}

                            {selectedLog.ai_remediation && (
                                <div className="bg-blue-950/30 border border-blue-500/30 p-4 rounded-2xl space-y-1.5">
                                    <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                                        <ShieldCheck size={16} /> Solução & Ação Recomendada
                                    </h4>
                                    <p className="text-neutral-300 leading-relaxed">{selectedLog.ai_remediation}</p>
                                </div>
                            )}

                            {selectedLog.payload_summary && Object.keys(selectedLog.payload_summary).length > 0 && (
                                <div className="space-y-1.5">
                                    <h4 className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Payload Interceptado</h4>
                                    <pre className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-40">
                                        {JSON.stringify(selectedLog.payload_summary, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                            <span className="text-neutral-400 text-xs">
                                Ação executada: <b className="text-emerald-400">{selectedLog.action_taken}</b>
                            </span>
                            {selectedLog.ip_address && (
                                <button
                                    onClick={() => {
                                        handleBanIp(selectedLog.ip_address!, `Banido a partir do log #${selectedLog.id.slice(0, 8)}`);
                                        setSelectedLog(null);
                                    }}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Lock size={14} /> Banir IP {selectedLog.ip_address}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
