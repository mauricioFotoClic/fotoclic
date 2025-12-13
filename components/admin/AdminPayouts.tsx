
import React, { useEffect, useState, useCallback } from 'react';
import { Payout, BankInfo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';

type Tab = 'pending' | 'history';

const AdminPayouts: React.FC = () => {
    const [payouts, setPayouts] = useState<(Payout & { photographer_name: string, bank_info?: BankInfo })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    
    // Process Payment Modal
    const [selectedPayout, setSelectedPayout] = useState<(Payout & { photographer_name: string, bank_info?: BankInfo }) | null>(null);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    const fetchPayouts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getAllPayouts();
            setPayouts(data);
        } catch (error) {
            console.error("Failed to fetch payouts", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    const handleOpenProcessModal = (payout: any) => {
        setSelectedPayout(payout);
        setIsProcessModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedPayout) return;
        setIsApproving(true);
        try {
            await api.approvePayout(selectedPayout.id);
            setIsProcessModalOpen(false);
            fetchPayouts();
        } catch (error) {
            alert("Erro ao confirmar pagamento.");
        } finally {
            setIsApproving(false);
        }
    };

    const filteredPayouts = payouts.filter(p => {
        if (activeTab === 'pending') return p.status === 'pending' || p.status === 'processing';
        return p.status === 'paid' || p.status === 'rejected';
    });

    if (loading) return <Spinner />;

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
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                    Histórico
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
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
                                           className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
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

            {/* Payment Process Modal */}
            <Modal
                isOpen={isProcessModalOpen}
                onClose={() => setIsProcessModalOpen(false)}
                title="Processar Pagamento"
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
        </div>
    );
};

export default AdminPayouts;
