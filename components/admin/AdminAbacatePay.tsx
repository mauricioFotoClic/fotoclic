import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Spinner from '../Spinner';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

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

interface AbacateWithdrawal {
    id: string;
    amount: number;
    status: string;
    withdraw_date: string;
    external_id?: string;
    note?: string;
    is_automatic?: boolean;
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
    total_commission: number;
    total_withdrawals?: number;
    balance_adjustment?: number;
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
        case 'REFUNDED':  return <span className="inline-flex items-center bg-primary/20 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Estornado</span>;
        default:          return <span className="inline-flex items-center bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">{status}</span>;
    }
};

const MethodBadge: React.FC<{ method?: string | null }> = ({ method }) => {
    if (!method) return <span className="text-neutral-400 text-[11px]">—</span>;
    if (method === 'PIX')  return <span className="inline-flex items-center bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">PIX</span>;
    if (method === 'CARD') return <span className="inline-flex items-center bg-primary text-primary px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">CARTÃO</span>;
    return <span className="text-neutral-500 text-[10px]">{method}</span>;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

type CardColor = 'white' | 'dark' | 'green' | 'teal' | 'blue' | 'amber' | 'red' | 'orange';

const cardStyles: Record<CardColor, { wrap: string; label: string; value: string; sub: string }> = {
    white:  { wrap: 'bg-white border-neutral-200',  label: 'text-neutral-500', value: 'text-neutral-900', sub: 'text-neutral-400' },
    dark:   { wrap: 'bg-neutral-900 border-neutral-900', label: 'text-white/50', value: 'text-white',       sub: 'text-white/40' },
    green:  { wrap: 'bg-green-50 border-green-200', label: 'text-green-700',   value: 'text-green-900',   sub: 'text-green-600' },
    teal:   { wrap: 'bg-teal-50 border-teal-200',   label: 'text-teal-700',    value: 'text-teal-900',    sub: 'text-teal-600' },
    blue:   { wrap: 'bg-primary/10 border-primary',   label: 'text-primary-dark',    value: 'text-primary',    sub: 'text-primary-dark' },
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
    const [withdrawals, setWithdrawals] = useState<AbacateWithdrawal[]>([]);
    const [stats, setStats] = useState<AbacateStats>({
        total_paid: 0, total_pix: 0, total_card: 0,
        paid_count: 0, pending_count: 0, pending_amount: 0,
        cancelled_count: 0, refunded_count: 0, refunded_amount: 0,
        balance: 0,
        total_commission: 0,
        total_withdrawals: 0,
        balance_adjustment: 0,
    });
    const [loading, setLoading] = useState(true);

    // Dados da API em tempo real
    const [apiBalance, setApiBalance] = useState<{ available: number; pending: number; blocked: number } | null>(null);
    const [apiConnected, setApiConnected] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

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

    // Modal para registrar saques
    const [showAddWithdrawModal, setShowAddWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawNote, setWithdrawNote] = useState('');
    const [withdrawTxId, setWithdrawTxId] = useState('');
    const [withdrawDate, setWithdrawDate] = useState('');
    const [addWithdrawLoading, setAddWithdrawLoading] = useState(false);

    // Modal e estados para ajuste manual de saldo
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [realBalanceInput, setRealBalanceInput] = useState('');
    const [adjustmentLoading, setAdjustmentLoading] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchData = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const data = await api.getAbacateStats();
            setAllBillings(data.billings || []);
            setWithdrawals(data.withdrawals || []);
            if (data.stats) setStats(data.stats);
            setApiBalance(data.api_balance || null);
            setApiConnected(!!data.api_connected);
            setApiError(data.api_error || null);
        } catch (err) {
            console.error('Failed to fetch Abacate Pay stats', err);
            if (isInitial) showToast('Erro ao carregar dados da Abacate Pay.', 'error');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [showToast]);

    const handleAddWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt <= 0) {
            showToast('Por favor, insira um valor de saque válido.', 'error');
            return;
        }

        setAddWithdrawLoading(true);
        try {
            const amountCents = Math.round(amt * 100);
            await api.createAbacateWithdrawal({
                amount: amountCents,
                note: withdrawNote,
                external_id: withdrawTxId || undefined,
                withdraw_date: withdrawDate || undefined
            });

            showToast('Saque registrado com sucesso!', 'success');
            setShowAddWithdrawModal(false);
            setWithdrawAmount('');
            setWithdrawNote('');
            setWithdrawTxId('');
            setWithdrawDate('');
            fetchData(false);
        } catch (err: any) {
            showToast(err.message || 'Erro ao registrar saque.', 'error');
        } finally {
            setAddWithdrawLoading(false);
        }
    };

    const handleDeleteWithdrawal = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro de saque?')) return;
        try {
            await api.deleteAbacateWithdrawal(id);
            showToast('Registro de saque excluído com sucesso.', 'success');
            fetchData(false);
        } catch (err: any) {
            showToast(err.message || 'Erro ao excluir saque.', 'error');
        }
    };

    const handleSaveAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        const realVal = parseFloat(realBalanceInput);
        if (isNaN(realVal) || realVal < 0) {
            showToast('Por favor, insira um valor de saldo válido.', 'error');
            return;
        }

        setAdjustmentLoading(true);
        try {
            // Calcular o desvio em relação ao saldo local estimado (sem ajuste)
            // Saldo local estimado = Net - Total de Saques
            let totalFees = 0;
            const paidBillings = allBillings.filter(b => b.status.toUpperCase() === 'PAID');
            paidBillings.forEach(b => {
                const amountBRL = b.amount / 100;
                if (b.payment_method === 'CARD') {
                    totalFees += (amountBRL * 0.035) + 0.60;
                } else {
                    totalFees += 0.50;
                }
            });
            const feesCents = Math.round(totalFees * 100);
            const netCents = Math.max(0, stats.total_paid - feesCents);
            const totalWithdrawalsCents = stats.total_withdrawals || 0;
            
            const estimatedCents = netCents - totalWithdrawalsCents;
            const realCents = Math.round(realVal * 100);
            
            // Ajuste necessário
            const adjustment = realCents - estimatedCents;

            await api.adjustAbacateBalance(adjustment);

            showToast('Saldo do gateway ajustado com sucesso!', 'success');
            setShowAdjustmentModal(false);
            setRealBalanceInput('');
            fetchData(false);
        } catch (err: any) {
            showToast(err.message || 'Erro ao salvar ajuste.', 'error');
        } finally {
            setAdjustmentLoading(false);
        }
    };

    // Fetch once on mount
    useEffect(() => {
        fetchData(true);
    }, [fetchData]); // Only on mount
    
    // Auto-refresh every 60 seconds (silent update)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(false);
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

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

    const gatewayFeesAndNet = useMemo(() => {
        let totalFees = 0;
        const paidBillings = allBillings.filter(b => b.status.toUpperCase() === 'PAID');
        paidBillings.forEach(b => {
            const amountBRL = b.amount / 100;
            if (b.payment_method === 'CARD') {
                totalFees += (amountBRL * 0.035) + 0.60;
            } else {
                totalFees += 0.50; // Taxa Pix padrão do Abacate Pay
            }
        });
        const feesCents = Math.round(totalFees * 100);
        const netCents = Math.max(0, stats.total_paid - feesCents);
        const totalWithdrawalsCents = stats.total_withdrawals || 0;
        const availableCents = Math.max(0, netCents - totalWithdrawalsCents + (stats.balance_adjustment || 0));
        return {
            fees: feesCents,
            net: netCents,
            available: availableCents
        };
    }, [allBillings, stats.total_paid, stats.total_withdrawals, stats.balance_adjustment]);

    const displayAvailable = useMemo(() => {
        if (apiConnected && apiBalance) {
            return apiBalance.available;
        }
        return gatewayFeesAndNet.available;
    }, [apiConnected, apiBalance, gatewayFeesAndNet.available]);

    // ── Refund ─────────────────────────────────────────────────────────────────

    const handleRefundConfirm = async () => {
        if (!refundTarget) return;
        setRefundLoading(true);
        try {
            const json = await api.refundAbacateBilling(refundTarget.id, refundTarget.billing_id);

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
            
            if (json.apiRefundFailed) {
                showToast('Estorno registrado no FotoClic. Lembre-se de realizar o reembolso manual no painel do Abacate Pay!', 'warning');
            } else {
                showToast('Estorno registrado com sucesso.', 'success');
            }
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
        return <Spinner size="lg" fullHeight={true} label="Carregando dados do Abacate Pay..." />;
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
                    onClick={() => fetchData(false)}
                    title="Atualizar dados"
                    className="p-2.5 text-neutral-500 hover:text-primary transition-colors bg-white rounded-full shadow-sm border border-neutral-200"
                >
                    <RefreshIcon />
                </button>
            </div>

            {/* ── Abacate Pay Official Balance Cards (Real-time API) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-1">Disponível para saque</p>
                            <p className="text-3xl font-bold text-neutral-900">{formatBRL(apiConnected && apiBalance ? apiBalance.available : gatewayFeesAndNet.available)}</p>
                        </div>
                        <div className="text-neutral-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">Saldo utilizável para repasses</span>
                        {apiConnected && (
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Sincronizado via API" />
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-1">Em processamento</p>
                            <p className="text-3xl font-bold text-neutral-900">{formatBRL(apiConnected && apiBalance ? apiBalance.pending : 0)}</p>
                        </div>
                        <div className="text-neutral-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">Aguardando prazo de liberação</span>
                        {apiConnected && (
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-1">Bloqueado</p>
                            <p className="text-3xl font-bold text-neutral-900">{formatBRL(apiConnected && apiBalance ? apiBalance.blocked : 0)}</p>
                        </div>
                        <div className="text-neutral-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">Retido por segurança / disputas</span>
                        {apiConnected && (
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Abacate Pay Style Dashboard ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <p className="text-neutral-500 text-xs font-medium mb-1">Total em vendas</p>
                    <p className="text-2xl font-bold text-neutral-900">{formatBRL(stats.total_paid)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <p className="text-neutral-500 text-xs font-medium mb-1">Total de transações</p>
                    <p className="text-2xl font-bold text-neutral-900">{stats.paid_count}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <p className="text-neutral-500 text-xs font-medium mb-1">Ticket Médio</p>
                    <p className="text-2xl font-bold text-neutral-900">
                        {stats.paid_count > 0 ? formatBRL(stats.total_paid / stats.paid_count) : 'R$ 0,00'}
                    </p>
                </div>
            </div>

            {/* ── Métodos de Pagamento (Espelhado) ── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <svg className="text-neutral-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    <h3 className="text-sm font-bold text-neutral-800">Métodos de pagamentos</h3>
                </div>

                <div className="w-full bg-neutral-100 h-6 rounded-full overflow-hidden mb-6 flex">
                    <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ width: `${pixPct || 0}%` }}
                        title={`Pix: ${pixPct || 0}%`}
                    />
                    <div 
                        className="bg-indigo-500 h-full transition-all duration-500" 
                        style={{ width: `${cardPct || 0}%` }}
                        title={`Cartão: ${cardPct || 0}%`}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-sm font-medium text-neutral-700">Pix</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <span className="text-xs text-neutral-400">{pixPct || 0}%</span>
                            <span className="text-sm font-bold text-neutral-900">{formatBRL(stats.total_pix)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-50 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-sm font-medium text-neutral-700">Cartão de crédito</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <span className="text-xs text-neutral-400">{cardPct || 0}%</span>
                            <span className="text-sm font-bold text-neutral-900">{formatBRL(stats.total_card)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Finanças FotoClic (Destaques) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                        </svg>
                    </div>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Lucro FotoClic (Comissões)</p>
                    <p className="text-3xl font-display font-bold text-white">{formatBRL(stats.total_commission)}</p>
                    <p className="text-white/30 text-[10px] mt-2 italic">Total acumulado de comissões sobre as vendas pagas</p>
                </div>

                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <p className="text-orange-700 text-xs font-bold uppercase tracking-wider mb-1">Total Processado (Gateway)</p>
                    <p className="text-3xl font-display font-bold text-orange-900">{formatBRL(stats.total_paid)}</p>
                    
                    <div className="mt-3 pt-3 border-t border-orange-200/60 space-y-1.5 text-xs text-orange-800">
                        <div className="flex justify-between">
                            <span>Taxas estimadas do gateway:</span>
                            <span className="font-medium">{formatBRL(gatewayFeesAndNet.fees)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-b border-orange-200/30 pb-1.5">
                            <span>Líquido acumulado:</span>
                            <span>{formatBRL(gatewayFeesAndNet.net)}</span>
                        </div>
                        <p className="text-[10px] text-orange-600/70 leading-snug mt-1">
                            * O saldo líquido acumulado é histórico e não desconta os saques que você já realizou.
                        </p>
                    </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="20" x2="12" y2="4"/>
                        </svg>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-emerald-800 text-xs font-bold uppercase tracking-wider">
                            {apiConnected ? 'Saldo Disponível no Gateway' : 'Saldo Estimado no Gateway'}
                        </p>
                        {apiConnected ? (
                            <span className="inline-flex items-center bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-200/50">
                                🟢 Automático
                            </span>
                        ) : (
                            <span className="inline-flex items-center bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-amber-200/50">
                                ⚠️ Estimado
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-3xl font-display font-bold text-emerald-950">
                            {formatBRL(displayAvailable)}
                        </p>
                        {!apiConnected && (
                            <button
                                onClick={() => {
                                    setRealBalanceInput((gatewayFeesAndNet.available / 100).toFixed(2));
                                    setShowAdjustmentModal(true);
                                }}
                                title="Ajustar saldo com o valor real do Abacate Pay"
                                className="p-1 text-emerald-800 hover:text-emerald-950 transition-colors bg-emerald-100 hover:bg-emerald-200 rounded-lg shadow-sm border border-emerald-200/50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-1.5 text-xs text-emerald-800">
                        {apiConnected && apiBalance ? (
                            <>
                                <div className="flex justify-between">
                                    <span>Pendente de liberação:</span>
                                    <span className="font-medium text-emerald-900">{formatBRL(apiBalance.pending)}</span>
                                </div>
                                {apiBalance.blocked > 0 && (
                                    <div className="flex justify-between text-red-700">
                                        <span>Saldo bloqueado:</span>
                                        <span className="font-bold">{formatBRL(apiBalance.blocked)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Líquido acumulado (Vendas):</span>
                                    <span className="font-medium">{formatBRL(gatewayFeesAndNet.net)}</span>
                                </div>
                                <p className="text-[10px] text-emerald-700/70 leading-snug mt-1">
                                    * Valores atualizados automaticamente em tempo real via API do Abacate Pay.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                    <span>Líquido acumulado:</span>
                                    <span className="font-medium">{formatBRL(gatewayFeesAndNet.net)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-b border-emerald-200/30 pb-1.5 text-emerald-900">
                                    <span>Saques efetuados:</span>
                                    <span className="text-red-700">-{formatBRL(stats.total_withdrawals || 0)}</span>
                                </div>
                                {stats.balance_adjustment !== 0 && (
                                    <div className="flex justify-between text-[11px] text-emerald-700/80">
                                        <span>Ajuste manual de saldo:</span>
                                        <span>{stats.balance_adjustment && stats.balance_adjustment > 0 ? '+' : ''}{formatBRL(stats.balance_adjustment || 0)}</span>
                                    </div>
                                )}
                                
                                <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 text-[10px] text-amber-900 leading-normal mt-2 shadow-sm">
                                    <p className="font-bold flex items-center gap-1 mb-1">
                                        💡 Ative a Automação
                                    </p>
                                    <p>
                                        Para sincronizar o saldo real automaticamente, edite sua chave de API da Abacate Pay no dashboard deles e ative a permissão <strong>STORE:READ</strong>.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Histórico de Saques do Gateway (Abacate Pay) ── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <svg className="text-neutral-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        <div>
                            <h3 className="text-sm font-bold text-neutral-800">Saques Realizados para Conta Bancária</h3>
                            <p className="text-[11px] text-neutral-400">Controle local de saques efetuados da conta Abacate Pay.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddWithdrawModal(true)}
                        className="text-xs font-bold text-white bg-primary hover:bg-primary-dark px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <span>+</span> Registrar Saque
                    </button>
                </div>

                {withdrawals.length === 0 ? (
                    <div className="py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        <p className="text-2xl mb-1">💸</p>
                        <p className="text-neutral-400 text-xs">Nenhum saque registrado ainda.</p>
                        <p className="text-[10px] text-neutral-400/80 mt-1">Clique em "Registrar Saque" para adicionar um saque e bater o saldo.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-neutral-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-100">
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase">Data</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase">ID de Transação</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase">Observação</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase text-right">Valor</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50 text-xs">
                                {withdrawals.map(w => (
                                    <tr key={w.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-4 py-3 text-neutral-800">
                                            {formatDate(w.withdraw_date)} <span className="text-neutral-400 text-[10px] ml-1">{formatTime(w.withdraw_date)}</span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[10px] text-neutral-500">{w.external_id || '—'}</td>
                                        <td className="px-4 py-3 text-neutral-600 max-w-[250px] truncate" title={w.note}>{w.note || '—'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatBRL(w.amount)}</td>
                                        <td className="px-4 py-3 text-right">
                                            {w.is_automatic ? (
                                                <span className="text-neutral-400 font-medium text-[10px]">Automático</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteWithdrawal(w.id)}
                                                    className="text-red-500 hover:text-red-700 font-medium text-[10px] transition-colors"
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Outros status ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard
                    label="Pendentes"
                    value={String(stats.pending_count)}
                    sub={stats.pending_count > 0 ? formatBRL(stats.pending_amount) : 'Nenhuma'}
                    color="amber"
                />
                <StatCard
                    label="Canceladas"
                    value={String(stats.cancelled_count)}
                    color="red"
                />
                <StatCard
                    label="Estornadas"
                    value={String(stats.refunded_count)}
                    sub={stats.refunded_count > 0 ? formatBRL(stats.refunded_amount) : 'Nenhuma'}
                    color="white"
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
                                        <div className="flex flex-col">
                                            <MethodBadge method={b.payment_method} />
                                            {!b.payment_method && b.status === 'PENDING' && (
                                                <span className="text-[10px] text-neutral-400 italic">Aguardando escolha...</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-bold text-neutral-900">{formatBRL(b.amount)}</p>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <StatusBadge status={b.status} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {b.checkout_url && b.status === 'PENDING' && (
                                                <a
                                                    href={b.checkout_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] font-bold text-primary hover:text-white hover:bg-primary border border-primary/30 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1"
                                                >
                                                    <ExternalLinkIcon /> Link de Pagamento
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

            {/* Modal para Registrar Saque */}
            {showAddWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                        <h3 className="text-lg font-bold text-neutral-900 mb-2">Registrar Saque do Gateway</h3>
                        <p className="text-xs text-neutral-500 mb-4">
                            Informe os dados do saque realizado no painel da Abacate Pay para deduzir do saldo disponível do FotoClic.
                        </p>

                        <form onSubmit={handleAddWithdrawal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Valor do Saque (R$)*</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="Ex: 100.52"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">ID da Transação / Comprovante (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: tran_FqfLJSQK..."
                                    value={withdrawTxId}
                                    onChange={e => setWithdrawTxId(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Data do Saque (Opcional)</label>
                                <input
                                    type="datetime-local"
                                    value={withdrawDate}
                                    onChange={e => setWithdrawDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Observações / Notas (Opcional)</label>
                                <textarea
                                    placeholder="Ex: Saque Pix para Banco Inter da empresa."
                                    value={withdrawNote}
                                    onChange={e => setWithdrawNote(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!addWithdrawLoading) {
                                            setShowAddWithdrawModal(false);
                                            setWithdrawAmount('');
                                            setWithdrawNote('');
                                            setWithdrawTxId('');
                                            setWithdrawDate('');
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={addWithdrawLoading}
                                    className="flex-1 px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {addWithdrawLoading ? 'Registrando...' : 'Registrar Saque'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Ajuste Manual de Saldo */}
            {showAdjustmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                        <h3 className="text-lg font-bold text-neutral-900 mb-2">Ajustar Saldo Estimado</h3>
                        <p className="text-xs text-neutral-500 mb-4">
                            Informe o saldo disponível real exibido no painel da Abacate Pay para forçar a sincronização do valor local estimado do FotoClic.
                        </p>

                        <form onSubmit={handleSaveAdjustment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Saldo Disponível Real (R$)*</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="Ex: 112.28"
                                    value={realBalanceInput}
                                    onChange={e => setRealBalanceInput(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!adjustmentLoading) {
                                            setShowAdjustmentModal(false);
                                            setRealBalanceInput('');
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustmentLoading}
                                    className="flex-1 px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {adjustmentLoading ? 'Salvando...' : 'Salvar Ajuste'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAbacatePay;


