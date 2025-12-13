import React, { useEffect, useState, useCallback } from 'react';
import { User, Payout, PhotographerBalance, BankInfo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';

interface PhotographerPayoutsProps {
    user: User;
}

const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

const PhotographerPayouts: React.FC<PhotographerPayoutsProps> = ({ user }) => {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [balance, setBalance] = useState<PhotographerBalance | null>(null);
    const [loading, setLoading] = useState(true);

    // Request State
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState<Payout | null>(null);

    // Bank Info Modal
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [bankInfo, setBankInfo] = useState<BankInfo>({ pixKey: '', pixKeyType: 'email' });
    const [isSavingBank, setIsSavingBank] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [payoutsData, balanceData, userData] = await Promise.all([
                api.getPayoutsByPhotographerId(user.id),
                api.getPhotographerBalanceById(user.id),
                api.getPhotographerById(user.id)
            ]);
            setPayouts(payoutsData);
            setBalance(balanceData || null);
            if (userData && userData.bank_info) {
                setBankInfo(userData.bank_info);
            }
        } catch (error) {
            console.error("Failed to fetch payout data", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRequestPayout = async () => {
        if (!balance || balance.currentBalance < 70) return;
        if (!user.bank_info && !bankInfo.pixKey) {
            setIsBankModalOpen(true);
            return;
        }

        if (!confirm("Confirmar solicitação de saque?")) return;

        setIsRequesting(true);
        try {
            const newPayout = await api.requestPayout(user.id, balance.currentBalance);
            setRequestSuccess(newPayout);
            fetchData(); // Refresh balance
        } catch (error) {
            console.error("Payout request failed", error);
            alert("Erro ao solicitar pagamento.");
        } finally {
            setIsRequesting(false);
        }
    };

    const handleSaveBankInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingBank(true);
        try {
            await api.updateBankInfo(user.id, bankInfo);
            setIsBankModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to save bank info", error);
        } finally {
            setIsSavingBank(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Pago</span>;
            case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">Pendente</span>;
            case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">Rejeitado</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    if (loading) return <Spinner />;

    const inputClass = "w-full px-3 py-2 bg-white text-neutral-900 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-colors shadow-sm placeholder-neutral-400";

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Central Financeira</h1>
                <button
                    onClick={() => setIsBankModalOpen(true)}
                    className="text-sm text-primary hover:underline flex items-center bg-white px-4 py-2 rounded-lg shadow-sm border border-neutral-200 hover:bg-neutral-50"
                >
                    <span className="mr-2">⚙️</span> Configurar Recebimento
                </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Vendas Brutas</p>
                    <p className="text-2xl font-bold text-neutral-800">
                        {balance ? balance.totalSalesGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Taxas da Plataforma ({(balance?.commissionRate || 0) * 100}%)</p>
                    <p className="text-2xl font-bold text-red-500">
                        - {balance ? balance.totalPlatformFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Saldo Disponível</p>
                        <p className="text-3xl font-display font-bold text-blue-700">
                            {balance ? balance.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                        </p>

                        {/* Progress Bar for Minimum Threshold */}
                        {balance && balance.currentBalance < 70 && (
                            <div className="mt-3">
                                <div className="flex justify-between text-[10px] text-blue-600 mb-1">
                                    <span>Mínimo: R$ 70,00</span>
                                    <span>{Math.round((balance.currentBalance / 70) * 100)}%</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                    <div
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((balance.currentBalance / 70) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Configured Payment Method Display */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-neutral-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-neutral-900 flex items-center">
                            <span className="mr-2">🏦</span> Dados de Recebimento
                        </h3>
                        {bankInfo.pixKey ? (
                            <div className="mt-2 text-sm text-neutral-600">
                                <p className="mb-1"><span className="font-semibold text-neutral-800">Tipo de Chave:</span> {
                                    bankInfo.pixKeyType === 'random' ? 'Chave Aleatória' :
                                        bankInfo.pixKeyType === 'phone' ? 'Telefone' :
                                            bankInfo.pixKeyType === 'email' ? 'E-mail' :
                                                bankInfo.pixKeyType.toUpperCase()
                                }</p>
                                <p className="text-lg font-mono bg-neutral-50 px-3 py-1 rounded border border-neutral-200 inline-block text-neutral-800">{bankInfo.pixKey}</p>
                                <p className="text-xs text-green-600 mt-2 flex items-center">
                                    <CheckCircleIcon /> <span className="ml-1">Conta verificada para recebimentos.</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500 mt-1">
                                ⚠️ Você ainda não configurou uma chave PIX para receber seus pagamentos.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setIsBankModalOpen(true)}
                        className="px-6 py-2 border border-primary text-primary rounded-full font-medium hover:bg-primary-50 transition-colors"
                    >
                        {bankInfo.pixKey ? 'Alterar Dados' : 'Configurar Agora'}
                    </button>
                </div>
            </div>

            {/* Request Payout Action */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-neutral-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-neutral-900">Solicitar Saque</h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Pagamentos são processados toda <span className="font-bold text-neutral-700">Terça-feira</span>. O valor cairá na sua conta cadastrada via PIX.
                        </p>
                    </div>
                    <button
                        onClick={handleRequestPayout}
                        disabled={!balance || balance.currentBalance < 70 || isRequesting}
                        className={`px-8 py-3 rounded-full font-bold shadow-md transition-all ${!balance || balance.currentBalance < 70
                                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                            }`}
                    >
                        {isRequesting ? 'Solicitando...' : 'Solicitar Pagamento'}
                    </button>
                </div>

                {requestSuccess && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start animate-fade-in-up">
                        <CheckCircleIcon />
                        <div className="ml-3">
                            <h4 className="font-bold text-green-800">Solicitação Realizada!</h4>
                            <p className="text-sm text-green-700 mt-1">
                                Seu pagamento foi agendado para <strong>{new Date(requestSuccess.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Histórico de Pagamentos</h2>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Data Solicitação</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Agendado Para</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Valor</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payouts.map((payout, index) => (
                            <tr key={payout.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                <td className="p-4 text-sm text-neutral-500">{new Date(payout.request_date).toLocaleDateString('pt-BR')}</td>
                                <td className="p-4 text-sm text-neutral-800 font-medium">
                                    {new Date(payout.scheduled_date).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-4 text-sm text-neutral-800 font-bold text-right">{payout.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="p-4 text-center">{getStatusBadge(payout.status)}</td>
                            </tr>
                        ))}
                        {payouts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-neutral-500">Nenhum histórico disponível.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bank Info Modal */}
            <Modal
                isOpen={isBankModalOpen}
                onClose={() => setIsBankModalOpen(false)}
                title="Dados de Recebimento"
            >
                <form onSubmit={handleSaveBankInfo}>
                    <div className="bg-blue-50 p-3 rounded-md mb-6 flex items-start text-sm text-blue-800">
                        <span className="mr-2 mt-0.5"><InfoIcon /></span>
                        O pagamento é feito exclusivamente via PIX para garantir agilidade e segurança.
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de Chave PIX</label>
                            <select
                                value={bankInfo.pixKeyType}
                                onChange={(e) => setBankInfo({ ...bankInfo, pixKeyType: e.target.value as any })}
                                className={inputClass}
                            >
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Telefone</option>
                                <option value="random">Chave Aleatória</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Chave PIX</label>
                            <input
                                type="text"
                                value={bankInfo.pixKey}
                                onChange={(e) => setBankInfo({ ...bankInfo, pixKey: e.target.value })}
                                placeholder="Digite sua chave pix..."
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                        <button
                            type="button"
                            onClick={() => setIsBankModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-full hover:bg-neutral-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingBank}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90"
                        >
                            {isSavingBank ? 'Salvando...' : 'Salvar Dados'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default PhotographerPayouts;