
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, PhotographerWithStats, Page, Review, Report, ReportStatus } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import { includesNormalized } from '../../utils/stringUtils';
import Modal from '../Modal';
import PhotographerForm from './PhotographerForm';

interface AdminPhotographersProps {
    onNavigate: (page: Page) => void;
}

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ExternalLinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
);

const REASON_LABELS: Record<string, string> = {
    conteudo_inapropriado: 'Conteúdo Inapropriado',
    perfil_falso: 'Perfil Falso',
    violacao_direitos: 'Violação de Direitos',
    assedio: 'Assédio',
    spam: 'Spam',
    outro: 'Outro',
};

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
    pending:   { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-800' },
    resolved:  { label: 'Resolvido',  color: 'bg-green-100 text-green-800' },
    dismissed: { label: 'Descartado', color: 'bg-neutral-100 text-neutral-500' },
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(s => (
            <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ))}
        <span className="text-xs text-neutral-500 ml-1">{rating.toFixed(1)}</span>
    </div>
);

const AdminPhotographers: React.FC<AdminPhotographersProps> = ({ onNavigate }) => {
    const [photographers, setPhotographers] = useState<PhotographerWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhotographer, setEditingPhotographer] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reviews & Reports modal
    const [detailPhotographer, setDetailPhotographer] = useState<PhotographerWithStats | null>(null);
    const [detailTab, setDetailTab] = useState<'reviews' | 'reports'>('reviews');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // Pending reports per photographer
    const [pendingReportCounts, setPendingReportCounts] = useState<Record<string, number>>({});

    // Inline resolve flow
    const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
    const [resolveNote, setResolveNote] = useState('');

    const fetchPhotographers = useCallback(async () => {
        try {
            const [data, allReports] = await Promise.all([
                api.getPhotographers(),
                api.getAllReports(),
            ]);
            setPhotographers(data);

            // Count pending reports per photographer
            const counts: Record<string, number> = {};
            for (const r of allReports) {
                if (r.status === 'pending') {
                    counts[r.photographer_id] = (counts[r.photographer_id] ?? 0) + 1;
                }
            }
            setPendingReportCounts(counts);
        } catch (error) {
            console.error("Failed to fetch photographers", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchPhotographers();
    }, [fetchPhotographers]);

    const handleOpenModal = (photographer: User | null = null) => {
        setEditingPhotographer(photographer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPhotographer(null);
    };

    const handleFormSubmit = async (formData: Omit<User, 'id' | 'role'>) => {
        try {
            if (editingPhotographer) {
                await api.updatePhotographer(editingPhotographer.id, formData);
            } else {
                await api.createPhotographer(formData);
            }
            handleCloseModal();
            fetchPhotographers();
        } catch (error) {
            console.error("Failed to save photographer", error);
            alert("Ocorreu um erro ao salvar o fotógrafo.");
        }
    };



    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleOpenDetail = async (photographer: PhotographerWithStats, tab: 'reviews' | 'reports') => {
        setDetailPhotographer(photographer);
        setDetailTab(tab);
        setDetailLoading(true);
        setReviews([]);
        setReports([]);
        const [rev, rep] = await Promise.all([
            api.getPhotographerReviews(photographer.id),
            api.getPhotographerReports(photographer.id),
        ]);
        setReviews(rev);
        setReports(rep);
        setDetailLoading(false);
    };

    const handleResolveReport = async (reportId: string, status: ReportStatus, adminNote?: string) => {
        await api.resolveReport(reportId, status, adminNote);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status, admin_note: adminNote } : r));
        setResolvingReportId(null);
        setResolveNote('');
        if (detailPhotographer) {
            setPendingReportCounts(prev => {
                const current = prev[detailPhotographer.id] ?? 0;
                const updated = Math.max(0, current - 1);
                return { ...prev, [detailPhotographer.id]: updated };
            });
        }
    };

    const handleConfirmResolve = async (rep: Report) => {
        await handleResolveReport(rep.id, 'resolved', resolveNote.trim() || undefined);
        if (detailPhotographer) {
            const { emailService } = await import('../../services/emailService');
            await emailService.sendReportWarningEmail(
                detailPhotographer.email,
                detailPhotographer.name,
                rep.reason,
                resolveNote.trim()
            );
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        await api.deleteReview(reviewId);
        setReviews(prev => prev.filter(r => r.id !== reviewId));
    };



    const handleToggleStatus = async (id: string, newStatus: boolean) => {
        // Optimistic update
        setPhotographers(prev => prev.map(p => p.id === id ? { ...p, is_active: newStatus } : p));
        try {
            await api.updatePhotographer(id, { is_active: newStatus });

            // Send email notification
            const photographer = photographers.find(p => p.id === id);
            if (photographer) {
                // Dynamically import to avoid circular dependencies if any, although here it's fine
                const { emailService } = await import('../../services/emailService');
                const emailSent = await emailService.sendPhotographerStatusEmail(
                    photographer.email,
                    photographer.name,
                    newStatus ? 'activated' : 'deactivated'
                );

                if (!emailSent) {
                    alert('Status atualizado, mas falha ao enviar o e-mail de notificação. Verifique se a chave da API Resend está correta e se o e-mail do destinatário é válido/permitido.');
                }
            }

        } catch (error) {
            // Revert on error
            setPhotographers(prev => prev.map(p => p.id === id ? { ...p, is_active: !newStatus } : p));
            console.error("Failed to update photographer status:", error);
            alert('Falha ao atualizar o status do fotógrafo.');
        }
    };

    const filteredPhotographers = useMemo(() => {
        return photographers.filter(p =>
            includesNormalized(p.name, searchTerm) ||
            includesNormalized(p.email, searchTerm)
        );
    }, [photographers, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredPhotographers.length / itemsPerPage);
    const paginatedPhotographers = useMemo(() => {
        return filteredPhotographers.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredPhotographers, currentPage, itemsPerPage]);

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 1));
    };


    if (loading) {
        return <Spinner size="lg" fullHeight={true} label="Carregando fotógrafos..." />;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Fotógrafos</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors"
                >
                    Novo Fotógrafo
                </button>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou e-mail..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500 whitespace-nowrap">Mostrar:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {paginatedPhotographers.map((user) => (
                    <div key={user.id} className={`bg-white rounded-lg border p-4 ${pendingReportCounts[user.id] ? 'border-red-300 border-l-4 border-l-red-400' : 'border-neutral-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm text-neutral-500 font-bold">{user.name.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-neutral-800 truncate">{user.name}</p>
                                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={user.is_active} onChange={() => handleToggleStatus(user.id, !user.is_active)} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div className="bg-neutral-50 rounded-lg p-2">
                                <p className="text-xs text-neutral-500">Fotos</p>
                                <p className="font-bold text-neutral-800">{user.photoCount}</p>
                            </div>
                            <div className="bg-neutral-50 rounded-lg p-2">
                                <p className="text-xs text-neutral-500">Vendas</p>
                                <p className="font-bold text-neutral-800">{user.salesCount}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                                <p className="text-xs text-green-600">Comissão</p>
                                <p className="font-bold text-green-700 text-xs">{user.commissionValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: user.id })}
                                className="p-2 text-secondary hover:bg-neutral-100 rounded-full transition-colors"
                                title="Ver Portfólio"
                            >
                                <ExternalLinkIcon />
                            </button>
                            <button
                                onClick={() => handleOpenDetail(user, 'reports')}
                                className="relative p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Ver denúncias"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                {pendingReportCounts[user.id] ? (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingReportCounts[user.id]}</span>
                                ) : null}
                            </button>
                            <button
                                onClick={() => handleOpenModal(user)}
                                className="p-2 text-primary-dark hover:bg-primary/10 rounded-full transition-colors"
                                title="Editar"
                            >
                                <EditIcon />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredPhotographers.length === 0 && <p className="text-center py-8 text-neutral-500 bg-white rounded-lg">{searchTerm ? 'Nenhum fotógrafo encontrado.' : 'Nenhum fotógrafo cadastrado.'}</p>}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Nome</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Email</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Fotos</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Vendas</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Comissão (%)</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Comissão Gerada</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Status</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Termo</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Avaliação</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Portfólio</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPhotographers.map((user, index) => (
                            <tr key={user.id} className={`border-t ${pendingReportCounts[user.id] ? 'bg-red-50 border-l-4 border-l-red-400' : index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                <td className="p-4 text-sm text-neutral-800 font-medium">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden mr-3 flex-shrink-0 flex items-center justify-center">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-neutral-500 font-bold">{user.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <span className="truncate max-w-[200px]">{user.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-neutral-500">{user.email}</td>
                                <td className="p-4 text-sm text-neutral-500 text-center">{user.photoCount}</td>
                                <td className="p-4 text-sm text-neutral-500 text-center">{user.salesCount}</td>
                                <td className="p-4 text-sm text-neutral-800 font-bold text-center">{(user.commissionRate * 100).toFixed(0)}%</td>
                                <td className="p-4 text-sm text-green-600 font-medium">{user.commissionValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="p-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <ToggleSwitch
                                            checked={user.is_active}
                                            onChange={() => handleToggleStatus(user.id, !user.is_active)}
                                        />
                                        <span className={`mt-1 text-xs font-semibold ${user.is_active ? 'text-green-700' : 'text-red-700'}`}>
                                            {user.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center">
                                        {user.liability_waiver_accepted_at ? (
                                            <div className="group relative">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                    Aceito em: {new Date(user.liability_waiver_accepted_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="group relative">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                    Pendente
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(user, 'reviews')}
                                        className="flex flex-col items-center gap-0.5 mx-auto hover:opacity-80 transition-opacity"
                                        title="Ver avaliações"
                                    >
                                        {user.avgRating > 0 ? (
                                            <StarRating rating={user.avgRating} />
                                        ) : (
                                            <span className="text-xs text-neutral-400">Sem avaliações</span>
                                        )}
                                    </button>
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: user.id })}
                                        className="text-secondary hover:text-secondary-light p-2 rounded-full hover:bg-neutral-100 transition-colors"
                                        title="Ver Portfólio Público"
                                    >
                                        <ExternalLinkIcon />
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenDetail(user, 'reports')}
                                            className="relative flex items-center justify-center w-9 h-9 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                            title={pendingReportCounts[user.id] ? `${pendingReportCounts[user.id]} denúncia(s) pendente(s)` : 'Ver denúncias'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                            {pendingReportCounts[user.id] ? (
                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                                                    {pendingReportCounts[user.id]}
                                                </span>
                                            ) : null}
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            className="flex items-center justify-center w-9 h-9 text-primary-dark hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                            title="Editar"
                                        >
                                            <EditIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredPhotographers.length === 0 && (
                            <tr>
                                <td colSpan={10} className="text-center p-8 text-neutral-500">
                                    {searchTerm ? 'Nenhum fotógrafo encontrado para sua busca.' : 'Nenhum fotógrafo cadastrado.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-neutral-500">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Próxima
                    </button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingPhotographer ? "Editar Fotógrafo" : "Novo Fotógrafo"}
            >
                <PhotographerForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleCloseModal}
                    initialData={editingPhotographer}
                />
            </Modal>

            {/* Modal de Avaliações e Denúncias */}
            {detailPhotographer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
                            <div className="flex items-center gap-3">
                                {detailPhotographer.avatar_url ? (
                                    <img src={detailPhotographer.avatar_url} alt={detailPhotographer.name} className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-bold text-neutral-500">{detailPhotographer.name.charAt(0)}</div>
                                )}
                                <div>
                                    <p className="font-bold text-neutral-900">{detailPhotographer.name}</p>
                                    <p className="text-xs text-neutral-400">{detailPhotographer.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setDetailPhotographer(null)} className="text-neutral-400 hover:text-neutral-600 p-1">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-neutral-100">
                            <button
                                onClick={() => setDetailTab('reviews')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${detailTab === 'reviews' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
                            >
                                ⭐ Avaliações ({reviews.length})
                            </button>
                            <button
                                onClick={() => setDetailTab('reports')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${detailTab === 'reports' ? 'border-b-2 border-red-500 text-red-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                            >
                                🚩 Denúncias ({reports.filter(r => r.status === 'pending').length} pendentes)
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 p-5">
                            {detailLoading ? (
                                <div className="flex justify-center py-10 text-neutral-400">Carregando...</div>
                            ) : detailTab === 'reviews' ? (
                                reviews.length === 0 ? (
                                    <p className="text-center text-neutral-400 py-10">Nenhuma avaliação ainda.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {reviews.map(rev => (
                                            <div key={rev.id} className="flex gap-3 p-4 bg-neutral-50 rounded-xl">
                                                <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden">
                                                    {(rev as any).reviewer?.avatar_url
                                                        ? <img src={(rev as any).reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">{((rev as any).reviewer?.name || '?').charAt(0)}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-neutral-800">{(rev as any).reviewer?.name || 'Usuário'}</p>
                                                        <StarRating rating={rev.rating} />
                                                    </div>
                                                    {rev.comment && <p className="text-sm text-neutral-600 mt-1">{rev.comment}</p>}
                                                    <p className="text-xs text-neutral-400 mt-1">{new Date(rev.created_at).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteReview(rev.id)}
                                                    className="text-neutral-300 hover:text-red-500 transition-colors flex-shrink-0"
                                                    title="Remover avaliação"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                reports.length === 0 ? (
                                    <p className="text-center text-neutral-400 py-10">Nenhuma denúncia registrada.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {reports.map(rep => (
                                            <div key={rep.id} className={`p-4 rounded-xl border ${rep.status === 'pending' ? 'border-red-200 bg-red-50' : 'border-neutral-100 bg-neutral-50'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="text-sm font-bold text-neutral-800">{REASON_LABELS[rep.reason] || rep.reason}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_LABELS[rep.status].color}`}>{STATUS_LABELS[rep.status].label}</span>
                                                        </div>
                                                        {rep.description && <p className="text-sm text-neutral-600 mb-1">{rep.description}</p>}
                                                        <p className="text-xs text-neutral-400">
                                                            por <strong>{(rep as any).reporter?.name || 'Anônimo'}</strong> em {new Date(rep.created_at).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    {rep.status === 'pending' && resolvingReportId !== rep.id && (
                                                        <div className="flex gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => { setResolvingReportId(rep.id); setResolveNote(''); }}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                            >
                                                                Resolver
                                                            </button>
                                                            <button
                                                                onClick={() => handleResolveReport(rep.id, 'dismissed')}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300 transition-colors"
                                                            >
                                                                Descartar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {resolvingReportId === rep.id && (
                                                    <div className="mt-3 space-y-2">
                                                        <label className="block text-xs font-semibold text-neutral-700">Anotação para registro (opcional):</label>
                                                        <textarea
                                                            value={resolveNote}
                                                            onChange={e => setResolveNote(e.target.value)}
                                                            rows={3}
                                                            placeholder="Descreva a ação tomada ou o motivo da resolução..."
                                                            className="w-full text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none"
                                                        />
                                                        <p className="text-xs text-neutral-400">Um e-mail de aviso será enviado ao fotógrafo.</p>
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => { setResolvingReportId(null); setResolveNote(''); }}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleConfirmResolve(rep)}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                            >
                                                                Confirmar e Enviar Aviso
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPhotographers;


