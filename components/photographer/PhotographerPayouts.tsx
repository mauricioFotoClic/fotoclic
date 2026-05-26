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

    const applyMask = (value: string, type: string) => {
        if (!value) return '';
        if (type === 'cpf') {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .substring(0, 14);
        }
        if (type === 'cnpj') {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})/, '$1-$2')
                .substring(0, 18);
        }
        if (type === 'phone') {
            let v = value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length > 10) {
                return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (v.length > 6) {
                return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else if (v.length > 2) {
                return v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            } else {
                return v;
            }
        }
        if (type === 'email') {
            return value.trim();
        }
        return value;
    };

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

    const handleRequestPayout = () => {
        alert("O sistema agora processa os pagamentos automaticamente conforme sua frequência escolhida (diário, semanal ou mensal) sempre que você atingir o saldo mínimo de R$ 100,00.");
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

    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando central financeira..." />;

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Ganhos Totais</p>
                    <p className="text-xl font-bold text-neutral-800">
                        {balance ? balance.totalEarnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </p>
                </div>
                
                <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100 relative group">
                    <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-orange-500 font-bold uppercase tracking-wider">Saldo Pendente (7 dias)</p>
                        <div className="relative flex items-center">
                            <div className="text-neutral-300 hover:text-neutral-500 cursor-help transition-colors">
                                <InfoIcon />
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-800 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none text-center leading-tight normal-case font-normal">
                                Valores de vendas recentes que estão aguardando o prazo de segurança de 7 dias.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800"></div>
                            </div>
                        </div>
                    </div>
                    <p className="text-xl font-bold text-orange-500">
                        {balance ? (balance.balance_pending || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </p>
                </div>

                <div className="bg-emerald-50 p-5 rounded-lg shadow-sm border border-emerald-100 relative group">
                    <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Saldo Disponível</p>
                        <div className="relative flex items-center">
                            <div className="text-neutral-300 hover:text-neutral-500 cursor-help transition-colors">
                                <InfoIcon />
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-800 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none text-center leading-tight normal-case font-normal">
                                Saldo liberado para saque automático. Mínimo para saque: R$ 100,00.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800"></div>
                            </div>
                        </div>
                    </div>
                    <p className="text-xl font-bold text-emerald-600">
                        {balance ? (balance.balance_available || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </p>
                </div>

                <div className="bg-blue-50 p-5 rounded-lg shadow-sm border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Recebido</p>
                    <p className="text-xl font-bold text-blue-600">
                        {balance ? (balance.totalPaid || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </p>
                </div>
            </div>


            {/* Configured Payment Method Display */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-neutral-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-neutral-900 flex items-center">
                            <span className="mr-2">🏦</span> Dados de Recebimento
                        </h3>
                        {user.pix_key || bankInfo.pixKey ? (
                            <div className="mt-2 text-sm text-neutral-600">
                                <div className="flex flex-wrap gap-4 mb-2">
                                    <p><span className="font-semibold text-neutral-800">Tipo:</span> {
                                        (user.pix_key_type || bankInfo.pixKeyType) === 'random' ? 'Chave Aleatória' :
                                            (user.pix_key_type || bankInfo.pixKeyType) === 'phone' ? 'Telefone' :
                                                (user.pix_key_type || bankInfo.pixKeyType) === 'email' ? 'E-mail' :
                                                    (user.pix_key_type || bankInfo.pixKeyType || 'CPF').toUpperCase()
                                    }</p>
                                    <p><span className="font-semibold text-neutral-800">Frequência:</span> <span className="capitalize">{user.payout_frequency || 'diário'}</span></p>
                                </div>
                                <p className="text-lg font-mono bg-neutral-50 px-3 py-1 rounded border border-neutral-200 inline-block text-neutral-800">{user.pix_key || bankInfo.pixKey}</p>
                                <p className="text-[10px] text-neutral-400 mt-1 italic">
                                    * Será descontada a taxa de saque da processadora de pagamentos no ato da transferência, além da taxa de 6% do FotoClic.
                                </p>
                                <p className="text-xs text-green-600 mt-2 flex items-center">
                                    <CheckCircleIcon /> <span className="ml-1">Conta configurada para saques automáticos.</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500 mt-1">
                                ⚠️ Você ainda não configurou sua carteira para receber pagamentos.
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
            <div className="bg-emerald-600 p-6 rounded-lg shadow-md mb-8 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 -mr-8 -mt-8">
                   <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="font-bold text-xl mb-1">Status de Pagamento Automático</h3>
                        <p className="text-emerald-100 text-sm max-w-md">
                            O sistema processa saques automaticamente sempre que seu **Saldo Disponível** atinge **R$ 100,00**, respeitando sua frequência escolhida. 
                            <span className="block mt-1 font-bold text-white bg-emerald-700/50 p-2 rounded inline-block">⚠️ No ato do saque, a taxa da processadora de pagamentos será descontada (além da taxa de 6% do FotoClic).</span>
                        </p>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-sm text-emerald-100 uppercase tracking-wider font-bold mb-1">Próximo Gatilho</p>
                        <p className="text-2xl font-display font-bold">
                            {balance && balance.balance_available && balance.balance_available >= 100 
                                ? 'Pronto para Saque!' 
                                : `Faltam ${(100 - (balance?.balance_available || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </p>
                    </div>
                </div>
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
                    <div className="bg-primary/10 p-3 rounded-md mb-6 flex items-start text-sm text-primary">
                        <span className="mr-2 mt-0.5"><InfoIcon /></span>
                        <div>
                            <p>O pagamento é feito exclusivamente via PIX para garantir agilidade e segurança.</p>
                            <p className="font-bold mt-1">⚠️ Importante: A taxa de transferência da processadora de pagamentos será descontada do valor no ato do saque. Esse é um custo de processamento adicional à taxa de serviço de 6% do FotoClic.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de Chave PIX</label>
                                <select
                                    value={bankInfo.pixKeyType}
                                    onChange={(e) => setBankInfo({ ...bankInfo, pixKeyType: e.target.value as any, pixKey: '' })}
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
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Frequência de Saque</label>
                                <select
                                    value={(bankInfo as any).payoutFrequency || user.payout_frequency || 'diario'}
                                    onChange={(e) => setBankInfo({ ...bankInfo, payoutFrequency: e.target.value } as any)}
                                    className={inputClass}
                                >
                                    <option value="diario">Diário</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="mensal">Mensal</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Chave PIX</label>
                            <input
                                type={bankInfo.pixKeyType === 'email' ? 'email' : 'text'}
                                value={bankInfo.pixKey}
                                onChange={(e) => setBankInfo({ ...bankInfo, pixKey: applyMask(e.target.value, bankInfo.pixKeyType) })}
                                placeholder={
                                    bankInfo.pixKeyType === 'cpf' ? '000.000.000-00' :
                                    bankInfo.pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                                    bankInfo.pixKeyType === 'phone' ? '(00) 00000-0000' :
                                    bankInfo.pixKeyType === 'email' ? 'email@exemplo.com' :
                                    'Digite sua chave aleatória...'
                                }
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

