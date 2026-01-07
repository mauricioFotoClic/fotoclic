import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface StorageRequest {
    id: string;
    photographer_id: string;
    photographer_name: string;
    photographer_email: string;
    photographer_avatar?: string;
    current_limit: number;
    approved_limit?: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

const AdminStorageRequests: React.FC = () => {
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [requests, setRequests] = useState<StorageRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');

    // Limits State
    const [newLimits, setNewLimits] = useState<Record<string, number>>({});

    // Modal State
    // const [isApproveModalOpen, setIsApproveModalOpen] = useState(false); // Removed
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<StorageRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchRequests();
    }, [filterStatus]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const status = filterStatus === 'all' ? null : filterStatus;
            const data = await api.getStorageRequests(status);
            setRequests(data);
        } catch (error) {
            console.error(error);
            showToast("Erro ao buscar solicitações.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (reqId: string, value: number) => {
        setNewLimits(prev => ({ ...prev, [reqId]: value }));
    };

    /* const handleOpenApprove = (req: StorageRequest) => { ... } Removed */

    const handleOpenReject = (req: StorageRequest) => {
        setSelectedRequest(req);
        setRejectReason('');
        setIsRejectModalOpen(true);
    };

    const handleApprove = async (req: StorageRequest) => {
        // Use the limit from state, or default to current + 50
        const limitToApprove = newLimits[req.id] ?? (req.current_limit + 50);

        const isConfirmed = await confirm({
            title: "Confirmar Aprovação",
            message: `Deseja aumentar o limite de ${req.photographer_name} para ${limitToApprove} fotos?`,
            confirmText: "Aprovar",
            variant: "primary"
        });

        if (!isConfirmed) return;

        try {
            const res = await api.approveStorageRequest(req.id, limitToApprove);
            if (res.success) {
                // If checking all, update status. If pending only, it filters out naturally or we update manually.
                // Assuming we want to reflect the change immediately in UI without refetch if possible.
                setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', approved_limit: limitToApprove } : r));

                // Clean up limit state
                setNewLimits(prev => {
                    const newState = { ...prev };
                    delete newState[req.id];
                    return newState;
                });
                showToast("Solicitação aprovada com sucesso!", "success");
            } else {
                showToast(res.error || "Erro ao aprovar solicitação.", "error");
            }
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Erro desconhecido.", "error");
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        const isConfirmed = await confirm({
            title: "Rejeitar Solicitação",
            message: "Tem certeza que deseja rejeitar esta solicitação?",
            confirmText: "Rejeitar",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            const res = await api.rejectStorageRequest(selectedRequest.id, rejectReason);
            if (res.success) {
                setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
                setIsRejectModalOpen(false);
                setSelectedRequest(null);
                showToast("Solicitação rejeitada.", "info");
            } else {
                showToast(res.error || "Erro ao rejeitar solicitação.", "error");
            }
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Erro desconhecido.", "error");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-neutral-800">Solicitações de Aumento de Limite</h1>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="border border-neutral-300 rounded-md px-3 py-2"
                >
                    <option value="pending">Pendentes</option>
                    <option value="approved">Aprovadas</option>
                    <option value="rejected">Rejeitadas</option>
                    <option value="all">Todas</option>
                </select>
            </div>

            {loading ? (
                <div className="text-center py-10">Carregando...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-10 text-neutral-500">Nenhuma solicitação encontrada.</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Fotógrafo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Limite Atual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Novo Limite</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {req.photographer_avatar && (
                                                <img className="h-8 w-8 rounded-full mr-2" src={req.photographer_avatar} alt="" />
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-neutral-900">{req.photographer_name}</div>
                                                <div className="text-sm text-neutral-500">{req.photographer_email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                        {req.current_limit} Fotos
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                        {req.status === 'pending' ? (
                                            <div className="flex items-center max-w-[120px]">
                                                <input
                                                    type="number"
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
                                                    value={newLimits[req.id] ?? (req.current_limit + 50)}
                                                    onChange={(e) => handleLimitChange(req.id, parseInt(e.target.value))}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-neutral-600 font-medium">
                                                {req.approved_limit ? `${req.approved_limit} Fotos` : '-'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {req.status === 'pending' && (
                                            <div className="flex justify-end items-center gap-2">
                                                <button onClick={() => handleApprove(req)} className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded text-xs font-semibold transition-colors">Aprovar</button>
                                                <button onClick={() => handleOpenReject(req)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-semibold transition-colors">Rejeitar</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Approve Modal Removed */}

            {/* Reject Modal */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Rejeitar Solicitação</h3>
                        <p className="mb-4">Motivo da rejeição (será enviado ao fotógrafo):</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 mb-4 h-24"
                            placeholder="Ex: Você ainda não atingiu o limite atual..."
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Rejeitar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStorageRequests;
