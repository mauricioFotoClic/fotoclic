import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ProducerWithStats, Page, User } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import { includesNormalized } from '../../utils/stringUtils';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Trophy, CheckCircle, XCircle, Search, ShieldCheck, AlertCircle, Building2, Phone, Mail, Calendar, Users } from 'lucide-react';

interface AdminProducersProps {
    onNavigate?: (page: Page) => void;
    onImpersonate?: (user: User) => void;
}

const AdminProducers: React.FC<AdminProducersProps> = ({ onNavigate, onImpersonate }) => {
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const [producers, setProducers] = useState<ProducerWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');

    const fetchProducers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getProducers(true);
            setProducers(data);
        } catch (error) {
            console.error("Failed to fetch producers:", error);
            showToast("Erro ao carregar lista de produtores", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchProducers();
    }, [fetchProducers]);

    const handleToggleStatus = async (producer: ProducerWithStats) => {
        const newStatus = !producer.is_active;
        const actionText = newStatus ? 'Aprovar e Liberar' : 'Bloquear / Desativar';

        const confirmed = await confirm({
            title: `${actionText} Produtor`,
            message: `Deseja realmente ${actionText.toLowerCase()} o produtor ${producer.name}?`,
            confirmText: actionText,
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            const success = await api.updateProducerStatus(producer.id, newStatus);
            if (success) {
                showToast(`Produtor ${producer.name} ${newStatus ? 'aprovado' : 'desativado'} com sucesso!`, 'success');
                fetchProducers();
            }
        } catch (err: any) {
            showToast(err.message || "Erro ao atualizar status", "error");
        }
    };

    const filteredProducers = useMemo(() => {
        return producers.filter(p => {
            const matchesSearch = includesNormalized(p.name, searchTerm) ||
                includesNormalized(p.email, searchTerm) ||
                (p.company_name && includesNormalized(p.company_name, searchTerm));

            if (!matchesSearch) return false;

            if (filterStatus === 'active') return p.is_active;
            if (filterStatus === 'pending') return !p.is_active;
            return true;
        });
    }, [producers, searchTerm, filterStatus]);

    const stats = useMemo(() => {
        const total = producers.length;
        const active = producers.filter(p => p.is_active).length;
        const pending = producers.filter(p => !p.is_active).length;
        const totalRevenue = producers.reduce((acc, p) => acc + (p.totalTeamRevenue || 0), 0);
        return { total, active, pending, totalRevenue };
    }, [producers]);

    return (
        <div className="space-y-6">
            {/* Header com Resumo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <Trophy size={20} />
                        </span>
                        <h1 className="text-2xl font-display font-bold text-gray-900">
                            Produtores de Eventos
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Gerencie as contas de organizadores de eventos, modere cadastros e acompanhe equipes
                    </p>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total de Produtores</div>
                    <div className="text-2xl font-display font-bold text-gray-900 mt-1">{stats.total}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Produtores Ativos</div>
                    <div className="text-2xl font-display font-bold text-emerald-700 mt-1">{stats.active}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Aguardando Moderação</div>
                    <div className="text-2xl font-display font-bold text-amber-600 mt-1">{stats.pending}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vendas da Rede</div>
                    <div className="text-2xl font-display font-bold text-primary mt-1">
                        {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative w-full sm:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, empresa ou e-mail..."
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-gray-900"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            filterStatus === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        Todos ({stats.total})
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            filterStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                    >
                        Pendentes ({stats.pending})
                    </button>
                    <button
                        onClick={() => setFilterStatus('active')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            filterStatus === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        Ativos ({stats.active})
                    </button>
                </div>
            </div>

            {/* Tabela de Produtores */}
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center">
                        <Spinner size="lg" />
                    </div>
                ) : filteredProducers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-700">Nenhum produtor encontrado</p>
                        <p className="text-xs text-gray-400 mt-1">Ajuste os filtros de busca para visualizar os cadastros</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-neutral-50/80 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-neutral-100">
                                <tr>
                                    <th className="py-3.5 px-4">Produtor / Empresa</th>
                                    <th className="py-3.5 px-4">Contato</th>
                                    <th className="py-3.5 px-4 text-center">Eventos</th>
                                    <th className="py-3.5 px-4 text-center">Fotógrafos</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredProducers.map((producer) => (
                                    <tr key={producer.id} className="hover:bg-neutral-50/60 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                                    {producer.avatar_url ? (
                                                        <img src={producer.avatar_url} alt={producer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        producer.name.slice(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{producer.name}</div>
                                                    {producer.company_name && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                                            <Building2 size={12} className="text-gray-400" />
                                                            <span>{producer.company_name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                                    <Mail size={13} className="text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[180px]">{producer.email}</span>
                                                </div>
                                                {producer.phone && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <Phone size={13} className="text-gray-400 shrink-0" />
                                                        <span>{producer.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
                                                <Calendar size={12} />
                                                {producer.eventsCount}
                                            </span>
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                                <Users size={12} />
                                                {producer.collaboratorsCount}
                                            </span>
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {producer.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                    <CheckCircle size={13} />
                                                    Ativo / Liberado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse">
                                                    <AlertCircle size={13} />
                                                    Pendente Moderação
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {producer.is_active ? (
                                                    <button
                                                        onClick={() => handleToggleStatus(producer)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                                                        title="Bloquear Acesso"
                                                    >
                                                        Bloquear
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleStatus(producer)}
                                                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                                                        title="Aprovar Cadastro"
                                                    >
                                                        <ShieldCheck size={14} />
                                                        Aprovar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProducers;
