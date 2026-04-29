import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import Spinner from '../Spinner';

interface AbacateBilling {
    id: string;
    billing_id: string;
    amount: number;
    status: string;
    checkout_url: string;
    created_at: string;
    customer_name?: string;
    customer_email?: string;
}

const AdminAbacatePay: React.FC = () => {
    const [billings, setBillings] = useState<AbacateBilling[]>([]);
    const [stats, setStats] = useState({ total_paid: 0, pending_count: 0, balance: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // No backend, criaremos um endpoint similar ao do Stripe para buscar estas estatísticas
            const response = await fetch('/api/abacate-stats');
            const data = await response.json();
            setBillings(data.billings || []);
            setStats(data.stats || { total_paid: 0, pending_count: 0, balance: 0 });
        } catch (error) {
            console.error("Failed to fetch Abacate Pay stats", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatBRL = (amountCents: number) => {
        return (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getStatusBadge = (status: string) => {
        switch (status.toUpperCase()) {
            case 'PAID': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Pago</span>;
            case 'PENDING': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Pendente</span>;
            case 'CANCELLED': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Cancelado</span>;
            case 'REFUNDED': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Reembolsado</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-[10px] font-bold uppercase">{status}</span>;
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark flex items-center gap-3">
                        <span className="p-2 bg-green-100 rounded-xl">🥑</span>
                        Gestão Abacate Pay
                    </h1>
                    <p className="text-neutral-500 mt-1">Monitoramento de cobranças PIX e Cartão via Abacate Pay.</p>
                </div>
                <button 
                    onClick={fetchData} 
                    className="p-2 text-neutral-500 hover:text-primary transition-colors bg-white rounded-full shadow-sm border border-neutral-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Volume Total Pago</p>
                    <p className="text-3xl font-display font-bold text-neutral-900">{formatBRL(stats.total_paid)}</p>
                    <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
                        Histórico de vendas PIX/Cartão
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Cobranças Pendentes</p>
                    <p className="text-3xl font-display font-bold text-neutral-900">{stats.pending_count}</p>
                    <p className="text-xs text-neutral-400 mt-4">Aguardando pagamento do cliente.</p>
                </div>

                <div className="bg-neutral-900 p-6 rounded-2xl shadow-xl text-white">
                    <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Saldo Estimado</p>
                    <p className="text-3xl font-display font-bold text-white">{formatBRL(stats.balance)}</p>
                    <p className="text-xs text-white/40 mt-4">Líquido disponível na plataforma.</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-6 border-b border-neutral-100">
                    <h2 className="font-bold text-neutral-800">Últimas Cobranças Geradas</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50">
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Data</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Valor</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Link Checkout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-10 text-center"><Spinner /></td></tr>
                            ) : billings.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-neutral-400">Nenhuma cobrança encontrada.</td></tr>
                            ) : (
                                billings.map(b => (
                                    <tr key={b.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="p-4 text-sm text-neutral-600">
                                            {new Date(b.created_at).toLocaleDateString('pt-BR')}
                                            <span className="block text-[10px] text-neutral-400">{new Date(b.created_at).toLocaleTimeString('pt-BR')}</span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-neutral-800">
                                            {b.customer_name || 'N/A'}
                                            <span className="block text-[10px] text-neutral-400">{b.customer_email || 'N/A'}</span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-neutral-900">{formatBRL(b.amount)}</td>
                                        <td className="p-4 text-center">{getStatusBadge(b.status)}</td>
                                        <td className="p-4 text-right">
                                            <a 
                                                href={b.checkout_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="text-[10px] font-bold text-primary hover:underline uppercase"
                                            >
                                                Ver Checkout
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminAbacatePay;
