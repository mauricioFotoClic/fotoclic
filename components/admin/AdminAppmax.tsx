import React, { useState, useEffect, useMemo } from 'react';
import {
    RefreshCw, DollarSign, CreditCard, QrCode, Users, ShieldCheck,
    AlertCircle, CheckCircle, ExternalLink, Search, Filter, Copy,
    Check, ArrowUpRight, TrendingUp, Wallet, ArrowDownRight, Eye,
    Calendar, CheckCircle2, Clock, XCircle, Info, HelpCircle,
    ChevronLeft, ChevronRight, SlidersHorizontal, Lock, Zap
} from 'lucide-react';
import api from '../../services/api';
import Spinner from '../Spinner';

type AppmaxTab = 'overview' | 'orders' | 'split' | 'withdrawals' | 'settings';

const AdminAppmax: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AppmaxTab>('overview');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Filters for Orders
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'approved' | 'refunded'>('ALL');
    const [methodFilter, setMethodFilter] = useState<'ALL' | 'pix' | 'card'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Selected Transaction for Detail Modal
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    // Syncing Recipient State
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAppmaxStats();
            setStats(data);
        } catch (err: any) {
            console.error("Erro ao carregar dados Appmax:", err);
            setError(err.message || "Não foi possível carregar as métricas da Appmax.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const formatCurrency = (val: number) => {
        return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2500);
    };

    const handleCopyWebhook = () => {
        if (stats?.webhookUrl) {
            navigator.clipboard.writeText(stats.webhookUrl);
            setCopiedWebhook(true);
            setTimeout(() => setCopiedWebhook(false), 2500);
        }
    };

    const handleSyncRecipient = async (photog: any) => {
        setSyncingId(photog.id);
        setSyncSuccess(null);
        try {
            await api.syncAppmaxRecipient({
                document: photog.cpf_cnpj || '00000000000',
                pix_key: photog.pix_key
            });
            setSyncSuccess(`Recebedor ${photog.name} sincronizado com sucesso na Appmax!`);
            setTimeout(() => setSyncSuccess(null), 4000);
            await loadStats();
        } catch (err: any) {
            alert(`Erro ao sincronizar recebedor: ${err.message}`);
        } finally {
            setSyncingId(null);
        }
    };

    // Filtered orders list
    const filteredOrders = useMemo(() => {
        if (!stats?.recentSales) return [];
        return stats.recentSales.filter((order: any) => {
            // Search query
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q ||
                (order.appmax_order_id && String(order.appmax_order_id).toLowerCase().includes(q)) ||
                (order.buyer?.name && order.buyer.name.toLowerCase().includes(q)) ||
                (order.buyer?.email && order.buyer.email.toLowerCase().includes(q)) ||
                (order.photographer?.name && order.photographer.name.toLowerCase().includes(q)) ||
                (order.photos?.title && order.photos.title.toLowerCase().includes(q));

            // Status filter
            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'approved' && order.status !== 'refunded') ||
                (statusFilter === 'refunded' && order.status === 'refunded');

            // Method filter
            const orderMethod = (order.payment_method || 'pix').toLowerCase();
            const matchesMethod = methodFilter === 'ALL' ||
                (methodFilter === 'pix' && orderMethod === 'pix') ||
                (methodFilter === 'card' && (orderMethod.includes('card') || orderMethod.includes('cart')));

            return matchesSearch && matchesStatus && matchesMethod;
        });
    }, [stats?.recentSales, searchQuery, statusFilter, methodFilter]);

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage]);

    const m = stats?.metrics || {};

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Brand Banner - Appmax Official Style */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-display font-extrabold text-2xl shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
                            A
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                                    Appmax Payments
                                </h1>
                                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-md border border-indigo-500/30 font-mono">
                                    v4 API
                                </span>
                                <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border flex items-center gap-1.5 ${stats?.environment === 'production' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                    <span className="w-2 h-2 rounded-full animate-pulse bg-current"></span>
                                    {stats?.environment === 'production' ? 'Produção' : 'Sandbox (Testes)'}
                                </span>
                            </div>
                            <p className="text-sm text-neutral-400 mt-1">
                                Painel Integrado de Gestão de Vendas, Split de Pagamentos e Recebedores.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={loadStats}
                            disabled={loading}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-2xl border border-neutral-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-400" : "text-indigo-400"} />
                            Sincronizar Dados
                        </button>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1 mt-6 pt-5 border-t border-neutral-800/80 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
                        { id: 'orders', label: 'Lançamentos & Pedidos', icon: CreditCard, count: m.totalOrders },
                        { id: 'split', label: 'Split & Recebedores', icon: Users, count: stats?.photographers?.length },
                        { id: 'withdrawals', label: 'Saques & Liquidações', icon: Wallet },
                        { id: 'settings', label: 'Conexão & Webhooks', icon: Zap }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as AppmaxTab)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                                    }`}
                            >
                                <Icon size={16} className={isActive ? 'text-white' : 'text-neutral-500'} />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-neutral-800 text-neutral-400'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {syncSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in">
                    <CheckCircle size={20} className="shrink-0" />
                    <p>{syncSuccess}</p>
                </div>
            )}

            {/* TAB 1: VISÃO GERAL (OVERVIEW) */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Top KPI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Faturamento Bruto */}
                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Volume Bruto</span>
                                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                                    <DollarSign size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-extrabold text-white">
                                {loading ? "..." : formatCurrency(m.totalVolume)}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-1">{m.approvedCount || 0} pedidos pagos</p>
                        </div>

                        {/* Comissão FotoClic */}
                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Taxa FotoClic (6%)</span>
                                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                                    <ShieldCheck size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-extrabold text-emerald-400">
                                {loading ? "..." : formatCurrency(m.totalCommissions)}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-1">Líquido retido na plataforma</p>
                        </div>

                        {/* Repasse Fotógrafos */}
                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Split Fotógrafos (94%)</span>
                                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                                    <Users size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-extrabold text-purple-300">
                                {loading ? "..." : formatCurrency(m.photographerPayouts)}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-1">Direcionado aos criadores</p>
                        </div>

                        {/* Ticket Médio */}
                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ticket Médio</span>
                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                                    <TrendingUp size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-extrabold text-white">
                                {loading ? "..." : formatCurrency(m.averageTicket)}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-1">Por venda aprovada</p>
                        </div>

                        {/* Taxa de Conversão */}
                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Aprovação</span>
                                <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl">
                                    <CheckCircle2 size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-extrabold text-teal-400">
                                {loading ? "..." : `${(m.approvalRate || 100).toFixed(1)}%`}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-1">Taxa de conversão</p>
                        </div>

                        {/* Reembolsos */}
                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Estornos</span>
                                <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                                    <XCircle size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-extrabold text-neutral-300">
                                {loading ? "..." : formatCurrency(m.refundedAmount)}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-1">{m.refundedCount || 0} cancelamentos</p>
                        </div>
                    </div>

                    {/* Breakdown de Métodos de Pagamento */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PIX vs Cartão */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                            <h3 className="text-base font-bold text-white font-display flex items-center gap-2 mb-4">
                                <CreditCard size={18} className="text-indigo-400" />
                                Distribuição de Meios de Pagamento
                            </h3>

                            <div className="space-y-4">
                                {/* PIX Bar */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span className="flex items-center gap-1.5 text-emerald-400">
                                            <QrCode size={14} /> PIX Instantâneo ({m.pixCount || 0} pedidos)
                                        </span>
                                        <span className="text-white font-mono">{formatCurrency(m.pixVolume)}</span>
                                    </div>
                                    <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                            style={{ width: `${m.totalVolume > 0 ? (m.pixVolume / m.totalVolume) * 100 : 50}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Cartão Bar */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span className="flex items-center gap-1.5 text-indigo-400">
                                            <CreditCard size={14} /> Cartão de Crédito até 21x ({m.cardCount || 0} pedidos)
                                        </span>
                                        <span className="text-white font-mono">{formatCurrency(m.cardVolume)}</span>
                                    </div>
                                    <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                            style={{ width: `${m.totalVolume > 0 ? (m.cardVolume / m.totalVolume) * 100 : 50}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status de Conexão com a Appmax */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white font-display flex items-center gap-2 mb-3">
                                    <Zap size={18} className="text-amber-400" />
                                    Saúde do Conector Appmax
                                </h3>
                                <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                                    A integração do FotoClic utiliza chamadas server-to-server com autenticação OAuth2 e endpoints de split transparentes.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800">
                                <div className="p-3 bg-neutral-950/60 rounded-2xl border border-neutral-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Fotógrafos no Split</span>
                                    <span className="text-lg font-bold text-emerald-400">{m.recipientsActive || 0} Ativos</span>
                                </div>
                                <div className="p-3 bg-neutral-950/60 rounded-2xl border border-neutral-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Ambiente Ativo</span>
                                    <span className="text-lg font-bold text-indigo-400 capitalize">{stats?.environment || 'Sandbox'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: LANÇAMENTOS & PEDIDOS (ORDERS LEDGER) */}
            {activeTab === 'orders' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
                    {/* Header & Filters */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-neutral-800">
                        <div>
                            <h2 className="text-xl font-bold font-display text-white">Lançamentos Financeiros Appmax</h2>
                            <p className="text-xs text-neutral-400 mt-0.5">Histórico completo de pedidos, repartição de split e status de liquidação.</p>
                        </div>

                        {/* Search & Selectors */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por ID, cliente, foto..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e: any) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                <option value="ALL">Todos os Status</option>
                                <option value="approved">Aprovados</option>
                                <option value="refunded">Estornados</option>
                            </select>

                            {/* Method Filter */}
                            <select
                                value={methodFilter}
                                onChange={(e: any) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
                                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                <option value="ALL">Todos os Métodos</option>
                                <option value="pix">PIX</option>
                                <option value="card">Cartão</option>
                            </select>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-300">
                            <thead className="bg-neutral-950/60 text-xs text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                                <tr>
                                    <th className="py-3 px-4">Data/Hora</th>
                                    <th className="py-3 px-4">Pedido Appmax</th>
                                    <th className="py-3 px-4">Comprador</th>
                                    <th className="py-3 px-4">Foto / Fotógrafo</th>
                                    <th className="py-3 px-4">Método</th>
                                    <th className="py-3 px-4 text-right">Valor Total</th>
                                    <th className="py-3 px-4 text-right">FotoClic (6%)</th>
                                    <th className="py-3 px-4 text-right">Fotógrafo (94%)</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/60 text-xs">
                                {paginatedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-neutral-500">
                                            Nenhum lançamento encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedOrders.map((order: any) => {
                                        const isRefunded = order.status === 'refunded';
                                        const photogShare = Math.max(0, (Number(order.price) || 0) - (Number(order.commission) || 0));

                                        return (
                                            <tr key={order.id} className="hover:bg-neutral-800/30 transition-colors">
                                                {/* Data */}
                                                <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">
                                                    {order.sale_date ? new Date(order.sale_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </td>

                                                {/* Pedido Appmax ID */}
                                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                                                    #{order.appmax_order_id || order.id.slice(0, 8)}
                                                </td>

                                                {/* Comprador */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-white truncate max-w-[130px]">{order.buyer?.name || 'Cliente'}</div>
                                                    <div className="text-neutral-500 text-[11px] truncate max-w-[130px]">{order.buyer?.email || '-'}</div>
                                                </td>

                                                {/* Foto & Fotógrafo */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-neutral-200 truncate max-w-[140px]">{order.photos?.title || 'Foto Digital'}</div>
                                                    <div className="text-neutral-500 text-[11px] truncate max-w-[140px]">{order.photographer?.name || '-'}</div>
                                                </td>

                                                {/* Método */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 uppercase font-bold text-neutral-300">
                                                        {(order.payment_method || 'pix').toLowerCase() === 'pix' ? (
                                                            <><QrCode size={13} className="text-emerald-400" /> PIX</>
                                                        ) : (
                                                            <><CreditCard size={13} className="text-indigo-400" /> Cartão {order.installments ? `${order.installments}x` : ''}</>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* Valor Bruto */}
                                                <td className="py-3.5 px-4 text-right font-semibold text-white whitespace-nowrap">
                                                    {formatCurrency(order.price)}
                                                </td>

                                                {/* FotoClic (6%) */}
                                                <td className="py-3.5 px-4 text-right font-semibold text-emerald-400 whitespace-nowrap">
                                                    {formatCurrency(order.commission)}
                                                </td>

                                                {/* Fotógrafo (94%) */}
                                                <td className="py-3.5 px-4 text-right font-semibold text-purple-300 whitespace-nowrap">
                                                    {formatCurrency(photogShare)}
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${isRefunded ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                        {isRefunded ? 'Estornado' : 'Aprovado'}
                                                    </span>
                                                </td>

                                                {/* Detalhes */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors"
                                                        title="Ver detalhes da transação"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                            <span>Mostrando página {currentPage} de {totalPages} ({filteredOrders.length} transações)</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-lg text-white"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-lg text-white"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: SPLIT & RECEBEDORES */}
            {activeTab === 'split' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-neutral-800">
                        <div>
                            <h2 className="text-xl font-bold font-display text-white">Recebedores do Split (Fotógrafos)</h2>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Gerenciamento de contas vinculadas à API v4 da Appmax para repasses automáticos.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                                {m.recipientsActive || 0} Ativos no Split
                            </span>
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">
                                {m.recipientsPending || 0} Pendentes
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-300">
                            <thead className="bg-neutral-950/60 text-xs text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                                <tr>
                                    <th className="py-3 px-4">Fotógrafo</th>
                                    <th className="py-3 px-4">Chave PIX / Documento</th>
                                    <th className="py-3 px-4">ID Recebedor Appmax</th>
                                    <th className="py-3 px-4 text-center">Vendas Totais</th>
                                    <th className="py-3 px-4 text-right">Saldo Líquido Gerado</th>
                                    <th className="py-3 px-4 text-center">Status Split</th>
                                    <th className="py-3 px-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/60 text-xs">
                                {(stats?.photographers || []).map((photog: any) => {
                                    const isSyncing = syncingId === photog.id;
                                    const isActive = photog.appmax_status === 'active';

                                    return (
                                        <tr key={photog.id} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-white">{photog.name}</div>
                                                <div className="text-neutral-500 text-[11px]">{photog.email}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-mono text-neutral-300">{photog.pix_key || <span className="text-neutral-600">Não informada</span>}</div>
                                                <div className="text-neutral-500 text-[10px] uppercase">{photog.pix_key_type || 'PIX'}</div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-indigo-400">
                                                {photog.appmax_recipient_id || <span className="text-neutral-600">Pendente de Onboarding</span>}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-white">
                                                {photog.totalSalesCount || 0}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-semibold text-purple-300">
                                                {formatCurrency(photog.netBalance)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                        <CheckCircle size={12} /> Ativo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                                        <Clock size={12} /> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleSyncRecipient(photog)}
                                                    disabled={isSyncing}
                                                    className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/30 transition-all disabled:opacity-50"
                                                >
                                                    {isSyncing ? "Sincronizando..." : "Sincronizar"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: SAQUES & LIQUIDAÇÕES */}
            {activeTab === 'withdrawals' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-neutral-800">
                        <div>
                            <h2 className="text-xl font-bold font-display text-white">Extrato de Saques & Repasses</h2>
                            <p className="text-xs text-neutral-400 mt-0.5">Histórico de transferências liquidadas para a conta bancária do marketplace e fotógrafos.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-300">
                            <thead className="bg-neutral-950/60 text-xs text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                                <tr>
                                    <th className="py-3 px-4">Data da Solicitação</th>
                                    <th className="py-3 px-4">Destinatário</th>
                                    <th className="py-3 px-4">Chave PIX / Destino</th>
                                    <th className="py-3 px-4 text-right">Valor Líquido</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/60 text-xs">
                                {(stats?.withdrawals || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-neutral-500">
                                            Nenhum saque registrado até o momento.
                                        </td>
                                    </tr>
                                ) : (
                                    (stats?.withdrawals || []).map((w: any) => (
                                        <tr key={w.id} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3.5 px-4 text-neutral-400">
                                                {w.requested_at ? new Date(w.requested_at).toLocaleString('pt-BR') : '-'}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-white">
                                                {w.photographer_name || 'Marketplace FotoClic'}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-neutral-400">
                                                {w.pix_key || 'Conta Principal Appmax'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                                                {formatCurrency(w.amount)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${w.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                    {w.status === 'completed' ? 'Liquidado' : 'Em Processamento'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 5: CONEXÃO & WEBHOOKS */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    {/* Webhook Configuration Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                        <div>
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-md border border-indigo-500/30">
                                Apphook / Webhook
                            </span>
                            <h3 className="text-lg font-bold text-white font-display mt-2">
                                URL Oficial de Notificações
                            </h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                Cadastre esta URL no Painel da Appmax em <strong>Aplicativos &gt; Apphooks</strong> para receber atualizações de pedidos instantaneamente.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                                Webhook Endpoint URL
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={stats?.webhookUrl || 'https://fotoclic.com.br/api/appmax-webhook'}
                                    className="w-full text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-indigo-300 truncate"
                                />
                                <button
                                    onClick={handleCopyWebhook}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all ${copiedWebhook ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500'
                                        }`}
                                >
                                    {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedWebhook ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 space-y-2 text-xs text-neutral-400">
                            <span className="font-bold text-white block">Eventos Mapeados:</span>
                            <ul className="list-disc list-inside space-y-1 text-neutral-400 font-mono text-[11px]">
                                <li><code>order_approved</code> / <code>order_paid</code> &rarr; Libera download em alta resolução</li>
                                <li><code>order_refunded</code> &rarr; Estorna venda e reverte créditos de split</li>
                                <li><code>order_canceled</code> &rarr; Atualiza status do pedido</li>
                            </ul>
                        </div>
                    </div>

                    {/* Sandbox Test Cards Reference */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                        <div>
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-md border border-amber-500/30">
                                Simulador Sandbox
                            </span>
                            <h3 className="text-lg font-bold text-white font-display mt-2">
                                Cartões de Teste Oficiais da Appmax
                            </h3>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                Utilize os seguintes dados no checkout para simular cenários de aprovação e recusa em ambiente de homologação.
                            </p>
                        </div>

                        <div className="space-y-3 text-xs">
                            {/* Card 1: Aprovação Imediata */}
                            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex justify-between items-center">
                                <div>
                                    <span className="font-bold text-emerald-400 block">Aprovação Imediata</span>
                                    <span className="font-mono text-neutral-300 text-[11px]">4000 0000 0000 0001 (CVV: 123)</span>
                                </div>
                                <button
                                    onClick={() => copyToClipboard('4000000000000001', 'c1')}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300"
                                >
                                    {copiedKey === 'c1' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>

                            {/* Card 2: Saldo Insuficiente */}
                            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex justify-between items-center">
                                <div>
                                    <span className="font-bold text-amber-400 block">Recusa (Saldo Insuficiente)</span>
                                    <span className="font-mono text-neutral-300 text-[11px]">4000 0000 0000 0002 (CVV: 123)</span>
                                </div>
                                <button
                                    onClick={() => copyToClipboard('4000000000000002', 'c2')}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300"
                                >
                                    {copiedKey === 'c2' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>

                            {/* Card 3: Suspeita de Fraude */}
                            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex justify-between items-center">
                                <div>
                                    <span className="font-bold text-red-400 block">Recusa (Suspeita de Fraude)</span>
                                    <span className="font-mono text-neutral-300 text-[11px]">4000 0000 0000 0003 (CVV: 123)</span>
                                </div>
                                <button
                                    onClick={() => copyToClipboard('4000000000000003', 'c3')}
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300"
                                >
                                    {copiedKey === 'c3' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSACTION DETAIL MODAL / DRAWER */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
                        <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-800">
                            <div>
                                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                                    Detalhes do Lançamento
                                </span>
                                <h3 className="text-xl font-bold font-display text-white mt-1">
                                    Pedido #{selectedOrder.appmax_order_id || selectedOrder.id.slice(0, 8)}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            {/* Foto e Comprador */}
                            <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Foto Comprada:</span>
                                    <span className="font-semibold text-white">{selectedOrder.photos?.title || 'Foto Digital'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Comprador:</span>
                                    <span className="font-semibold text-white">{selectedOrder.buyer?.name || 'Cliente'} ({selectedOrder.buyer?.email})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Fotógrafo:</span>
                                    <span className="font-semibold text-white">{selectedOrder.photographer?.name || '-'}</span>
                                </div>
                            </div>

                            {/* Breakdown do Split */}
                            <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-2.5">
                                <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
                                    Divisão do Split (100%):
                                </span>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-400">Valor Bruto do Pedido:</span>
                                    <span className="font-bold text-white">{formatCurrency(selectedOrder.price)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-400">
                                    <span>Comissão FotoClic (6%):</span>
                                    <span className="font-bold">+{formatCurrency(selectedOrder.commission)}</span>
                                </div>
                                <div className="flex justify-between text-purple-300">
                                    <span>Repasse Fotógrafo (94%):</span>
                                    <span className="font-bold">+{formatCurrency((selectedOrder.price || 0) - (selectedOrder.commission || 0))}</span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-neutral-400">Status no Gateway:</span>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold rounded-full border border-emerald-500/20 text-xs">
                                    {selectedOrder.status === 'refunded' ? 'Estornado' : 'Pagamento Aprovado'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAppmax;
