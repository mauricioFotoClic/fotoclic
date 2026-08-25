import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, PhotoEvent, EventCollaborator, Category, Page } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
    Trophy, Plus, Users, Calendar, DollarSign, 
    CheckCircle2, Clock, Trash2, Mail, ExternalLink, 
    Wallet, ShieldCheck, MapPin, Sparkles, Building2, UserPlus, Sliders
} from 'lucide-react';

interface ProducerDashboardPageProps {
    currentUser: User;
    onNavigate: (page: Page) => void;
}

type TabType = 'events' | 'team' | 'sales' | 'wallet';

const ProducerDashboardPage: React.FC<ProducerDashboardPageProps> = ({ currentUser, onNavigate }) => {
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const [activeTab, setActiveTab] = useState<TabType>('events');
    const [events, setEvents] = useState<PhotoEvent[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected event for team management
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
    const [loadingCollabs, setLoadingCollabs] = useState(false);

    // Modal state: Create Event
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventFormData, setEventFormData] = useState({
        name: '',
        description: '',
        category_id: '',
        location: '',
        event_date: new Date().toISOString().split('T')[0],
        cover_photo_url: '',
        producer_commission_percent: 15
    });
    const [savingEvent, setSavingEvent] = useState(false);

    // Modal state: Invite Photographer
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteCommission, setInviteCommission] = useState(15);
    const [inviting, setInviting] = useState(false);

    // PIX Key configuration
    const [pixKey, setPixKey] = useState(currentUser.pix_key || '');
    const [savingPix, setSavingPix] = useState(false);

    // Sales data
    const [sales, setSales] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [eventsData, categoriesData] = await Promise.all([
                api.getProducerEvents(currentUser.id),
                api.getCategories()
            ]);
            setEvents(eventsData);
            setCategories(categoriesData);

            if (eventsData.length > 0 && !selectedEventId) {
                setSelectedEventId(eventsData[0].id);
            }
        } catch (error) {
            console.error("Failed to load producer data:", error);
            showToast("Erro ao carregar dados do painel", "error");
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, selectedEventId, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch collaborators when selectedEventId changes
    const fetchCollaborators = useCallback(async () => {
        if (!selectedEventId) {
            setCollaborators([]);
            return;
        }
        setLoadingCollabs(true);
        try {
            const data = await api.getEventCollaborators(selectedEventId);
            setCollaborators(data);
        } catch (error) {
            console.error("Failed to fetch collaborators:", error);
        } finally {
            setLoadingCollabs(false);
        }
    }, [selectedEventId]);

    useEffect(() => {
        fetchCollaborators();
    }, [fetchCollaborators]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventFormData.name || !eventFormData.category_id || !eventFormData.event_date) {
            showToast("Preencha todos os campos obrigatórios", "error");
            return;
        }

        setSavingEvent(true);
        try {
            const newEvent = await api.createEvent({
                name: eventFormData.name,
                description: eventFormData.description,
                category_id: eventFormData.category_id,
                location: eventFormData.location,
                event_date: eventFormData.event_date,
                cover_photo_url: eventFormData.cover_photo_url,
                photographer_id: currentUser.id,
                producer_id: currentUser.id,
                producer_commission_percent: Number(eventFormData.producer_commission_percent)
            } as any);

            showToast("Evento criado com sucesso! Agora você pode convidar sua equipe.", "success");
            setIsEventModalOpen(false);
            setEventFormData({
                name: '',
                description: '',
                category_id: '',
                location: '',
                event_date: new Date().toISOString().split('T')[0],
                cover_photo_url: '',
                producer_commission_percent: 15
            });
            fetchData();
            if (newEvent?.id) {
                setSelectedEventId(newEvent.id);
                setActiveTab('team');
            }
        } catch (error: any) {
            showToast(error.message || "Erro ao criar evento", "error");
        } finally {
            setSavingEvent(false);
        }
    };

    const handleInviteCollaborator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventId || !inviteEmail) {
            showToast("Digite o e-mail do fotógrafo", "error");
            return;
        }

        if (collaborators.length >= 10) {
            showToast("Limite máximo de 10 fotógrafos por evento atingido", "error");
            return;
        }

        setInviting(true);
        try {
            await api.inviteEventCollaborator({
                eventId: selectedEventId,
                producerId: currentUser.id,
                email: inviteEmail,
                commissionPercent: inviteCommission
            });

            showToast(`Convite enviado para ${inviteEmail}!`, "success");
            setIsInviteModalOpen(false);
            setInviteEmail('');
            fetchCollaborators();
        } catch (error: any) {
            showToast(error.message || "Erro ao convidar fotógrafo", "error");
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveCollaborator = async (collaborator: EventCollaborator) => {
        const confirmed = await confirm({
            title: "Remover Fotógrafo da Equipe",
            message: `Deseja remover ${collaborator.photographer?.name || collaborator.invited_email} deste evento?`,
            confirmText: "Remover",
            cancelText: "Cancelar"
        });

        if (!confirmed) return;

        try {
            await api.removeEventCollaborator(collaborator.id);
            showToast("Fotógrafo removido da equipe.", "success");
            fetchCollaborators();
        } catch (error: any) {
            showToast(error.message || "Erro ao remover fotógrafo", "error");
        }
    };

    const handleSavePix = async () => {
        if (!pixKey) {
            showToast("Informe sua chave Pix", "error");
            return;
        }
        setSavingPix(true);
        try {
            await api.updateUser(currentUser.id, { pix_key: pixKey } as any);
            showToast("Chave Pix salva com sucesso!", "success");
        } catch (error: any) {
            showToast(error.message || "Erro ao salvar chave Pix", "error");
        } finally {
            setSavingPix(false);
        }
    };

    const selectedEvent = useMemo(() => {
        return events.find(e => e.id === selectedEventId) || events[0];
    }, [events, selectedEventId]);

    const totalCommissions = 0; // Calculado via vendas do produtor

    return (
        <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 👑 Banner Principal do Produtor */}
                <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
                                <Trophy size={32} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-display font-bold">
                                        {currentUser.company_name || currentUser.name}
                                    </h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Produtor Oficial
                                    </span>
                                </div>
                                <p className="text-neutral-400 text-sm mt-1 flex items-center gap-2">
                                    <Building2 size={14} />
                                    Painel de Coordenação de Eventos & Gestão de Equipe
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => setIsEventModalOpen(true)}
                                className="px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Plus size={18} />
                                Novo Evento
                            </button>
                        </div>
                    </div>

                    {/* Resumo de Métricas Rápidas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-700/50">
                        <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                            <div className="text-xs text-neutral-400">Eventos Produzidos</div>
                            <div className="text-xl font-bold text-white mt-0.5">{events.length}</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                            <div className="text-xs text-neutral-400">Fotógrafos Conectados</div>
                            <div className="text-xl font-bold text-amber-400 mt-0.5">{collaborators.length} / 10</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                            <div className="text-xs text-neutral-400">Taxa Padrão de Coordenação</div>
                            <div className="text-xl font-bold text-emerald-400 mt-0.5">15%</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                            <div className="text-xs text-neutral-400">Comissões Acumuladas</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {totalCommissions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🗂️ Abas de Navegação */}
                <div className="bg-white p-2 rounded-2xl border border-neutral-100 shadow-sm flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            activeTab === 'events'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-neutral-100'
                        }`}
                    >
                        <Calendar size={18} />
                        Meus Eventos ({events.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            activeTab === 'team'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-neutral-100'
                        }`}
                    >
                        <Users size={18} />
                        Equipe de Fotógrafos
                    </button>

                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            activeTab === 'sales'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-neutral-100'
                        }`}
                    >
                        <DollarSign size={18} />
                        Extrato de Vendas & Splits
                    </button>

                    <button
                        onClick={() => setActiveTab('wallet')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            activeTab === 'wallet'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-neutral-100'
                        }`}
                    >
                        <Wallet size={18} />
                        Saques & Chave Pix
                    </button>
                </div>

                {/* 📋 CONTEÚDO DAS ABAS */}

                {/* ABA 1: MEUS EVENTOS */}
                {activeTab === 'events' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
                        ) : events.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl border border-neutral-100 text-center shadow-sm">
                                <Calendar size={48} className="mx-auto mb-3 text-neutral-300" />
                                <h3 className="text-lg font-bold text-gray-800">Você ainda não criou nenhum evento</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                                    Crie seu primeiro evento esportivo ou festival e convide fotógrafos para montar sua equipe de cobertura.
                                </p>
                                <button
                                    onClick={() => setIsEventModalOpen(true)}
                                    className="mt-5 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition cursor-pointer"
                                >
                                    Criar Meu Primeiro Evento
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {events.map((event) => (
                                    <div key={event.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                                        <div className="relative h-44 bg-neutral-100 overflow-hidden">
                                            {event.cover_photo_url ? (
                                                <img src={event.cover_photo_url} alt={event.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-neutral-200">
                                                    <Calendar size={36} />
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                                <Sliders size={12} className="text-amber-400" />
                                                {event.producer_commission_percent || 15}% Comissão
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">
                                                    {event.name}
                                                </h3>
                                                <div className="space-y-1.5 text-xs text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400 shrink-0" />
                                                        <span>{new Date(event.event_date).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    {event.location && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} className="text-gray-400 shrink-0" />
                                                            <span className="truncate">{event.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                                                <button
                                                    onClick={() => {
                                                        setSelectedEventId(event.id);
                                                        setActiveTab('team');
                                                    }}
                                                    className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Users size={14} />
                                                    Gerenciar Equipe (até 10) ➔
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 2: EQUIPE DE FOTÓGRAFOS (ATÉ 10 POR EVENTO) */}
                {activeTab === 'team' && (
                    <div className="space-y-6">
                        {/* Seletor de Evento Ativo */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                    Selecione o Evento
                                </label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[280px]"
                                >
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.name} ({new Date(ev.event_date).toLocaleDateString('pt-BR')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-gray-400">Vagas da Equipe</div>
                                    <div className="font-bold text-sm text-gray-800">{collaborators.length} de 10 preenchidas</div>
                                </div>
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    disabled={collaborators.length >= 10 || !selectedEventId}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <UserPlus size={16} />
                                    Convidar Fotógrafo
                                </button>
                            </div>
                        </div>

                        {/* Lista de Fotógrafos da Equipe */}
                        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-neutral-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    Fotógrafos Convocados para {selectedEvent?.name}
                                </h3>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                                    {10 - collaborators.length} vagas disponíveis
                                </span>
                            </div>

                            {loadingCollabs ? (
                                <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
                            ) : collaborators.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <Users size={36} className="mx-auto mb-2 text-gray-300" />
                                    <p className="font-bold text-gray-700">Nenhum fotógrafo convidado para este evento ainda</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Clique em "Convidar Fotógrafo" para adicionar profissionais que receberão acesso de upload neste evento.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-100">
                                    {collaborators.map((collab, index) => (
                                        <div key={collab.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-neutral-100 text-gray-700 font-bold flex items-center justify-center text-sm shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">
                                                        {collab.photographer?.name || collab.invited_email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                        <Mail size={12} className="text-gray-400" />
                                                        <span>{collab.invited_email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400">Sua Comissão</div>
                                                    <div className="font-bold text-sm text-amber-600">
                                                        {collab.coordinator_commission_percent}%
                                                    </div>
                                                </div>

                                                <div>
                                                    {collab.status === 'accepted' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 size={13} />
                                                            Confirmado
                                                        </span>
                                                    ) : collab.status === 'declined' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                                            Recusado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock size={13} />
                                                            Pendente
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveCollaborator(collab)}
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                                                    title="Remover da Equipe"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA 3: VENDAS & SPLIT */}
                {activeTab === 'sales' && (
                    <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-lg">Extrato de Vendas & Comissões</h3>
                            <span className="text-xs text-gray-500">Split automático em tempo real via Appmax</span>
                        </div>

                        <div className="p-12 text-center text-gray-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                            <DollarSign size={36} className="mx-auto mb-2 text-neutral-300" />
                            <p className="font-bold text-gray-700">Nenhuma venda gerada pela equipe ainda</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                Assim que os fotógrafos enviarem as fotos e os clientes efetuarem compras, sua comissão de produtor será creditada automaticamente aqui.
                            </p>
                        </div>
                    </div>
                )}

                {/* ABA 4: SAQUES & CHAVE PIX */}
                {activeTab === 'wallet' && (
                    <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm max-w-xl mx-auto space-y-6">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <Wallet size={20} className="text-primary" />
                                Configurações de Recebimento Pix
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Cadastre sua chave Pix para receber os repasses automáticos das suas comissões de produtor.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Chave Pix para Recebimento
                                </label>
                                <input
                                    type="text"
                                    value={pixKey}
                                    onChange={(e) => setPixKey(e.target.value)}
                                    placeholder="CPF, CNPJ, E-mail ou Telefone"
                                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 font-medium"
                                />
                            </div>

                            <button
                                onClick={handleSavePix}
                                disabled={savingPix}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer text-sm"
                            >
                                {savingPix ? "Salvando..." : "Salvar Chave Pix"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: CRIAR NOVO EVENTO */}
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="Criar Novo Evento Produzido" size="md">
                <form className="space-y-4" onSubmit={handleCreateEvent}>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Nome do Evento *
                        </label>
                        <input
                            type="text"
                            required
                            value={eventFormData.name}
                            onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                            placeholder="Ex: Meia Maratona Internacional 2026"
                            className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white text-gray-900"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Categoria *
                            </label>
                            <select
                                required
                                value={eventFormData.category_id}
                                onChange={(e) => setEventFormData({ ...eventFormData, category_id: e.target.value })}
                                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white text-gray-900 cursor-pointer"
                            >
                                <option value="">Selecione...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                Data do Evento *
                            </label>
                            <input
                                type="date"
                                required
                                value={eventFormData.event_date}
                                onChange={(e) => setEventFormData({ ...eventFormData, event_date: e.target.value })}
                                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white text-gray-900"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Localidade / Cidade
                        </label>
                        <input
                            type="text"
                            value={eventFormData.location}
                            onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                            placeholder="Ex: Rio de Janeiro - RJ"
                            className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            URL da Foto de Capa (Banner)
                        </label>
                        <input
                            type="url"
                            value={eventFormData.cover_photo_url}
                            onChange={(e) => setEventFormData({ ...eventFormData, cover_photo_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white text-gray-900"
                        />
                    </div>

                    {/* Slider de Comissão do Produtor */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                Taxa de Coordenação do Produtor
                            </span>
                            <span className="text-base font-extrabold text-amber-600">
                                {eventFormData.producer_commission_percent}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={eventFormData.producer_commission_percent}
                            onChange={(e) => setEventFormData({ ...eventFormData, producer_commission_percent: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer"
                        />
                        <p className="text-[11px] text-amber-800/80 leading-snug">
                            Você receberá {eventFormData.producer_commission_percent}% sobre cada foto vendida pelos fotógrafos que aceitarem cobrir este evento.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={savingEvent}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer text-sm"
                    >
                        {savingEvent ? "Criando Evento..." : "Salvar e Continuar"}
                    </button>
                </form>
            </Modal>

            {/* MODAL: CONVIDAR FOTÓGRAFO */}
            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Convidar Fotógrafo para a Equipe" size="sm">
                <form className="space-y-4" onSubmit={handleInviteCollaborator}>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            E-mail do Fotógrafo *
                        </label>
                        <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="fotografo@email.com"
                            className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white text-gray-900"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            O fotógrafo receberá um convite por e-mail e no painel para confirmar a participação na equipe deste evento.
                        </p>
                    </div>

                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                            <span>Sua Taxa de Coordenação</span>
                            <span className="text-amber-600 font-extrabold">{inviteCommission}%</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={inviting}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer text-sm"
                    >
                        {inviting ? "Enviando Convite..." : "Enviar Convite Oficial"}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default ProducerDashboardPage;
