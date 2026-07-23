
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Photo, User, Category, EmailTemplates } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import PhotoForm from './PhotoForm';
import QualityAnalysisModal from './QualityAnalysisModal';
import { getOptimizedImageUrl } from '../../utils/imageOptimization';
import { includesNormalized } from '../../utils/stringUtils';

interface AdminPhotosProps {
    context: any;
    setContext: (context: any) => void;
}

interface PhotographerWithStats extends User {
    totalPhotos: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    hasPhotos: boolean;
}


const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
);

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

const AdminPhotos: React.FC<AdminPhotosProps> = ({ context, setContext }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [photographers, setPhotographers] = useState<PhotographerWithStats[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplates | null>(null);
    const [loading, setLoading] = useState(true);

    // View State: null = List of Photographers, string = ID of selected Photographer
    const [selectedPhotographerId, setSelectedPhotographerId] = useState<string | null>(null);

    const [photographerEvents, setPhotographerEvents] = useState<any[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Internal filters for the gallery view
    const [filters, setFilters] = useState({
        category: '',
        status: '', // 'public', 'private'
        moderation: '', // 'pending', 'approved', 'rejected'
        featured: '', // 'yes', 'no'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // State for delete confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);

    // State for rejection modal
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [photoToReject, setPhotoToReject] = useState<Photo | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const [expandedEventId, setExpandedEventId] = useState<string | null>(null); // Accordion state
    const [eventFilter, setEventFilter] = useState<string>('all'); // New event filter
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [photoToAnalyze, setPhotoToAnalyze] = useState<Photo | null>(null);

    // State for Bulk Operations
    const [isBulkApproving, setIsBulkApproving] = useState(false);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const fetchData = useCallback(async () => {
        try {
            // Don't set loading to true here to avoid flashing if just refreshing data
            const [photosData, photographersData, categoriesData, templatesData] = await Promise.all([
                api.getAllPhotos(),
                api.getPhotographers(),
                api.getCategories(),
                api.getEmailTemplates()
            ]);
            setPhotos(photosData);
            setPhotographers(photographersData);
            setCategories(categoriesData);
            setEmailTemplates(templatesData);
        } catch (error) {
            console.error("Failed to fetch data for photos page", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    const [eventPhotoCounts, setEventPhotoCounts] = useState<Record<string, number>>({});

    // Fetch Photos when photographer changes
    useEffect(() => {
        if (selectedPhotographerId) {
            setLoading(true);
            Promise.all([
                api.getPhotographerEvents(selectedPhotographerId),
                api.getAllPhotos(selectedPhotographerId),
                api.getEventPhotoCounts(selectedPhotographerId)
            ]).then(([eventsData, photosData, countsData]) => {
                setPhotographerEvents(eventsData);
                setPhotos(photosData);
                setEventPhotoCounts(countsData);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setPhotographerEvents([]);
            setPhotos([]);
            setEventPhotoCounts({});
        }
    }, [selectedPhotographerId]);
    // State for Events (Moved to top level)
    // const [photographerEvents, setPhotographerEvents] = useState<any[]>([]);




    useEffect(() => {
        if (context?.filterByPhotoId && photos.length > 0) {
            const photoToFind = photos.find(p => p.id === context.filterByPhotoId);
            if (photoToFind) {
                // Instead of searching text, we go straight to that photographer
                setSelectedPhotographerId(photoToFind.photographer_id);
                setContext(null);
            }
        }
    }, [context, photos, setContext]);

    const getPhotographerName = (id: string) => photographers.find(p => p.id === id)?.name || 'N/A';

    const handleOpenModal = (photo: Photo | null = null) => {
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
                const updatedPhoto = await api.updatePhoto(editingPhoto.id, formData);
                if (updatedPhoto) {
                    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
                }
            } else {
                const newPhoto = await api.createPhoto(formData);
                setPhotos(prev => [newPhoto, ...prev]);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save photo", error);
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
                setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
            }
        } catch (error) {
            console.error("Falha ao excluir foto", error);
        } finally {
            setIsConfirmModalOpen(false);
            setPhotoToDelete(null);
        }
    };

    const handleApprove = async (photoId: string) => {
        // Optimistic update
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, moderation_status: 'approved', rejection_reason: undefined } : p));
        try {
            const result = await api.moderatePhoto(photoId, 'approved');
            if (result && !result.success) {
                console.error("Failed to approve photo", result.error);
                // Revert
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, moderation_status: 'pending' } : p));
            }
        } catch (error) {
            console.error("Failed to approve photo", error);
        }
    };

    const handleBulkApprove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedPhotographerId) return;

        const pendingCount = photos.filter(p => p.photographer_id === selectedPhotographerId && p.moderation_status === 'pending').length;
        if (pendingCount > 0) {
            setIsBulkConfirmOpen(true);
        }
    };

    const performBulkApprove = async () => {
        if (!selectedPhotographerId) return;

        const pendingPhotos = photos.filter(p => p.photographer_id === selectedPhotographerId && p.moderation_status === 'pending');
        if (pendingPhotos.length === 0) {
            setIsBulkConfirmOpen(false);
            return;
        }

        setIsBulkConfirmOpen(false);
        setIsBulkApproving(true);

        try {
            const pendingIds = pendingPhotos.map(p => p.id);
            // Call the batch API endpoint
            await api.approvePhotosBatch(pendingIds);

            // Update local state to reflect changes immediately
            setPhotos(prev => prev.map(p => pendingIds.includes(p.id) ? { ...p, moderation_status: 'approved' as const, rejection_reason: undefined } : p));

            // Refresh data from source to be sure
            await fetchData();

        } catch (error) {
            console.error("Failed bulk approve", error);
        } finally {
            setIsBulkApproving(false);
        }
    };

    const handleOpenRejectModal = (photo: Photo) => {
        setPhotoToReject(photo);
        setRejectionReason(photo.rejection_reason || '');
        setIsRejectModalOpen(true);
    };

    const handleConfirmReject = async () => {
        if (!photoToReject) return;
        if (!rejectionReason.trim()) {
            return;
        }

        const originalPhoto = photoToReject;
        const updatedPhotoData = { moderation_status: 'rejected' as const, rejection_reason: rejectionReason };
        const updatedPhoto = { ...photoToReject, ...updatedPhotoData };

        setPhotos(prev => prev.map(p => p.id === photoToReject.id ? updatedPhoto : p));

        try {
            const result = await api.moderatePhoto(photoToReject.id, 'rejected', rejectionReason);

            if (result && !result.success) {
                throw new Error(result.error);
            }

            // Send rejection email
            const photographer = photographers.find(p => p.id === photoToReject.photographer_id);
            if (photographer) {
                const { emailService } = await import('../../services/emailService');
                await emailService.sendPhotoRejectionEmail(
                    photographer.email,
                    photographer.name,
                    photoToReject.title,
                    rejectionReason
                );
            }

        } catch (error) {
            console.error("Failed to reject photo", error);
            setPhotos(prev => prev.map(p => p.id === originalPhoto.id ? originalPhoto : p));
        } finally {
            setIsRejectModalOpen(false);
            setPhotoToReject(null);
        }
    };

    const handleToggleFeatured = async (id: string, newStatus: boolean) => {
        // Optimistic update
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, is_featured: newStatus } : p));
        try {
            await api.updatePhoto(id, { is_featured: newStatus });
        } catch (error) {
            // Revert on error
            setPhotos(prev => prev.map(p => p.id === id ? { ...p, is_featured: !newStatus } : p));
        }
    };

    const handleAnalyze = (photo: Photo) => {
        setPhotoToAnalyze(photo);
        setIsAnalysisModalOpen(true);
    };


    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const clearFilters = () => {
        setCurrentPage(1);
        setFilters({ category: '', status: '', moderation: '', featured: '' });
        setSearchTerm('');
    }

    // Filter logic for the selected photographer view
    const filteredPhotos = useMemo(() => {
        if (!selectedPhotographerId) return [];

        return photos.filter(photo => {
            // Base filter: Must belong to selected photographer
            if (photo.photographer_id !== selectedPhotographerId) return false;

            const searchMatch = searchTerm ? includesNormalized(photo.title, searchTerm) : true;
            const categoryMatch = filters.category ? photo.category_id === filters.category : true;
            const statusMatch = filters.status ? (filters.status === 'public' ? photo.is_public : !photo.is_public) : true;
            const moderationMatch = filters.moderation ? photo.moderation_status === filters.moderation : true;
            const featuredMatch = filters.featured ? (filters.featured === 'yes' ? photo.is_featured : !photo.is_featured) : true;
            return searchMatch && categoryMatch && statusMatch && moderationMatch && featuredMatch;
        });
    }, [photos, filters, searchTerm, selectedPhotographerId]);

    // Pagination logic
    const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);
    const paginatedPhotos = useMemo(() => {
        return filteredPhotos.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredPhotos, currentPage]);

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 1));
    };

    // Logic for grouping photographers (Use data from getPhotographers RPC!)
    const photographerGroups = useMemo(() => {
        return photographers
            .filter(p => p.photoCount > 0)
            .sort((a, b) => b.pendingCount - a.pendingCount || b.photoCount - a.photoCount);
    }, [photographers]);

    // Group filtered photos by event (Moved to top level)
    const photosByEvent = useMemo(() => {
        const noEventPhotos = filteredPhotos.filter(p => !p.event_id || !photographerEvents.find(e => e.id === p.event_id));

        // Apply Event Filter
        if (eventFilter !== 'all') {
            if (eventFilter === 'no_event') {
                return [{
                    id: 'no-event',
                    title: 'Outras Fotos (Sem Evento)',
                    subtitle: 'Fotos enviadas individualmente',
                    photos: noEventPhotos,
                    isEvent: false
                }];
            } else {
                const event = photographerEvents.find(e => e.id === eventFilter);
                if (event) {
                    const photos = filteredPhotos.filter(p => p.event_id === event.id);
                    return [{
                        id: event.id,
                        title: event.name,
                        subtitle: `${formatEventDate(event.event_date)} - ${event.location || ''}`,
                        photos: photos,
                        isEvent: true
                    }];
                }
                return [];
            }
        }

        const hasActiveSubFilters = Boolean(searchTerm || filters.category || filters.status || filters.moderation || filters.featured);

        const groups = photographerEvents.map(event => {
            const photos = filteredPhotos.filter(p => p.event_id === event.id);
            return {
                id: event.id,
                title: event.name,
                subtitle: `${formatEventDate(event.event_date)} - ${event.location || ''}`,
                photos: photos,
                isEvent: true
            };
        }).filter(g => !hasActiveSubFilters || g.photos.length > 0);

        if (noEventPhotos.length > 0 || (!hasActiveSubFilters && eventFilter === 'all' && photographerEvents.length === 0)) {
            if (noEventPhotos.length > 0) {
                groups.push({
                    id: 'no-event',
                    title: 'Outras Fotos (Sem Evento)',
                    subtitle: 'Fotos enviadas individualmente',
                    photos: noEventPhotos,
                    isEvent: false
                });
            }
        }

        return groups;
    }, [filteredPhotos, photographerEvents, eventFilter]);


    if (loading) {
        return <Spinner size="lg" fullHeight={true} label="Carregando fotos..." />;
    }

    // VIEW 1: LIST OF PHOTOGRAPHERS (FOLDERS)
    if (!selectedPhotographerId) {
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Gestão de Fotos</h1>
                </div>

                <p className="text-neutral-600 mb-6">Selecione um fotógrafo para gerenciar suas fotos e aprovações.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {photographerGroups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => setSelectedPhotographerId(group.id)}
                            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md border border-neutral-200 transition-all text-left group relative overflow-hidden"
                        >
                            {group.pendingCount > 0 && (
                                <div className="absolute top-0 right-0 w-16 h-16">
                                    <div className="absolute transform rotate-45 bg-yellow-400 text-white text-xs font-bold py-1 right-[-35px] top-[32px] w-[170px] text-center shadow-sm">
                                        Pendente
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center space-x-4 mb-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/10 shadow-sm flex-shrink-0 flex items-center justify-center bg-neutral-100">
                                    {group.avatar_url && group.avatar_url !== 'base64_hidden' ? (
                                        <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary uppercase font-bold text-xl">
                                            {group.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg text-neutral-800 group-hover:text-primary transition-colors">{group.name}</h3>
                                    <p className="text-sm text-neutral-500">{group.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center bg-neutral-50 rounded-lg p-3">
                                <div>
                                    <div className={`font-bold text-lg ${group.pendingCount > 0 ? 'text-yellow-600' : 'text-neutral-600'}`}>
                                        {group.pendingCount}
                                    </div>
                                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Pendentes</div>
                                </div>
                                <div className="border-l border-neutral-200">
                                    <div className="font-bold text-lg text-green-600">{group.approvedCount}</div>
                                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Aprovadas</div>
                                </div>
                                <div className="border-l border-neutral-200">
                                    <div className="font-bold text-lg text-neutral-800">{group.photoCount}</div>
                                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Total</div>
                                </div>
                            </div>
                        </button>
                    ))}
                    {photographerGroups.length === 0 && (
                        <div className="col-span-full text-center py-12 text-neutral-500">
                            Nenhum fotógrafo enviou fotos ainda.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // VIEW 2: SELECTED PHOTOGRAPHER GALLERY
    const currentPhotographer = photographers.find(p => p.id === selectedPhotographerId);
    const currentPhotographerPendingCount = photos.filter(p => p.photographer_id === selectedPhotographerId && p.moderation_status === 'pending').length;

    const handleToggleExpand = (id: string) => {
        setExpandedEventId(prev => prev === id ? null : id);
    };

    const renderPhotoTable = (photos: Photo[], title: string, subtitle: string | undefined, id: string) => {
        const isExpanded = expandedEventId === id || eventFilter !== 'all'; // Always expanded if filtered by specific event


        return (
            <div className="mb-4 bg-white rounded-lg shadow-md overflow-hidden border border-neutral-200">
                <button
                    onClick={() => handleToggleExpand(id)}
                    className="w-full bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center hover:bg-neutral-100 transition-colors"
                >
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            {title}
                        </h3>
                        {subtitle && <p className="text-sm text-neutral-500 ml-7">{subtitle}</p>}
                    </div>
                    {(() => {
                        const actualCount = id in eventPhotoCounts ? eventPhotoCounts[id] : photos.length;
                        const hasActiveSubFilters = Boolean(searchTerm || filters.category || filters.status || filters.moderation || filters.featured);
                        return (
                            <span className="text-xs font-semibold bg-neutral-200 text-neutral-600 px-2.5 py-1 rounded-full">
                                {hasActiveSubFilters ? `${photos.length} de ${actualCount} fotos` : `${actualCount} fotos`}
                            </span>
                        );
                    })()}
                </button>

                {isExpanded && (
                    <div>
                    {photos.length === 0 && (
                        <div className="p-8 text-center text-neutral-400 text-sm italic bg-neutral-50/40">
                            Nenhuma foto cadastrada neste evento.
                        </div>
                    )}
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-neutral-100 bg-white rounded-lg border border-neutral-100 shadow-sm overflow-hidden">
                        {photos.map((photo) => (
                            <div key={photo.id} className={`p-4 transition-colors ${photo.moderation_status === 'pending' ? 'bg-amber-50/40' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <img
                                        src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 150, 75)}
                                        alt={photo.title}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-20 h-14 object-cover rounded-md flex-shrink-0 border border-neutral-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-neutral-800 text-sm truncate">{photo.title}</p>
                                        {photo.width && <p className="text-xs text-neutral-400 mt-0.5">{photo.width} × {photo.height} px</p>}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${photo.is_public ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {photo.is_public ? 'Pública' : 'Privada'}
                                            </span>
                                            <span className="text-xs font-bold text-emerald-600">{photo.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            <div className="flex items-center gap-1.5 ml-auto text-xs text-neutral-500">
                                                <span>Destaque:</span>
                                                <ToggleSwitch
                                                    checked={photo.is_featured}
                                                    onChange={() => handleToggleFeatured(photo.id, !photo.is_featured)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                                    <div className="flex items-center gap-2">
                                        {photo.moderation_status === 'pending' && (
                                            <>
                                                <button onClick={() => handleAnalyze(photo)} className="p-1.5 text-primary-dark bg-primary/10 rounded-full hover:bg-primary/20 transition-colors" title="Análise IA">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                                                </button>
                                                <button onClick={() => handleApprove(photo.id)} className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-2xs">Aprovar</button>
                                                <button onClick={() => handleOpenRejectModal(photo)} className="px-2.5 py-1 text-xs font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors shadow-2xs">Rejeitar</button>
                                            </>
                                        )}
                                        {photo.moderation_status === 'approved' && (
                                            <>
                                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Aprovado</span>
                                                <button onClick={() => handleOpenRejectModal(photo)} className="px-2 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors">Rejeitar</button>
                                            </>
                                        )}
                                        {photo.moderation_status === 'rejected' && (
                                            <>
                                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200" title={`Motivo: ${photo.rejection_reason || 'Nenhum informado'}`}>Rejeitado</span>
                                                <button onClick={() => handleApprove(photo.id)} className="px-2 py-0.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors">Aprovar</button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleOpenModal(photo)} className="p-1.5 text-neutral-600 hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Editar"><EditIcon /></button>
                                        <button onClick={() => handleDelete(photo)} className="p-1.5 text-neutral-600 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="Excluir"><TrashIcon /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-neutral-100 shadow-sm">
                        <table className="w-full min-w-[1000px] border-collapse">
                            <thead className="bg-neutral-50/80 border-b border-neutral-200">
                                <tr>
                                    <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Foto</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Título</th>
                                    <th className="w-28 px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Preço</th>
                                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                                    <th className="w-24 px-4 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Destaque</th>
                                    <th className="w-60 px-4 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Moderação</th>
                                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {photos.map((photo, index) => (
                                    <tr key={photo.id} className={`transition-colors hover:bg-neutral-50/60 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/30'} ${photo.moderation_status === 'pending' ? 'bg-amber-50/40 hover:bg-amber-50/70' : ''}`}>
                                        <td className="px-4 py-3 align-middle">
                                            <img
                                                src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 150, 75)}
                                                alt={photo.title}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-16 h-12 object-cover rounded-md shadow-xs border border-neutral-200"
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="font-medium text-neutral-800 text-sm line-clamp-1">{photo.title}</div>
                                            {photo.width && <div className="text-xs text-neutral-400 mt-0.5">{photo.width} × {photo.height} px</div>}
                                        </td>
                                        <td className="px-4 py-3 align-middle text-right text-sm font-semibold text-emerald-600">
                                            {photo.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${photo.is_public ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {photo.is_public ? 'Pública' : 'Privada'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex justify-center">
                                                <ToggleSwitch
                                                    checked={photo.is_featured}
                                                    onChange={() => handleToggleFeatured(photo.id, !photo.is_featured)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            {photo.moderation_status === 'pending' && (
                                                <div className="flex justify-center items-center gap-2">
                                                    <button
                                                        onClick={() => handleAnalyze(photo)}
                                                        className="p-1.5 text-primary-dark bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                                                        title="Análise IA"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleApprove(photo.id)} className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-2xs">Aprovar</button>
                                                    <button onClick={() => handleOpenRejectModal(photo)} className="px-2.5 py-1 text-xs font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors shadow-2xs">Rejeitar</button>
                                                </div>
                                            )}
                                            {photo.moderation_status === 'approved' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Aprovado</span>
                                                    <button onClick={() => handleOpenRejectModal(photo)} className="px-2 py-0.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors">Rejeitar</button>
                                                </div>
                                            )}
                                            {photo.moderation_status === 'rejected' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200" title={`Motivo: ${photo.rejection_reason || 'Nenhum informado'}`}>
                                                        Rejeitado
                                                    </span>
                                                    <button onClick={() => handleApprove(photo.id)} className="px-2 py-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors">Aprovar</button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleOpenModal(photo)}
                                                    className="flex items-center justify-center w-8 h-8 text-neutral-600 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                    title="Editar"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(photo)}
                                                    className="flex items-center justify-center w-8 h-8 text-neutral-600 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                                                    title="Excluir"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setSelectedPhotographerId(null); setSearchTerm(''); }}
                        className="p-2 rounded-full bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
                        title="Voltar para lista"
                    >
                        <ArrowLeftIcon />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={currentPhotographer?.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            <h1 className="text-2xl font-display font-bold text-primary-dark">{currentPhotographer?.name}</h1>
                        </div>
                        <p className="text-sm text-neutral-500 ml-10">Gerenciando fotos do portfólio</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {currentPhotographerPendingCount > 0 && (
                        <button
                            onClick={handleBulkApprove}
                            disabled={isBulkApproving}
                            className={`flex items-center px-4 py-2 text-white text-sm font-bold rounded-full shadow-md transition-colors ${isBulkApproving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 animate-pulse'}`}
                        >
                            {isBulkApproving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon />
                                    <span className="ml-2">Aprovar {currentPhotographerPendingCount} Pendentes</span>
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors"
                    >
                        Nova Foto Manual
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm space-y-4">
                <div>
                    <label htmlFor="search" className="text-xs text-neutral-500">Pesquisar por Título</label>
                    <input
                        id="search"
                        type="text"
                        placeholder="Buscar foto..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-1">
                        <label className="text-xs text-neutral-500">Evento</label>
                        <select
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                            className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">Todos os Eventos</option>
                            <option value="no_event">Sem Evento (Avulsas)</option>
                            {photographerEvents.map(event => (
                                <option key={event.id} value={event.id}>{event.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-xs text-neutral-500">Categoria</label>
                        <select name="category" value={filters.category} onChange={handleFilterChange} className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white">
                            <option value="">Todas</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-xs text-neutral-500">Moderação</label>
                        <select name="moderation" value={filters.moderation} onChange={handleFilterChange} className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white">
                            <option value="">Todos</option>
                            <option value="pending">Pendente</option>
                            <option value="approved">Aprovado</option>
                            <option value="rejected">Rejeitado</option>
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-xs text-neutral-500">Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white">
                            <option value="">Todos</option>
                            <option value="public">Pública</option>
                            <option value="private">Privada</option>
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-xs text-neutral-500">Destaque</label>
                        <select name="featured" value={filters.featured} onChange={handleFilterChange} className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white">
                            <option value="">Todos</option>
                            <option value="yes">Sim</option>
                            <option value="no">Não</option>
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <button onClick={clearFilters} className="w-full px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">Limpar</button>
                    </div>
                </div>
            </div>

            {/* Render Groups */}
            {photosByEvent.length === 0 && (
                <div className="text-center py-12 text-neutral-500 bg-white rounded-lg shadow-sm">
                    Nenhuma foto encontrada com os filtros atuais.
                </div>
            )}

            {photosByEvent.map((group, idx) => (
                <div key={group.id}>
                    {renderPhotoTable(
                        group.photos,
                        group.title,
                        group.subtitle,
                        group.id
                    )}
                </div>
            ))}

            {/* Pagination controls removed for now as we are grouping all filtered results. 
                If pagination is strictly required, it needs to be applied differently (e.g. paginate events, or paginate total photos but that breaks grouping).
                For Admin view, simple scrolling with all filtered results is usually acceptable for events view. 
            */}


            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingPhoto ? "Editar Foto" : "Nova Foto"}
            >
                <PhotoForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleCloseModal}
                    initialData={editingPhoto}
                    photographers={photographers}
                    categories={categories}
                />
            </Modal>

            <QualityAnalysisModal
                isOpen={isAnalysisModalOpen}
                onClose={() => setIsAnalysisModalOpen(false)}
                photo={photoToAnalyze}
                onApprove={(id) => {
                    handleApprove(id);
                    setIsAnalysisModalOpen(false);
                }}
                onReject={(photo) => {
                    setIsAnalysisModalOpen(false);
                    handleOpenRejectModal(photo);
                }}
            />

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
                                        Esta ação também removerá permanentemente todos os registros de vendas associados a esta foto.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-neutral-600 mb-6">Esta ação não pode ser desfeita.</p>

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

            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title={photoToReject?.moderation_status === 'rejected' ? "Editar Motivo da Rejeição" : "Rejeitar Foto"}
            >
                {photoToReject && emailTemplates && (() => {
                    const photographer = photographers.find(p => p.id === photoToReject.photographer_id);
                    const template = emailTemplates.photoRejected;

                    if (!photographer || !template) return <p>Erro ao carregar dados do modelo.</p>;

                    const subject = template.subject
                        .replace('{{nome_fotografo}}', photographer.name)
                        .replace('{{titulo_foto}}', photoToReject.title);

                    const bodyPreview = template.body
                        .replace('{{nome_fotografo}}', photographer.name)
                        .replace('{{titulo_foto}}', photoToReject.title)
                        .replace(/\n/g, '<br />')
                        .replace('{{motivo_rejeicao}}', `<strong class="text-red-600 bg-red-100 px-1 rounded">[MOTIVO A SER PREENCHIDO ABAIXO]</strong>`);

                    return (
                        <div>
                            <p className="text-sm text-neutral-600 mb-4">
                                A mensagem abaixo será enviada ao fotógrafo. Por favor, preencha o motivo da rejeição.
                            </p>

                            <div className="p-3 bg-neutral-50 rounded-md border text-xs text-neutral-700 mb-4">
                                <p><strong>Assunto:</strong> {subject}</p>
                                <hr className="my-2" />
                                <div
                                    className="space-y-1"
                                    dangerouslySetInnerHTML={{ __html: bodyPreview }}
                                />
                            </div>

                            <div>
                                <label htmlFor="rejection_reason" className="block text-sm font-medium text-neutral-800 mb-1">Motivo da Rejeição *</label>
                                <textarea
                                    id="rejection_reason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full p-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    rows={4}
                                    placeholder="Ex: Baixa resolução, violação de direitos autorais, fora do escopo do site, etc."
                                />
                            </div>

                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsRejectModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmReject}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                                >
                                    Confirmar Rejeição
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* New Bulk Approve Confirmation Modal */}
            <Modal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                title="Aprovação em Massa"
            >
                <div>
                    <p className="text-neutral-600 mb-6 text-lg">
                        Tem certeza que deseja aprovar <strong>todas as fotos pendentes</strong> deste fotógrafo?
                    </p>

                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setIsBulkConfirmOpen(false)}
                            className="px-5 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={performBulkApprove}
                            className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors shadow-md"
                        >
                            Confirmar Aprovação
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminPhotos;


