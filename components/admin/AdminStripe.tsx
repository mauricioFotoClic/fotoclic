import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import Spinner from '../Spinner';

interface StripeTransaction {
    id: string;
    paymentIntentId: string;
    amount: number;
    amount_refunded: number;
    status: string;
    refunded: boolean;
    date: number;
    customer_email: string;
    fee: number | null;
    net: number | null;
}

interface StripeStats {
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
    history: StripeTransaction[];
    estimatedFeeRate: string;
}

const AdminStripe: React.FC = () => {
    const [stats, setStats] = useState<StripeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refundingId, setRefundingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getStripeStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch Stripe stats", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefund = async (chargeId: string, fullAmount: number) => {
        if (!confirm(`Deseja realmente reembolsar o valor de R$ ${(fullAmount / 100).toFixed(2)}? Esta ação não pode ser desfeita.`)) {
            return;
        }

        setRefundingId(chargeId);
        try {
            await api.refundStripeCharge(chargeId);
            alert("Reembolso processado com sucesso!");
            fetchData(); // Refresh list
        } catch (error: any) {
            alert("Erro ao processar reembolso: " + error.message);
        } finally {
            setRefundingId(null);
        }
    };

    if (loading && !stats) return <Spinner />;

    const formatBRL = (amountCents: number) => {
        return (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getStatusBadge = (tx: StripeTransaction) => {
        if (tx.refunded) return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Reembolsado</span>;
        if (tx.amount_refunded > 0) return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Reembolso Parcial</span>;
        
        switch (tx.status) {
            case 'succeeded': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Sucesso</span>;
            case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Pendente</span>;
            case 'failed': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Falhou</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">{tx.status}</span>;
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Gestão Stripe</h1>
                    <p className="text-neutral-500 mt-1">Monitoramento de transações e saldos da plataforma.</p>
                </div>
                <button 
                    onClick={fetchData} 
                    className="p-2 text-neutral-500 hover:text-primary transition-colors bg-white rounded-full shadow-sm border border-neutral-200"
                    title="Atualizar Dados"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </div>
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Disponível para Saque</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-neutral-900">
                        {stats ? formatBRL(stats.available[0]?.amount || 0) : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">Saldo pronto para ser transferido para o banco.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <span className="text-[10px] font-bold text-primary-dark uppercase tracking-wider">Aguardando (Pending)</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-neutral-900">
                        {stats ? formatBRL(stats.pending[0]?.amount || 0) : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">Valores em processamento pelo Stripe.</p>
                </div>

                <div className="bg-neutral-900 p-6 rounded-2xl shadow-xl text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/10 text-white rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Taxa Stripe Estimada</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-white">
                        {stats ? stats.estimatedFeeRate : '3.99'}%
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">Média baseada nas últimas 20 transações.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                    <h2 className="font-bold text-neutral-800">Últimas Movimentações</h2>
                    <span className="text-xs text-neutral-500">Mostrando as últimas 20 cobranças</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50">
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Data</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Bruto</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-red-400">Taxa Stripe</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-green-600">Líquido</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {stats?.history.map(tx => (
                                <tr key={tx.id} className="hover:bg-neutral-50 transition-colors group">
                                    <td className="p-4">
                                        <p className="text-sm text-neutral-800 font-medium">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                                        <p className="text-[10px] text-neutral-400">{new Date(tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-neutral-700 truncate max-w-[150px]">{tx.customer_email}</p>
                                        <p className="text-[10px] font-mono text-neutral-400">{tx.id}</p>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-neutral-800">
                                        {formatBRL(tx.amount)}
                                    </td>
                                    <td className="p-4 text-sm text-red-500">
                                        {tx.fee ? `- ${formatBRL(tx.fee)}` : '---'}
                                    </td>
                                    <td className="p-4 text-sm font-bold text-green-600">
                                        {tx.net ? formatBRL(tx.net) : '---'}
                                    </td>
                                    <td className="p-4 text-center">
                                        {getStatusBadge(tx)}
                                    </td>
                                    <td className="p-4 text-right">
                                        {!tx.refunded && tx.status === 'succeeded' && (
                                            <button
                                                onClick={() => handleRefund(tx.id, tx.amount)}
                                                disabled={refundingId === tx.id}
                                                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                {refundingId === tx.id ? 'Processando...' : 'Reembolsar'}
                                            </button>
                                        )}
                                        {tx.refunded && (
                                            <span className="text-[10px] text-neutral-400 italic">Processado</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && stats?.history.length === 0 && (
                    <div className="p-12 text-center">
                        <p className="text-neutral-400">Nenhuma transação encontrada recentemente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStripe;


