
import React, { useEffect, useState, useCallback } from 'react';
import { Payout, BankInfo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import { useToast } from '../../contexts/ToastContext';

type Tab = 'pending' | 'history' | 'eligible';

const AdminPayouts: React.FC = () => {
    const { showToast } = useToast();
    const [payouts, setPayouts] = useState<(Payout & { photographer_name: string, bank_info?: BankInfo })[]>([]);
    const [eligiblePhotographers, setEligiblePhotographers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    // Process Payment Modal
    const [selectedPayout, setSelectedPayout] = useState<(Payout & { photographer_name: string, bank_info?: BankInfo }) | null>(null);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    // Auto Pix Transfer Modal
    const [selectedEligible, setSelectedEligible] = useState<any | null>(null);
    const [isAutoTransferModalOpen, setIsAutoTransferModalOpen] = useState(false);
    const [isTransferringAuto, setIsTransferringAuto] = useState(false);

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const [payoutsData, eligibleData] = await Promise.all([
                api.getAllPayouts(),
                api.getEligiblePhotographers()
            ]);
            setPayouts(payoutsData);
            setEligiblePhotographers(eligibleData);
        } catch (error) {
            console.error("Failed to fetch payouts and balances", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleOpenProcessModal = (payout: any) => {
        setSelectedPayout(payout);
        setIsProcessModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedPayout) return;
        setIsApproving(true);
        try {
            await api.approvePayout(selectedPayout.id);

            // Send email notification
            const { emailService } = await import('../../services/emailService');
            // To be safe, let's fetch the user to get the email:
            const user = await api.getPhotographerById(selectedPayout.photographer_id);
            if (user) {
                await emailService.sendPayoutProcessedEmail(
                    user.email,
                    user.name,
                    selectedPayout.amount,
                    new Date().toLocaleDateString('pt-BR')
                );
            }

            setIsProcessModalOpen(false);
            fetchAllData();
        } catch (error) {
            console.error("Error confirming payment:", error);
            showToast("Erro ao confirmar pagamento.", "error");
        } finally {
            setIsApproving(false);
        }
    };

    const handleOpenAutoTransferModal = (photographer: any) => {
        setSelectedEligible(photographer);
        setIsAutoTransferModalOpen(true);
    };

    const handleConfirmAutoTransfer = async (isManual: boolean = false) => {
        if (!selectedEligible) return;
        setIsTransferringAuto(true);
        try {
            await api.transferPayoutAutomatically(selectedEligible.photographer_id, isManual);
            showToast(isManual ? "Pagamento manual registrado com sucesso!" : "Transferência Pix automática realizada com sucesso!", "success");
            setIsAutoTransferModalOpen(false);
            fetchAllData();
        } catch (error: any) {
            console.error("Error performing auto transfer:", error);
            showToast("Erro ao transferir: " + error.message, "error");
        } finally {
            setIsTransferringAuto(false);
        }
    };

    const filteredPayouts = payouts.filter(p => {
        if (activeTab === 'pending') return p.status === 'pending' || p.status === 'processing';
        return p.status === 'paid' || p.status === 'rejected';
    });

    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando solicitações de saque..." />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-6">Gestão de Pagamentos</h1>

            <div className="flex space-x-4 mb-6 border-b border-neutral-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                    Solicitações Pendentes ({payouts.filter(p => p.status === 'pending').length})
                </button>
                <button
                    onClick={() => setActiveTab('eligible')}
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === 'eligible' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                    Saldos e Saques Automáticos ({eligiblePhotographers.filter(p => p.balance_available > 0).length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                    Histórico
                </button>
            </div>

            {activeTab === 'eligible' ? (
                <>
                    {/* Mobile cards para saldos */}
                    <div className="md:hidden space-y-3">
                        {eligiblePhotographers.map((item) => {
                            const isEligible = item.balance_available >= 100;
                            const hasPix = !!item.pixKey;
                            
                            return (
                                <div key={item.photographer_id} className="bg-white rounded-lg border border-neutral-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-neutral-800">{item.photographer_name}</span>
                                        {hasPix && item.balance_available > 0 ? (
                                            <button
                                                onClick={() => handleOpenAutoTransferModal(item)}
                                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors shadow-sm"
                                            >
                                                Pagar Pix
                                            </button>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-bold rounded-full bg-neutral-100 text-neutral-500">
                                                Inativo
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="bg-neutral-50 rounded p-2 text-center">
                                            <p className="text-[10px] text-neutral-500">Saldo Disponível</p>
                                            <p className="text-sm font-bold text-neutral-800">{item.balance_available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                        <div className="bg-neutral-50 rounded p-2 text-center">
                                            <p className="text-[10px] text-neutral-500">Total Pago</p>
                                            <p className="text-sm font-bold text-neutral-800">{item.total_withdrawn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs text-neutral-500">
                                        <div className="flex justify-between">
                                            <span>Frequência</span>
                                            <span className="capitalize">{item.payoutFrequency || 'diário'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Chave PIX</span>
                                            <span className={item.pixKey ? 'text-neutral-700 font-mono truncate max-w-[120px]' : 'text-red-500'}>
                                                {item.pixKey ? `${item.pixKey} (${item.pixKeyType})` : 'Não cadastrada'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Status</span>
                                            <span className={`font-bold ${!hasPix ? 'text-red-500' : isEligible ? 'text-green-600' : 'text-orange-500'}`}>
                                                {!hasPix ? 'Sem Pix' : isEligible ? 'Elegível (>= R$ 100)' : 'Abaixo do Mínimo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {eligiblePhotographers.length === 0 && <p className="text-center py-8 text-neutral-500 bg-white rounded-lg">Nenhum fotógrafo cadastrado.</p>}
                    </div>

                    {/* Desktop table para saldos */}
                    <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full table-fixed">
                            <colgroup>
                                <col style={{ width: '16%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '26%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '10%' }} />
                            </colgroup>
                            <thead className="bg-neutral-100">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Fotógrafo</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wide">Freq.</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wide">Total Pago</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wide">Saldo Disp.</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Chave PIX</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wide">Status</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wide">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {eligiblePhotographers.map((item, index) => {
                                    const isEligible = item.balance_available >= 100;
                                    const hasPix = !!item.pixKey;
                                    const canTransfer = hasPix && item.balance_available > 0;
                                    const pixDisplay = item.pixKey
                                        ? `${item.pixKey}`
                                        : null;
                                    const pixType = item.pixKeyType ? item.pixKeyType.toUpperCase() : '';

                                    return (
                                        <tr key={item.photographer_id} className={`hover:bg-primary/5 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}`}>
                                            {/* Fotógrafo */}
                                            <td className="px-3 py-2.5">
                                                <span className="block text-sm font-semibold text-neutral-800 truncate" title={item.photographer_name}>
                                                    {item.photographer_name}
                                                </span>
                                                <span className="block text-xs text-neutral-400 truncate" title={item.email}>
                                                    {item.email || '—'}
                                                </span>
                                            </td>
                                            {/* Frequência */}
                                            <td className="px-3 py-2.5 text-center">
                                                <span className="text-xs font-medium text-neutral-600 capitalize whitespace-nowrap">
                                                    {item.payoutFrequency || 'Diário'}
                                                </span>
                                            </td>
                                            {/* Total Pago */}
                                            <td className="px-3 py-2.5 text-right">
                                                <span className="text-sm text-neutral-500 whitespace-nowrap">
                                                    {item.total_withdrawn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </td>
                                            {/* Saldo Disponível */}
                                            <td className="px-3 py-2.5 text-right">
                                                <span className={`text-sm font-bold whitespace-nowrap ${item.balance_available > 0 ? 'text-neutral-800' : 'text-neutral-400'}`}>
                                                    {item.balance_available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </td>
                                            {/* Chave PIX */}
                                            <td className="px-3 py-2.5">
                                                {pixDisplay ? (
                                                    <div className="group relative flex items-center gap-1.5">
                                                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-500 rounded uppercase flex-shrink-0">
                                                            {pixType}
                                                        </span>
                                                        <span className="text-xs font-mono text-neutral-700 truncate" title={pixDisplay}>
                                                            {pixDisplay}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-red-500 whitespace-nowrap">Não cadastrada</span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                                    !hasPix
                                                        ? 'bg-red-100 text-red-700'
                                                        : isEligible
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {!hasPix ? 'Sem Pix' : isEligible ? 'Elegível' : '< Mínimo'}
                                                </span>
                                            </td>
                                            {/* Ação */}
                                            <td className="px-3 py-2.5 text-center">
                                                {canTransfer ? (
                                                    <button
                                                        onClick={() => handleOpenAutoTransferModal(item)}
                                                        className="px-3 py-1 text-xs font-bold text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                                                    >
                                                        Pagar
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-neutral-300 font-medium">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {eligiblePhotographers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-neutral-400 text-sm">Nenhum fotógrafo cadastrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {filteredPayouts.map((payout) => (
                            <div key={payout.id} className="bg-white rounded-lg border border-neutral-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold text-neutral-800">{payout.photographer_name}</span>
                                    {payout.status === 'pending' ? (
                                        <button
                                            onClick={() => handleOpenProcessModal(payout)}
                                            className="px-3 py-1 text-xs font-medium text-white bg-primary-dark rounded-full hover:bg-primary-dark transition-colors"
                                        >
                                            Processar
                                        </button>
                                    ) : (
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${payout.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {payout.status === 'paid' ? 'Pago' : 'Rejeitado'}
                                        </span>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-green-600 mb-3">
                                    {payout.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                                <div className="space-y-1 text-xs text-neutral-500">
                                    <div className="flex justify-between">
                                        <span>Solicitado</span>
                                        <span>{new Date(payout.request_date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Agendado</span>
                                        <span>{new Date(payout.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Chave PIX</span>
                                        <span className={payout.bank_info ? 'text-neutral-700' : 'text-red-500'}>
                                            {payout.bank_info ? `${payout.bank_info.pixKey} (${payout.bank_info.pixKeyType})` : 'Não cadastrada'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredPayouts.length === 0 && <p className="text-center py-8 text-neutral-500 bg-white rounded-lg">Nenhum registro encontrado.</p>}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full min-w-[960px]">
                            <thead className="bg-neutral-100">
                                <tr>
                                    <th className="p-4 text-left text-sm font-semibold text-neutral-600">Fotógrafo</th>
                                    <th className="p-4 text-left text-sm font-semibold text-neutral-600">Solicitado em</th>
                                    <th className="p-4 text-left text-sm font-semibold text-neutral-600">Agendado Para</th>
                                    <th className="p-4 text-right text-sm font-semibold text-neutral-600">Valor</th>
                                    <th className="p-4 text-center text-sm font-semibold text-neutral-600">Chave PIX</th>
                                    <th className="p-4 text-center text-sm font-semibold text-neutral-600">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayouts.map((payout, index) => (
                                    <tr key={payout.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                        <td className="p-4 text-sm font-medium text-neutral-800">{payout.photographer_name}</td>
                                        <td className="p-4 text-sm text-neutral-500">{new Date(payout.request_date).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 text-sm text-neutral-800 font-medium">
                                            {new Date(payout.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                                        </td>
                                        <td className="p-4 text-sm text-green-600 font-bold text-right">
                                            {payout.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="p-4 text-sm text-neutral-500 text-center">
                                            {payout.bank_info ? `${payout.bank_info.pixKey} (${payout.bank_info.pixKeyType})` : <span className="text-red-500">Não cadastrada</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            {payout.status === 'pending' ? (
                                                <button
                                                    onClick={() => handleOpenProcessModal(payout)}
                                                    className="px-3 py-1 text-xs font-medium text-white bg-primary-dark rounded-full hover:bg-primary-dark transition-colors shadow-sm"
                                                >
                                                    Processar
                                                </button>
                                            ) : (
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${payout.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {payout.status === 'paid' ? 'Pago' : 'Rejeitado'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredPayouts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center p-8 text-neutral-500">Nenhum registro encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Payment Process Modal */}
            <Modal
                isOpen={isProcessModalOpen}
                onClose={() => setIsProcessModalOpen(false)}
                title="Processar Pagamento Manual"
            >
                {selectedPayout && (
                    <div className="space-y-6">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                            <strong>Atenção Admin:</strong> Realize a transferência bancária manualmente usando os dados abaixo. Após o sucesso da transação no seu banco, clique em "Confirmar Transferência" para dar baixa no sistema.
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between border-b border-neutral-100 pb-2">
                                <span className="text-neutral-500">Beneficiário</span>
                                <span className="font-bold text-neutral-800">{selectedPayout.photographer_name}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-100 pb-2">
                                <span className="text-neutral-500">Valor a Pagar</span>
                                <span className="font-bold text-green-600 text-lg">{selectedPayout.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-neutral-500">Chave PIX</span>
                                <div className="text-right">
                                    <span className="block font-mono bg-neutral-100 px-2 py-1 rounded">{selectedPayout.bank_info?.pixKey || 'N/A'}</span>
                                    <span className="text-xs text-neutral-400 uppercase">{selectedPayout.bank_info?.pixKeyType}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                onClick={() => setIsProcessModalOpen(false)}
                                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={isApproving}
                                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center"
                            >
                                {isApproving ? 'Confirmando...' : 'Confirmar Transferência Realizada'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Auto Pix Transfer Modal */}
            <Modal
                isOpen={isAutoTransferModalOpen}
                onClose={() => setIsAutoTransferModalOpen(false)}
                title="Liberar Saque via Pix Automático"
            >
                {selectedEligible && (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-sm text-emerald-800">
                            <strong>Pix Automático ou Registro Manual:</strong> Você pode tentar enviar o Pix automaticamente via AbacatePay ou, caso prefira (ou em caso de erro na API), realizar a transferência Pix a partir do aplicativo do seu banco e clicar em <strong>Registrar Pagamento Manual</strong> para dar baixa no sistema e notificar o fotógrafo.
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between border-b border-neutral-100 pb-2">
                                <span className="text-neutral-500">Fotógrafo</span>
                                <span className="font-bold text-neutral-800">{selectedEligible.photographer_name}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-100 pb-2">
                                <span className="text-neutral-500">Saldo Disponível (Bruto)</span>
                                <span className="font-bold text-neutral-800">{selectedEligible.balance_available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-100 pb-2">
                                <span className="text-neutral-500">Taxa de Saque Pix</span>
                                <span className="font-bold text-red-600">- R$ 0,80</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-100 pb-2">
                                <span className="text-neutral-500">Valor Líquido a Transferir</span>
                                <span className="font-bold text-green-600 text-lg">{(selectedEligible.balance_available - 0.80).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-neutral-500">Chave PIX de Destino</span>
                                <div className="text-right">
                                    <span className="block font-mono bg-neutral-100 px-2 py-1 rounded">{selectedEligible.pixKey || 'N/A'}</span>
                                    <span className="text-xs text-neutral-400 uppercase">{selectedEligible.pixKeyType}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                onClick={() => setIsAutoTransferModalOpen(false)}
                                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleConfirmAutoTransfer(true)}
                                disabled={isTransferringAuto}
                                className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 shadow-md flex items-center transition-colors"
                            >
                                Registrar Pagamento Manual
                            </button>
                            <button
                                onClick={() => handleConfirmAutoTransfer(false)}
                                disabled={isTransferringAuto}
                                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center transition-colors"
                            >
                                {isTransferringAuto ? 'Processando...' : 'Enviar Pix Automático'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminPayouts;


