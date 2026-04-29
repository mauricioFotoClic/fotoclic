import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Spinner from '../Spinner';
import { useToast } from '../../contexts/ToastContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AbacateBilling {
    id: string;
    billing_id: string;
    amount: number;
    status: string;
    payment_method?: 'PIX' | 'CARD' | null;
    checkout_url?: string;
    created_at: string;
    customer_name?: string;
    customer_email?: string;
}

interface AbacateStats {
    total_paid: number;
    total_pix: number;
    total_card: number;
    paid_count: number;
    pending_count: number;
    pending_amount: number;
    cancelled_count: number;
    refunded_count: number;
    refunded_amount: number;
    balance: number;
}

type StatusFilter = 'ALL' | 'PAID' | 'PENDING' | 'CANCELLED' | 'REFUNDED';
type MethodFilter = 'ALL' | 'PIX' | 'CARD';
type DateFilter   = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

const ITEMS_PER_PAGE = 15;

// ─── Icons ───────────────────────────────────────────────────────────────────

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
);

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
    </svg>
);

const AlertTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    switch (status.toUpperCase()) {
        case 'PAID':      return <span className="inline-flex items-center bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Pago</span>;
        case 'PENDING':   return <span className="inline-flex items-center bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Pendente</span>;
        case 'CANCELLED': return <span className="inline-flex items-center bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Cancelado</span>;
        case 'REFUNDED':  return <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Estornado</span>;
        default:          return <span className="inline-flex items-center bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">{status}</span>;
    }
};

const MethodBadge: React.FC<{ method?: string | null }> = ({ method }) => {
    if (!method) return <span className="text-neutral-400 text-[11px]">—</span>;
    if (method === 'PIX')  return <span className="inline-flex items-center bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">PIX</span>;
    if (method === 'CARD') return <span className="inline-flex items-center bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">CARTÃO</span>;
    return <span className="text-neutral-500 text-[10px]">{method}</span>;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

type CardColor = 'white' | 'dark' | 'green' | 'teal' | 'blue' | 'amber' | 'red' | 'orange';

const cardStyles: Record<CardColor, { wrap: string; label: string; value: string; sub: string }> = {
    white:  { wrap: 'bg-white border-neutral-200',  label: 'text-neutral-500', value: 'text-neutral-900', sub: 'text-neutral-400' },
    dark:   { wrap: 'bg-neutral-900 border-neutral-900', label: 'text-white/50', value: 'text-white',       sub: 'text-white/40' },
    green:  { wrap: 'bg-green-50 border-green-200', label: 'text-green-700',   value: 'text-green-900',   sub: 'text-green-600' },
    teal:   { wrap: 'bg-teal-50 border-teal-200',   label: 'text-teal-700',    value: 'text-teal-900',    sub: 'text-teal-600' },
    blue:   { wrap: 'bg-blue-50 border-blue-200',   label: 'text-blue-700',    value: 'text-blue-900',    sub: 'text-blue-600' },
    amber:  { wrap: 'bg-amber-50 border-amber-200', label: 'text-amber-700',   value: 'text-amber-900',   sub: 'text-amber-600' },
    red:    { wrap: 'bg-red-50 border-red-200',     label: 'text-red-700',     value: 'text-red-900',     sub: 'text-red-500' },
    orange: { wrap: 'bg-orange-50 border-orange-200', label: 'text-orange-700', value: 'text-orange-900', sub: 'text-orange-600' },
};

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: CardColor }> = ({
    label, value, sub, color = 'white',
}) => {
    const s = cardStyles[color];
    return (
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${s.wrap}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${s.label}`}>{label}</p>
            <p className={`text-xl sm:text-2xl font-display font-bold ${s.value}`}>{value}</p>
            {sub && <p className={`text-xs mt-2 ${s.sub}`}>{sub}</p>}
        </div>
    );
};

// ─── Refund Confirmation Modal ────────────────────────────────────────────────

const RefundModal: React.FC<{
    billing: AbacateBilling;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ billing, loading, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex flex-col items-center text-center mb-5">
                <div className="p-3 bg-red-100 rounded-full mb-3">
                    <AlertTriangleIcon />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Confirmar Estorno</h3>
                <p className="text-sm text-neutral-500 mt-1">Esta ação registrará o estorno desta cobrança no sistema.</p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 mb-4 space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Cliente</span>
                    <span className="font-semibold text-neutral-800">{billing.customer_name || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500">E-mail</span>
                    <span className="font-medium text-neutral-700 truncate ml-4 max-w-[200px]">{billing.customer_email || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Método</span>
                    <MethodBadge method={billing.payment_method} />
                </div>
                <div className="flex justify-between items-center border-t border-neutral-200 pt-2.5">
                    <span className="text-neutral-500 font-medium">Valor a estornar</span>
                    <span className="font-bold text-red-600 text-base">{formatBRL(billing.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Data da cobrança</span>
                    <span className="font-medium text-neutral-700">{formatDate(billing.created_at)} às {formatTime(billing.created_at)}</span>
                </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-5 text-xs text-red-700 leading-relaxed">
                <strong>Atenção:</strong> Esta ação atualiza o status no sistema. Se necessário, processe também o reembolso diretamente no painel da Abacate Pay para devolver o valor ao cliente.
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Processando...
                        </>
                    ) : 'Confirmar Estorno'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminAbacatePay: React.FC = () => {
    const { showToast } = useToast();

    const [allBillings, setAllBillings] = useState<AbacateBilling[]>([]);
    const [stats, setStats] = useState<AbacateStats>({
        total_paid: 0, total_pix: 0, total_card: 0,
        paid_count: 0, pending_count: 0, pending_amount: 0,
        cancelled_count: 0, refunded_count: 0, refunded_amount: 0,
        balance: 0,
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL');
    const [dateFilter,   setDateFilter]   = useState<DateFilter>('ALL');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Refund
    const [refundTarget,  setRefundTarget]  = useState<AbacateBilling | null>(null);
    const [refundLoading, setRefundLoading] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/abacate-stats');
            if (!res.ok) throw new Error('Resposta inválida do servidor');
            const data = await res.json();
            setAllBillings(data.billings || []);
            if (data.stats) setStats(data.stats);
        } catch (err) {
            console.error('Failed to fetch Abacate Pay stats', err);
            showToast('Erro ao carregar dados da Abacate Pay.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Filtering ──────────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const now = new Date();
        return allBillings.filter(b => {
            if (search) {
                const q = search.toLowerCase();
                const ok = (b.customer_name?.toLowerCase().includes(q) ?? false)
                        || (b.customer_email?.toLowerCase().includes(q) ?? false)
                        || (b.billing_id?.toLowerCase().includes(q) ?? false);
                if (!ok) return false;
            }
            if (statusFilter !== 'ALL' && b.status.toUpperCase() !== statusFilter) return false;
            if (methodFilter !== 'ALL' && b.payment_method !== methodFilter) return false;
            if (dateFilter !== 'ALL') {
                const d = new Date(b.created_at);
                if (dateFilter === 'TODAY') {
                    if (d.toDateString() !== now.toDateString()) return false;
                } else if (dateFilter === 'WEEK') {
                    const cut = new Date(now); cut.setDate(now.getDate() - 7);
                    if (d < cut) return false;
                } else if (dateFilter === 'MONTH') {
                    const cut = new Date(now); cut.setMonth(now.getMonth() - 1);
                    if (d < cut) return false;
                }
            }
            return true;
        });
    }, [allBillings, search, statusFilter, methodFilter, dateFilter]);

    useEffect(() => { setCurrentPage(1); }, [search, statusFilter, methodFilter, dateFilter]);

    const totalPages       = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated        = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const pixPct           = stats.total_paid > 0 ? Math.round((stats.total_pix / stats.total_paid) * 100) : null;
    const cardPct          = stats.total_paid > 0 ? Math.round((stats.total_card / stats.total_paid) * 100) : null;

    // ── Refund ─────────────────────────────────────────────────────────────────

    const handleRefundConfirm = async () => {
        if (!refundTarget) return;
        setRefundLoading(true);
        try {
            const res = await fetch('/api/abacate-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: refundTarget.id, billing_id: refundTarget.billing_id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao processar estorno');

            // Optimistic update
            setAllBillings(prev =>
                prev.map(b => b.id === refundTarget.id ? { ...b, status: 'REFUNDED' } : b)
            );
            setStats(prev => ({
                ...prev,
                paid_count:      prev.paid_count - 1,
                total_paid:      prev.total_paid - refundTarget.amount,
                refunded_count:  prev.refunded_count + 1,
                refunded_amount: prev.refunded_amount + refundTarget.amount,
                balance:         Math.max(0, prev.balance - refundTarget.amount * 0.97),
            }));
            showToast('Estorno registrado com sucesso.', 'success');
            setRefundTarget(null);
        } catch (err: any) {
            showToast(err.message || 'Erro ao processar estorno.', 'error');
        } finally {
            setRefundLoading(false);
        }
    };

    // ── Pagination helpers ─────────────────────────────────────────────────────

    const pageNumbers = (): number[] => {
        if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (currentPage <= 3) return [1, 2, 3, 4, 5];
        if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-dark flex items-center gap-2">
                        <span>🥑</span> Abacate Pay
                    </h1>
                    <p className="text-neutral-500 mt-1 text-sm">Gestão completa de pagamentos PIX e Cartão.</p>
                </div>
                <button
                    onClick={fetchData}
                    title="Atualizar dados"
                    className="p-2.5 text-neutral-500 hover:text-primary transition-colors bg-white rounded-full shadow-sm border border-neutral-200"
                >
                    <RefreshIcon />
                </button>
            </div>

            {/* ── Stats — row 1 (financeiro) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    label="Total Recebido"
                    value={formatBRL(stats.total_paid)}
                    sub={`${stats.paid_count} cobranças pagas`}
                    color="green"
                />
                <StatCard
                    label="Volume PIX"
                    value={formatBRL(stats.total_pix)}
                    sub={pixPct !== null ? `${pixPct}% das vendas` : 'Dados indisponíveis'}
                    color="teal"
                />
                <StatCard
                    label="Volume Cartão"
                    value={formatBRL(stats.total_card)}
                    sub={cardPct !== null ? `${cardPct}% das vendas` : 'Dados indisponíveis'}
                    color="blue"
                />
                <StatCard
                    label="Saldo Estimado"
                    value={formatBRL(stats.balance)}
                    sub="Líquido após taxa ~3%"
                    color="dark"
                />
            </div>

            {/* ── Stats — row 2 (operacional) ── */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard
                    label="Pendentes"
                    value={String(stats.pending_count)}
                    sub={stats.pending_count > 0 ? formatBRL(stats.pending_amount) : 'Nenhuma pendente'}
                    color="amber"
                />
                <StatCard
                    label="Canceladas"
                    value={String(stats.cancelled_count)}
                    sub={stats.cancelled_count === 0 ? 'Nenhuma cancelada' : 'cobranças canceladas'}
                    color="red"
                />
                <StatCard
                    label="Estornadas"
                    value={String(stats.refunded_count)}
                    sub={stats.refunded_count > 0 ? formatBRL(stats.refunded_amount) : 'Nenhum estorno'}
                    color="orange"
                />
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative sm:col-span-2 lg:col-span-1">
                        <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400 pointer-events-none">
                            <SearchIcon />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar cliente, e-mail ou ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Status */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                        className="px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                        <option value="ALL">Todos os status</option>
                        <option value="PAID">Pago</option>
                        <option value="PENDING">Pendente</option>
                        <option value="CANCELLED">Cancelado</option>
                        <option value="REFUNDED">Estornado</option>
                    </select>

                    {/* Method */}
                    <select
                        value={methodFilter}
                        onChange={e => setMethodFilter(e.target.value as MethodFilter)}
                        className="px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                        <option value="ALL">Todos os métodos</option>
                        <option value="PIX">PIX</option>
                        <option value="CARD">Cartão</option>
                    </select>

                    {/* Period */}
                    <select
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value as DateFilter)}
                        className="px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                        <option value="ALL">Qualquer período</option>
                        <option value="TODAY">Hoje</option>
                        <option value="WEEK">Últimos 7 dias</option>
                        <option value="MONTH">Últimos 30 dias</option>
                    </select>
                </div>

                <p className="text-xs text-neutral-400 mt-3">
                    {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                    {filtered.length !== allBillings.length && ` de ${allBillings.length} no total`}
                </p>
            </div>

            {/* ── Transactions ── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                    <h2 className="font-bold text-neutral-800">Cobranças</h2>
                    {totalPages > 1 && (
                        <span className="text-xs text-neutral-400">
                            Página {currentPage} de {totalPages}
                        </span>
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100">
                                <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Data</th>
                                <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Método</th>
                                <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Valor</th>
                                <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <p className="text-3xl mb-2">🔍</p>
                                        <p className="text-neutral-400 text-sm">Nenhuma cobrança encontrada com os filtros aplicados.</p>
                                    </td>
                                </tr>
                            ) : paginated.map(b => (
                                <tr key={b.id} className="hover:bg-neutral-50/80 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-medium text-neutral-800">{formatDate(b.created_at)}</p>
                                        <p className="text-[10px] text-neutral-400">{formatTime(b.created_at)}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-medium text-neutral-800">{b.customer_name || '—'}</p>
                                        <p className="text-[11px] text-neutral-400">{b.customer_email || '—'}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <MethodBadge method={b.payment_method} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-bold text-neutral-900">{formatBRL(b.amount)}</p>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <StatusBadge status={b.status} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {b.checkout_url && (
                                                <a
                                                    href={b.checkout_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Ver link de checkout"
                                                    className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                >
                                                    <ExternalLinkIcon />
                                                </a>
                                            )}
                                            {b.status.toUpperCase() === 'PAID' && (
                                                <button
                                                    onClick={() => setRefundTarget(b)}
                                                    className="text-[10px] font-bold text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                                                >
                                                    Estornar
                                                </button>
                                            )}
                                            {b.status.toUpperCase() === 'REFUNDED' && (
                                                <span className="text-[10px] text-neutral-400 italic">Estornado</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-neutral-100">
                    {paginated.length === 0 ? (
                        <div className="py-14 text-center">
                            <p className="text-3xl mb-2">🔍</p>
                            <p className="text-neutral-400 text-sm">Nenhuma cobrança encontrada.</p>
                        </div>
                    ) : paginated.map(b => (
                        <div key={b.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1 mr-3">
                                    <p className="font-semibold text-neutral-800 text-sm truncate">{b.customer_name || '—'}</p>
                                    <p className="text-xs text-neutral-400 truncate">{b.customer_email || '—'}</p>
                                </div>
                                <StatusBadge status={b.status} />
                            </div>

                            <div className="flex items-end justify-between mt-3">
                                <div>
                                    <p className="text-xl font-bold text-neutral-900">{formatBRL(b.amount)}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <MethodBadge method={b.payment_method} />
                                        <span className="text-[10px] text-neutral-400">
                                            {formatDate(b.created_at)} às {formatTime(b.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {b.checkout_url && (
                                        <a
                                            href={b.checkout_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLinkIcon /> Checkout
                                        </a>
                                    )}
                                    {b.status.toUpperCase() === 'PAID' && (
                                        <button
                                            onClick={() => setRefundTarget(b)}
                                            className="text-[10px] font-bold text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Estornar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-neutral-100">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeftIcon /> Anterior
                        </button>

                        <div className="flex items-center gap-1">
                            {pageNumbers().map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                                        p === currentPage
                                            ? 'bg-primary text-white font-bold shadow-sm'
                                            : 'text-neutral-600 hover:bg-neutral-100'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Próxima <ChevronRightIcon />
                        </button>
                    </div>
                )}
            </div>

            {/* Refund Modal */}
            {refundTarget && (
                <RefundModal
                    billing={refundTarget}
                    loading={refundLoading}
                    onConfirm={handleRefundConfirm}
                    onCancel={() => { if (!refundLoading) setRefundTarget(null); }}
                />
            )}
        </div>
    );
};

export default AdminAbacatePay;
