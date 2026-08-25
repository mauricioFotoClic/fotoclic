
import React, { useEffect, useState } from 'react';
import { User, Photo, Page, Category, PhotoEvent } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import PhotoCard from '../PhotoCard';
import WatermarkedImage from '../WatermarkedImage';
import { getOptimizedImageUrl } from '../../utils/imageOptimization';
import Modal from '../Modal';
import PhotoUploadForm from './PhotoUploadForm';
import ReviewModal from '../ReviewModal';
import ReportModal from '../ReportModal';
import FaceSearchModal from '../FaceSearchModal';
import { useToast } from '../../contexts/ToastContext';
import { shareContent } from '../../utils/share';


interface PhotographerPortfolioPreviewProps {
    user: User;
    onNavigate?: (page: Page) => void;
    editable?: boolean;
    onAddToCart?: (photoId: string, imgElement?: HTMLImageElement) => void;
    currentUser?: User | null;
    isActive?: boolean;
    refreshTrigger?: number;
}

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>;
const WhatsAppIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;



// Helper to safely format event dates in local timezone without UTC shift or Invalid Date bugs
const formatEventDate = (dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateStr) return '';
    try {
        const cleanDate = dateStr.substring(0, 10).replace(/-/g, '/');
        const d = new Date(cleanDate);
        if (isNaN(d.getTime())) {
            const d2 = new Date(dateStr);
            return isNaN(d2.getTime()) ? '' : d2.toLocaleDateString('pt-BR', options);
        }
        return d.toLocaleDateString('pt-BR', options);
    } catch (e) {
        return '';
    }
};

const PhotographerPortfolioPreview: React.FC<PhotographerPortfolioPreviewProps> = ({ user, onNavigate, editable = false, onAddToCart, currentUser, isActive = true, refreshTrigger }) => {
    const { showToast } = useToast();
    const [eventPhotoCounts, setEventPhotoCounts] = useState<Record<string, number>>({});
    const [displayUser, setDisplayUser] = useState<User>(user);
    const [categories, setCategories] = useState<Category[]>([]);
    const [events, setEvents] = useState<PhotoEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<PhotoEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEventPhotos, setSelectedEventPhotos] = useState<Photo[]>([]);
    const [loadingEventPhotos, setLoadingEventPhotos] = useState(false);
    const [visiblePhotosCount, setVisiblePhotosCount] = useState(24);
    const [selectedFolder, setSelectedFolder] = useState<string>('all');

    const folders = React.useMemo(() => {
        const list = selectedEventPhotos.map(p => p.sub_group).filter(Boolean) as string[];
        return Array.from(new Set(list));
    }, [selectedEventPhotos]);

    const filteredPhotos = React.useMemo(() => {
        if (!selectedFolder || selectedFolder === 'all') return selectedEventPhotos;
        return selectedEventPhotos.filter(p => p.sub_group === selectedFolder);
    }, [selectedEventPhotos, selectedFolder]);

    // Edit/Delete State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);

    useEffect(() => {
        // Skip fetching if running in the background and we ALREADY fetched it before.
        if (!isActive && events.length > 0) {
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);

                // Fetch user info silently without blocking photos/events
                api.getPhotographerById(user.id).then((freshUserData) => {
                    if (freshUserData) {
                        setDisplayUser(freshUserData);
                    }
                }).catch(e => console.error("Failed to refresh user", e));

                // Load events first, then fetch counts optimized for those event IDs
                const allEvents = await api.getPhotographerEvents(user.id);
                setEvents(allEvents);

                const eventIds = allEvents.map(e => e.id);
                if (eventIds.length > 0) {
                    const countsData = await api.getEventPhotoCounts(user.id, eventIds, !editable);
                    setEventPhotoCounts(countsData);
                } else {
                    setEventPhotoCounts({});
                }

                if (editable) {
                    const cats = await api.getCategories();
                    setCategories(cats);
                }

            } catch (error) {
                console.error("Failed to fetch portfolio data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user.id, editable, isActive, refreshTrigger]);

    const handleSelectEvent = async (event: PhotoEvent) => {
        setSelectedEvent(event);
        setLoadingEventPhotos(true);
        setSelectedEventPhotos([]);
        setSelectedFolder('all');
        setVisiblePhotosCount(24); // Resets photo grid limit when switching events
        try {
            const eventPhotos = await api.getPhotosByEventId(event.id);
            setSelectedEventPhotos(eventPhotos);
        } catch (e) {
            console.error("Failed to load event photos", e);
        } finally {
            setLoadingEventPhotos(false);
        }
    };

    // CRUD Handlers
    const handleOpenModal = (photo: Photo) => {
        setEditingPhoto(photo);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPhoto(null);
    };

    const handleFormSubmit = async (formData: Omit<Photo, 'id' | 'upload_date' | 'moderation_status' | 'rejection_reason'>) => {
        try {
            if (editingPhoto) {
                const updatedPhoto = await api.updatePhoto(editingPhoto.id, { ...formData, moderation_status: 'pending' });
                if (updatedPhoto) {
                    setSelectedEventPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
                }
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save photo", error);
            alert("Ocorreu um erro ao salvar a foto.");
        }
    };

    const handleDelete = (photo: Photo) => {
        setPhotoToDelete(photo);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!photoToDelete) return;
        try {
            const success = await api.deletePhoto(photoToDelete.id);
            if (success) {
                setSelectedEventPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
            } else {
                alert('Erro ao excluir a foto.');
            }
        } catch (error) {
            console.error("Falha ao excluir foto", error);
        } finally {
            setIsConfirmModalOpen(false);
            setPhotoToDelete(null);
        }
    };

    const getStatusChip = (status: Photo['moderation_status'], reason?: string) => {
        const baseClasses = "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm";
        switch (status) {
            case 'approved':
                return <span className={`${baseClasses} bg-green-100 text-green-800 border border-green-200`}>Aprovado</span>;
            case 'pending':
                return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`}>Pendente</span>;
            case 'rejected':
                return <span title={`Motivo: ${reason}`} className={`${baseClasses} bg-red-100 text-red-800 border border-red-200 cursor-help`}>Rejeitado</span>;
            default:
                return null;
        }
    };

    const handleCopyLink = () => {
        const targetSlug = displayUser.slug || user.slug || user.id;
        const url = `${window.location.origin}/portfolio/${targetSlug}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link do portfólio copiado!', 'success');
        }).catch(err => {
            console.error('Erro ao copiar link', err);
            showToast('Erro ao copiar link.', 'error');
        });
    };

    const handleShare = () => {
        const targetSlug = displayUser.slug || user.slug || user.id;
        const url = `${window.location.origin}/portfolio/${targetSlug}`;
        shareContent(
            'Portfólio FotoClic',
            `Confira o portfólio de ${user.name} no FotoClic`,
            url
        );
    };

    // Removed blocking global spinner so the profile header renders immediately using the provided user prop
    
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-screen">
            {/* Banner Section */}
            <div className="relative h-64 md:h-80 w-full bg-neutral-200">
                {displayUser.banner_url ? (
                    <img
                        src={displayUser.banner_url}
                        alt="Capa do Portfólio"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center">
                        <span className="text-white/50 font-display text-2xl">Sem Banner</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            {/* Profile Info Section */}
            <div className="relative px-6 md:px-12 pb-8 -mt-20">
                <div className="flex flex-col md:flex-row items-start md:items-start gap-6">
                    <div className="relative">
                        <img
                            src={displayUser.avatar_url || 'https://via.placeholder.com/150'}
                            alt={displayUser.name}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                        />
                    </div>
                    <div className="flex-1 md:mt-28">
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">{displayUser.name}</h1>
                        <p className="text-neutral-500 text-sm md:text-base flex items-center gap-2 mt-1">
                            {displayUser.location && (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    {displayUser.location}
                                </>
                            )}
                        </p>
                    </div>
                    <div className="mt-6 md:mt-28 w-full md:w-auto flex flex-col md:flex-col items-center md:items-end justify-between md:justify-start gap-4">
                        <div className="px-4 py-2 rounded-full text-neutral-700 bg-neutral-100 border border-neutral-200 text-sm font-medium shadow-sm w-full md:w-auto text-center">
                            {(() => {
                                const visibleCount = editable ? events.length : events.filter(e => (eventPhotoCounts[e.id] || 0) > 0).length;
                                return selectedEvent
                                    ? `${selectedEventPhotos.length} Foto${selectedEventPhotos.length !== 1 ? 's' : ''} neste Evento`
                                    : `${visibleCount} Evento${visibleCount !== 1 ? 's' : ''}`;
                            })()}
                        </div>
                        {editable && (
                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                <button
                                    onClick={handleCopyLink}
                                    className="px-6 py-2 rounded-full bg-secondary hover:bg-secondary-light text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2 flex-1 md:flex-none"
                                >
                                    <LinkIcon />
                                    Copiar Link
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="px-6 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2 flex-1 md:flex-none"
                                >
                                    {navigator.share ? <ShareIcon /> : <WhatsAppIcon />}
                                    {navigator.share ? 'Compartilhar' : 'WhatsApp'}
                                </button>
                            </div>
                        )}

                        {!editable && (!currentUser || currentUser.id !== user.id) && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (!currentUser) { onNavigate?.({ name: 'login' }); return; }
                                        setIsReviewModalOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-full bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Avaliar
                                </button>
                                <button
                                    onClick={() => {
                                        if (!currentUser) { onNavigate?.({ name: 'login' }); return; }
                                        setIsReportModalOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-neutral-200 text-neutral-500 font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                    Denunciar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 md:ml-48 md:mt-2 max-w-3xl">
                    <h2 className="text-xl font-display font-semibold text-neutral-900 mb-2">Sobre</h2>
                    <p className="text-neutral-600 leading-relaxed">
                        {displayUser.bio || "Olá! Bem-vindo ao meu portfólio no FotoClic. Explore minhas fotos abaixo."}
                    </p>

                    {displayUser.social_instagram && (
                        <div className="mt-4">
                            <a href={`https://instagram.com/${displayUser.social_instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-secondary hover:text-secondary-light font-medium transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                @{displayUser.social_instagram}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <hr className="border-neutral-200 my-4 mx-6 md:mx-12" />

            {/* Gallery Section */}
            <div className="px-6 md:px-12 py-8 bg-neutral-50">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        {selectedEvent && (
                            <button
                                onClick={() => { setSelectedEvent(null); setSelectedEventPhotos([]); }}
                                className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
                                title="Voltar para Eventos"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            </button>
                        )}
                        <h3 className="text-2xl font-display font-bold text-primary-dark">
                            {selectedEvent ? selectedEvent.name : 'Eventos'}
                        </h3>
                    </div>
                    <span className="text-sm text-neutral-500 italic">
                        {editable ? 'Modo de Gerenciamento' : 'Visualização Pública'}
                    </span>
                </div>

                {selectedEvent && selectedEventPhotos.length > 0 && (
                    <div
                        onClick={() => setIsFaceSearchOpen(true)}
                        className="mb-8 group cursor-pointer"
                    >
                        <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 flex items-center gap-4 hover:border-neutral-300 hover:shadow-sm transition-all duration-200">
                            {/* Scan icon */}
                            <div className="flex-none w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center group-hover:border-neutral-200 transition-colors">
                                <svg className="w-5 h-5 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                    <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                                    <circle cx="10.5" cy="11.2" r="0.5" fill="currentColor" stroke="none" />
                                    <circle cx="13.5" cy="11.2" r="0.5" fill="currentColor" stroke="none" />
                                    <path d="M10.5 13.5a2 2 0 0 0 3 0" strokeWidth="1.3" />
                                </svg>
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-neutral-800 leading-tight">
                                    Encontre suas fotos por reconhecimento facial
                                </p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">
                                    Tire uma selfie ou envie uma foto do seu rosto
                                </p>
                            </div>

                            {/* CTA */}
                            <span className="flex-none text-xs font-bold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap shadow-sm">
                                Buscar
                            </span>
                        </div>
                    </div>
                )}

                {!selectedEvent ? (
                    // EVENTS GRID
                    loading ? (
                        <div className="flex justify-center py-16"><Spinner size="lg" label="Carregando eventos do portfólio..." /></div>
                    ) : events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map(event => {
                                const eventPhotoCount = eventPhotoCounts[event.id] || 0;
                                const coverPhotoUrl = event.cover_photo_url;

                                // Hide events with 0 photos in the public portfolio page
                                if (!editable && eventPhotoCount === 0) return null;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => handleSelectEvent(event)}
                                        className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                                    >
                                        <div className="h-48 bg-neutral-200 relative overflow-hidden">
                                            {coverPhotoUrl ? (
                                                <img
                                                    src={getOptimizedImageUrl(coverPhotoUrl, 600, 75)}
                                                    alt={event.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-neutral-900 line-clamp-1">{event.name}</h3>
                                                <span className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium">
                                                    {`${eventPhotoCount} fotos`}
                                                </span>
                                            </div>
                                            <div className="space-y-2 mt-4 pt-3.5 border-t border-neutral-100 text-xs text-neutral-500">
                                                <div className="flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                    <span>{formatEventDate(event.event_date)}</span>
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-start gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                        <span className="line-clamp-1 text-neutral-600 font-medium" title={event.location}>
                                                            {event.location}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-neutral-300">
                            <div className="inline-block p-4 rounded-full bg-neutral-100 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <h4 className="text-lg font-medium text-neutral-800">Nenhum evento encontrado</h4>
                            <p className="text-neutral-500 mt-2 max-w-md mx-auto">
                                Este fotógrafo ainda não publicou nenhum evento.
                            </p>
                        </div>
                    )
                ) : (
                    // PHOTOS GRID (Filtered by Event)
                    loadingEventPhotos ? (
                        <div className="flex justify-center py-16"><Spinner size="lg" label="Carregando fotos do evento..." /></div>
                    ) : selectedEventPhotos.length > 0 ? (
                        <>
                            {/* Seletor de Pastas/Dias (Modern Grid) */}
                            {folders.length > 0 && (
                                <div className="mb-8 bg-neutral-50/50 p-6 rounded-2xl border border-neutral-200/60 w-full">
                                    <div className="mb-4">
                                        <h3 className="text-base font-bold text-neutral-800">Pastas deste Evento</h3>
                                        <p className="text-xs text-neutral-500">Selecione uma pasta para filtrar as fotos abaixo</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {/* Todas as fotos */}
                                        <button
                                            onClick={() => setSelectedFolder('all')}
                                            className={`flex items-center justify-between p-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 border shadow-sm ${
                                                selectedFolder === 'all'
                                                    ? 'bg-primary/5 border-primary text-primary shadow-primary/5'
                                                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={selectedFolder === 'all' ? 'text-primary' : 'text-neutral-400'}>
                                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                                <span className="uppercase tracking-wide">TODAS AS FOTOS</span>
                                            </div>
                                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                                selectedFolder === 'all' ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-500'
                                            }`}>
                                                {selectedEventPhotos.length}
                                            </span>
                                        </button>

                                        {/* Pastas individuais */}
                                        {folders.map(folder => {
                                            const count = selectedEventPhotos.filter(p => p.sub_group === folder).length;
                                            const isSelected = selectedFolder === folder;
                                            return (
                                                <button
                                                    key={folder}
                                                    onClick={() => setSelectedFolder(folder)}
                                                    className={`flex items-center justify-between p-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 border shadow-sm ${
                                                        isSelected
                                                            ? 'bg-primary/5 border-primary text-primary shadow-primary/5'
                                                            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSelected ? 'text-primary' : 'text-neutral-400'}>
                                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                        </svg>
                                                        <span className="uppercase tracking-wide truncate" title={folder}>{folder}</span>
                                                    </div>
                                                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                                        isSelected ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-500'
                                                    }`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredPhotos.slice(0, visiblePhotosCount).map(photo => (
                                    editable ? (
                                        // Editable CRUD Card
                                        <div key={photo.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-200 hover:shadow-md transition-all group">
                                            <div className="relative h-48 overflow-hidden bg-neutral-100">
                                                <img src={photo.preview_url} alt={photo.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                                    {getStatusChip(photo.moderation_status, photo.rejection_reason)}
                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-sm ${photo.is_public ? 'bg-white text-green-700 border-green-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                                                        {photo.is_public ? 'Pública' : 'Privada'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-semibold text-neutral-900 truncate mb-1" title={photo.title}>{photo.title}</h4>
                                                <p className="text-sm text-neutral-500 mb-4">R$ {photo.price.toFixed(2).replace('.', ',')}</p>

                                                <div className="flex gap-2 pt-2 border-t border-neutral-100">
                                                    <button
                                                        onClick={() => handleOpenModal(photo)}
                                                        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-primary-dark bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                                                    >
                                                        <span className="mr-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></span>
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(photo)}
                                                        className="flex items-center justify-center px-3 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Public View Card
                                        <PhotoCard
                                            key={photo.id}
                                            photo={photo}
                                            photographer={displayUser}
                                            onNavigate={onNavigate}
                                            onAddToCart={onAddToCart}
                                            currentUser={currentUser}
                                        />
                                    )
                                ))}
                            </div>

                            {selectedEventPhotos.length > visiblePhotosCount && (
                                <div className="flex justify-center mt-10">
                                    <button
                                        onClick={() => setVisiblePhotosCount(prev => prev + 24)}
                                        className="px-8 py-3 bg-primary hover:bg-primary-dark text-white rounded-full font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center gap-2 text-sm uppercase tracking-wider focus:outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                        Carregar mais fotos
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-neutral-300">
                            <div className="inline-block p-4 rounded-full bg-neutral-100 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <h4 className="text-lg font-medium text-neutral-800">Nenhuma foto encontrada neste evento</h4>
                            <p className="text-neutral-500 mt-2 max-w-md mx-auto">
                                Não há fotos para exibir aqui no momento.
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title="Editar Foto"
            >
                <PhotoUploadForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleCloseModal}
                    initialData={editingPhoto}
                    photographerId={user.id}
                    categories={categories}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Confirmar Exclusão"
            >
                {photoToDelete && (
                    <div>
                        <p className="text-neutral-600 mb-4">
                            Tem certeza que deseja excluir a foto <strong>"{photoToDelete.title}"</strong>?
                        </p>

                        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <WarningIcon className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        Esta ação removerá permanentemente a foto e todos os registros associados.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                photographerId={user.id}
                currentUser={currentUser!}
                onReviewSubmitted={() => {
                    setIsReviewModalOpen(false);
                    showToast('Avaliação enviada com sucesso!', 'success');
                }}
            />

            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                photographerId={user.id}
                currentUser={currentUser!}
                photographerName={displayUser.name}
            />

            {selectedEvent && (
                <FaceSearchModal
                    isOpen={isFaceSearchOpen}
                    onClose={() => setIsFaceSearchOpen(false)}
                    eventId={selectedEvent.id}
                    eventName={selectedEvent.name}
                    onNavigate={onNavigate || (() => { })}
                    onAddToCart={onAddToCart || (() => { })}
                    onShowToast={showToast}
                />
            )}
        </div>
    );
};

export default PhotographerPortfolioPreview;


