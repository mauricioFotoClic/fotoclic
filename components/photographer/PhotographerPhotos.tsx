
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Photo, Category, PhotoEvent } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import PhotoUploadForm from './PhotoUploadForm';
import PhotoLikesModal from './PhotoLikesModal';
// import Toast from '../Toast'; // Content handled by Context
import CreateEventForm from './CreateEventForm';
import BatchUploadForm from './BatchUploadForm';

import { faceRecognitionService } from '../../services/faceRecognition';
import { processImageForUpload } from '../../utils/imageProcessing';

import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const HeartIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const FaceScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

interface PhotographerPhotosProps {
    user: User;
}

const PhotographerPhotos: React.FC<PhotographerPhotosProps> = ({ user }) => {
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // --- STATE ---
    const [view, setView] = useState<'events' | 'photos'>('events');
    const [events, setEvents] = useState<PhotoEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<PhotoEvent | null>(null);

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [myRequest, setMyRequest] = useState<any>(null); // New state for storage request
    const [loading, setLoading] = useState(true);
    const stopBulkRef = useRef(false);

    // Modals
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);

    // Legacy Modals (Single Photo)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
    // const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // Removed in favor of Context
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
    const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
    const [selectedPhotoForLikes, setSelectedPhotoForLikes] = useState<Photo | null>(null);
    const [isIndexConfirmModalOpen, setIsIndexConfirmModalOpen] = useState(false);
    const [photoToIndex, setPhotoToIndex] = useState<Photo | null>(null);

    // Bulk Indexing
    const [isBulkIndexing, setIsBulkIndexing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });
    const [isBulkStopRequested, setIsBulkStopRequested] = useState(false);
    const [isBulkStartConfirmOpen, setIsBulkStartConfirmOpen] = useState(false);
    const [isBulkStopConfirmOpen, setIsBulkStopConfirmOpen] = useState(false);

    // Toast (STATE REMOVED)

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [stats, setStats] = useState<any>(null); // Add stats state

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [eventsData, photosData, categoriesData, statsData, myRequestData] = await Promise.all([
                api.getPhotographerEvents(user.id),
                api.getPhotosByPhotographerId(user.id),
                api.getCategories(),
                api.getPhotographerStats(user.id),
                api.getMyLatestStorageRequest()
            ]);
            setEvents(eventsData);
            setPhotos(photosData);
            setCategories(categoriesData);
            setStats(statsData);
            setMyRequest(myRequestData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';

    // --- EVENT HANDLERS ---
    const handleCreateEvent = async (data: Omit<PhotoEvent, 'id' | 'created_at' | 'photographer_id'>) => {
        try {
            const newEvent = await api.createEvent({
                ...data,
                photographer_id: user.id
            });

            if (newEvent) {
                setEvents(prev => [newEvent, ...prev]);
                setIsEventModalOpen(false);
                showToast("Evento criado com sucesso!", "success");
            }
        } catch (error: any) {
            console.error("Failed to create event", error);
            const msg = error.message || "Erro desconhecido";
            showToast(`Erro ao criar evento: ${msg}`, "error");
        }
    };

    const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const isConfirmed = await confirm({
            title: "Excluir Evento",
            message: "Você tem certeza que deseja excluir este evento? Todas as fotos dentro dele também serão excluídas.",
            confirmText: "Excluir",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            const success = await api.deleteEvent(eventId);
            if (success) {
                setEvents(prev => prev.filter(ev => ev.id !== eventId));
                setPhotos(prev => prev.filter(p => p.event_id !== eventId));
                showToast("Evento excluído com sucesso.", "success");
            }
        } catch (error) {
            console.error(error);
            showToast("Erro ao excluir evento.", "error");
        }
    }

    const handleBatchUpload = async (
        files: File[],
        metadata: { price: number, tags: string[], is_public: boolean },
        onProgress?: (current: number, total: number) => void
    ) => {
        if (!selectedEvent) return;

        // Don't close modal here, let it show progress
        // setIsBatchUploadModalOpen(false); 

        let successCount = 0;
        let failCount = 0;

        showToast(`Iniciando envio de ${files.length} fotos...`, "info");

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Report progress
            if (onProgress) onProgress(i + 1, files.length);

            // 1. Validation: File Size (Max 15MB)
            const MAX_SIZE_MB = 15;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                console.error(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
                failCount++;
                continue; // Skip this file
            }

            // 2. Validation: File Type (Allow JPG, WebP, PNG)
            const validTypes = ['image/jpeg', 'image/jpg', 'image/webp', 'image/png'];
            if (!validTypes.includes(file.type)) {
                console.error(`File ${file.name} has invalid type: ${file.type}`);
                failCount++;
                continue;
            }

            try {
                // 3. Process Image (Original, Preview, Thumb)
                // Note: processImageForUpload returns base64 strings.
                // We need to convert them back to Blobs for Storage upload.
                const processed = await processImageForUpload(file);

                // Helper to convert base64 to Blob
                const base64ToBlob = async (b64Data: string) => {
                    const res = await fetch(b64Data);
                    return await res.blob();
                };

                const originalBlob = await base64ToBlob(processed.original);
                const previewBlob = await base64ToBlob(processed.preview);
                const thumbBlob = await base64ToBlob(processed.thumb);

                // 4. Upload to Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${self.crypto.randomUUID()}`; // Base name
                const filePath = `${user.id}/${selectedEvent.id}/${fileName}`;

                // Upload Original (Private Bucket)
                const { data: origData, error: origError } = await api.supabase.storage
                    .from('photos-original')
                    .upload(`${filePath}-original.${fileExt}`, originalBlob);

                if (origError) throw origError;

                // Upload Preview (Public Bucket)
                const { data: prevData, error: prevError } = await api.supabase.storage
                    .from('photos-preview')
                    .upload(`${filePath}-preview.webp`, previewBlob); // Preview is always webp

                if (prevError) throw prevError;

                // Upload Thumb (Public Bucket)
                const { data: thumbData, error: thumbError } = await api.supabase.storage
                    .from('photos-preview')
                    .upload(`${filePath}-thumb.webp`, thumbBlob); // Thumb is always webp

                if (thumbError) throw thumbError;

                // Get Public URLs for Preview and Thumb
                const { data: prevUrlData } = api.supabase.storage.from('photos-preview').getPublicUrl(`${filePath}-preview.webp`);
                const { data: thumbUrlData } = api.supabase.storage.from('photos-preview').getPublicUrl(`${filePath}-thumb.webp`);

                // 5. Save Metadata to DB
                // For original, we save the PATH (to be used with createSignedUrl)
                // For preview/thumb, we save the Public URL
                const newPhoto = await api.createPhoto({
                    photographer_id: user.id,
                    category_id: selectedEvent.category_id,
                    title: `${selectedEvent.name} - ${files.indexOf(file) + 1}`,
                    description: `Foto do evento ${selectedEvent.name}`,
                    price: metadata.price,
                    preview_url: prevUrlData.publicUrl,
                    file_url: `${filePath}-original.${fileExt}`, // Store relative path for private access
                    thumb_url: thumbUrlData.publicUrl,
                    resolution: '4K',
                    width: processed.width,
                    height: processed.height,
                    tags: metadata.tags,
                    is_public: metadata.is_public,
                    is_featured: false,
                    event_id: selectedEvent.id
                });

                // ... (Indexing logic stays same) ...

                if (newPhoto) {
                    // AUTOMATIC INDEXING:
                    try {
                        // Index face if enabled
                        if ((user as any).face_indexing_enabled !== false) { // Default true
                            // Must create an image element for face-api
                            const indexingImg = new Image();
                            indexingImg.src = newPhoto.preview_url;
                            // CrossOrigin might be needed if public bucket domain differs, usually ok with std supabase
                            indexingImg.crossOrigin = "anonymous";
                            await new Promise((resolve, reject) => {
                                indexingImg.onload = resolve;
                                indexingImg.onerror = reject;
                            });

                            await faceRecognitionService.indexPhoto(newPhoto.id, indexingImg); // Use loaded image
                        }
                    } catch (idxError: any) {
                        // Check if it's a "no face found" error which is expected for some photos
                        if (idxError.message && idxError.message.includes("Nenhum rosto")) {
                            console.warn(`Aviso: Indexação facial pulada para foto ${newPhoto.id} (Nenhum rosto detectado).`);
                        } else {
                            console.warn("Falha na indexação facial (não impede o upload):", idxError);
                        }
                    }

                    successCount++;
                }

            } catch (err: any) {
                console.error(`Upload error for ${file.name}:`, err);
                failCount++;
            }

            // ... (Progress update call if I had passed one, but loop handles batch) ...
        } // End Loop

        setIsBatchUploadModalOpen(false);

        if (failCount > 0) {
            if (successCount === 0) {
                showToast(`Falha no envio. Verifique permissões e conexão.`, "error");
            } else {
                showToast(`Envio parcial: ${successCount} sucessos, ${failCount} falhas.`, "info");
            }
        } else {
            showToast(`Upload concluído! ${successCount} fotos processadas.`, "success");
        }

        fetchData();
    };

    // --- VIEW HELPERS ---
    // showToastNotification Helper removed (using useToast directly)

    // Filter Logic restricted to Selected Event if in details view
    const filteredPhotos = useMemo(() => {
        let list = photos;

        // Filter by Event
        if (view === 'events') {
            // Should not happen, but safe guard
            return [];
        } else if (selectedEvent) {
            list = list.filter(p => p.event_id === selectedEvent.id);
        }

        return list.filter(photo => {
            const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesFilter = true;
            if (filterStatus === 'public') matchesFilter = photo.is_public;
            if (filterStatus === 'private') matchesFilter = !photo.is_public;
            if (filterStatus === 'approved') matchesFilter = photo.moderation_status === 'approved';
            if (filterStatus === 'pending') matchesFilter = photo.moderation_status === 'pending';
            if (filterStatus === 'rejected') matchesFilter = photo.moderation_status === 'rejected';
            return matchesSearch && matchesFilter;
        });
    }, [photos, searchTerm, filterStatus, selectedEvent, view]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);
    const paginatedPhotos = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPhotos.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPhotos, currentPage, itemsPerPage]);

    const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setFilterStatus(e.target.value); setCurrentPage(1); };

    // --- REUSED HANDLERS (Delete, Edit, Likes) ---
    const handleDelete = async (photo: Photo) => {
        const isConfirmed = await confirm({
            title: "Confirmar Exclusão",
            message: "Tem certeza que deseja excluir esta foto?",
            confirmText: "Excluir",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            const success = await api.deletePhoto(photo.id);
            if (success) {
                setPhotos(prev => prev.filter(p => p.id !== photo.id));
                showToast('Foto excluída com sucesso.', 'success');
            } else { showToast('Erro ao excluir foto.', 'error'); }
        } catch (error) { showToast('Erro ao excluir foto.', 'error'); }
    };
    // handleConfirmDelete removed

    // ... (Keep existing simple edit/like handlers reused properly)
    const handleOpenLikesModal = (photo: Photo) => { if (photo.likes > 0) { setSelectedPhotoForLikes(photo); setIsLikesModalOpen(true); } };
    const handleManualIndex = (photo: Photo) => { setPhotoToIndex(photo); setIsIndexConfirmModalOpen(true); };
    const confirmManualIndex = async () => { /* reuse existing logic */
        if (!photoToIndex) return;
        setIsIndexConfirmModalOpen(false);
        try {
            const img = new Image(); img.crossOrigin = "anonymous"; img.src = photoToIndex.preview_url;
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
            await faceRecognitionService.indexPhoto(photoToIndex.id, img);
            setPhotos(prev => prev.map(p => p.id === photoToIndex.id ? { ...p, is_face_indexed: true } : p));
            showToast("Sucesso! Rostos indexados.", 'success');
        } catch (error: any) { showToast(`Erro: ${error.message}`, 'error'); }
    };

    const confirmBulkIndex = async () => { /* reuse logic - careful with scope variables */
        setIsBulkStartConfirmOpen(false);
        const unindexedPhotos = (view === 'events' ? photos : filteredPhotos).filter(p => !p.is_face_indexed); // Logic adaptation
        setIsBulkIndexing(true); setIsBulkStopRequested(false); stopBulkRef.current = false;
        setBulkProgress({ current: 0, total: unindexedPhotos.length, successes: 0, failures: 0 });
        let successes = 0; let failures = 0;
        for (let i = 0; i < unindexedPhotos.length; i++) {
            if (stopBulkRef.current) break;
            setBulkProgress(prev => ({ ...prev, current: i + 1 }));
            const photo = unindexedPhotos[i];
            try {
                const img = new Image(); img.crossOrigin = "anonymous"; img.src = photo.preview_url;
                await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
                await faceRecognitionService.indexPhoto(photo.id, img);
                setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_face_indexed: true } : p));
                successes++;
            } catch (error) { failures++; }
            await new Promise(r => setTimeout(r, 100)); // throttle
        }
        setIsBulkIndexing(false);
        showToast(`Processo finalizado: ${successes} processados.`, 'info');
    };

    // Status Chip Helper
    const getStatusChip = (status: Photo['moderation_status'], reason?: string) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status) {
            case 'approved': return <span className={`${baseClasses} bg-green-100 text-green-800`}>Aprovado</span>;
            case 'pending': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pendente</span>;
            case 'rejected': return <span title={reason} className={`${baseClasses} bg-red-100 text-red-800 cursor-help`}>Rejeitado</span>;
            default: return null;
        }
    }

    if (loading && events.length === 0 && photos.length === 0) return <Spinner />;

    return (
        <div>
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    {view === 'photos' && (
                        <button
                            onClick={() => { setView('events'); setSelectedEvent(null); }}
                            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                        >
                            <ArrowLeftIcon />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-display font-bold text-primary-dark">
                            {view === 'events' ? 'Meus Eventos' : selectedEvent?.name}
                        </h1>
                        {view === 'photos' && selectedEvent && (
                            <p className="text-neutral-500 text-sm">{getCategoryName(selectedEvent.category_id)} • {new Date(selectedEvent.event_date).toLocaleDateString()}</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {view === 'events' ? (
                        <button
                            onClick={() => setIsEventModalOpen(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <PlusIcon /> Novo Evento
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsBulkStartConfirmOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors shadow-sm"
                            >
                                Indexar Rosto
                            </button>
                            <button
                                onClick={() => setIsBatchUploadModalOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <PlusIcon /> Adicionar Fotos
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* View Switching */}
            {view === 'events' ? (
                // --- EVENT LIST VIEW ---
                <div>
                    {events.length === 0 ? (
                        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
                            <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <FolderIcon />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum evento criado</h3>
                            <p className="text-neutral-500 mb-6">Crie seu primeiro evento para começar a organizar e vender suas fotos.</p>
                            <button
                                onClick={() => setIsEventModalOpen(true)}
                                className="px-6 py-3 text-sm font-bold text-white bg-primary rounded-full hover:bg-primary-dark transition-colors shadow-md"
                            >
                                Criar Primeiro Evento
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map(event => {
                                const eventPhotos = photos.filter(p => p.event_id === event.id);
                                return (
                                    <div
                                        key={event.id}
                                        className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                                        onClick={() => { setSelectedEvent(event); setView('photos'); }}
                                    >
                                        <div className="h-40 bg-neutral-200 relative">
                                            {event.cover_photo_url || eventPhotos.length > 0 ? (
                                                <img
                                                    src={event.cover_photo_url || eventPhotos[0].preview_url}
                                                    alt="Capa"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                    <FolderIcon />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDeleteEvent(event.id, e)}
                                                    className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 shadow-sm"
                                                    title="Excluir Evento"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-neutral-800 line-clamp-1">{event.name}</h3>
                                                <span className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                                    {eventPhotos.length} fotos
                                                </span>
                                            </div>
                                            <p className="text-sm text-neutral-500 mb-3">{getCategoryName(event.category_id)}</p>
                                            <div className="flex items-center text-xs text-neutral-400 gap-4">
                                                <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>
                                                {event.location && <span>📍 {event.location}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                // --- PHOTOGRAPHER FILTERED LIST VIEW (Existing Logic) ---
                <div>
                    {/* Stats Card */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-neutral-800 text-lg">Uso do Plano</h3>
                            <p className="text-sm text-neutral-500">
                                Você usou <span className="font-semibold text-neutral-900">{stats.photos_count}</span> de <span className="font-semibold text-neutral-900">{stats.photo_limit}</span> fotos.
                            </p>
                            {stats.photos_count >= stats.photo_limit && (
                                <p className="text-xs text-red-600 font-bold mt-1">Limite atingido! Entre em contato para aumentar.</p>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium">
                                <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                    {stats.approved_count} Aprovadas
                                </span>
                                <span className="text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                                    {stats.pending_count} Pendentes
                                </span>
                                <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                    {stats.rejected_count} Rejeitadas
                                </span>
                            </div>

                            {/* Storage Request Logic */}
                            {(myRequest && myRequest.status === 'pending') ? (
                                <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                                    ⏳ Solicitação em análise
                                </span>
                            ) : (myRequest && myRequest.status === 'rejected') ? (
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1 rounded-full border border-red-100 mb-1" title={myRequest.rejection_reason || ''}>
                                        ❌ Solicitação rejeitada
                                    </span>
                                    <button
                                        onClick={async () => {
                                            const isConfirmed = await confirm({
                                                title: "Nova Solicitação",
                                                message: `Sua última solicitação foi rejeitada pelo motivo: "${myRequest.rejection_reason}". Deseja tentar novamente?`,
                                                confirmText: "Solicitar Novamente"
                                            });

                                            if (!isConfirmed) return;

                                            // Handle request logic...
                                            setLoading(true);
                                            try {
                                                const result = await api.requestStorageLimit();
                                                if (result && result.success) {
                                                    showToast("Solicitação enviada com sucesso!", "success");
                                                    fetchData(); // Refresh to get new pending status
                                                } else {
                                                    showToast(result.error || "Erro ao enviar solicitação.", "error");
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                showToast("Erro ao processar solicitação.", "error");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        className="text-xs text-primary hover:text-primary-dark underline font-medium"
                                    >
                                        Tentar Novamente
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        const isConfirmed = await confirm({
                                            title: "Solicitar Aumento",
                                            message: "Deseja solicitar o aumento do seu limite de fotos para o admin?",
                                            confirmText: "Solicitar"
                                        });

                                        if (!isConfirmed) return;

                                        setLoading(true);
                                        try {
                                            const result = await api.requestStorageLimit();
                                            if (result && result.success) {
                                                showToast("Solicitação enviada com sucesso!", "success");
                                                fetchData();
                                            } else {
                                                showToast(result.error || "Erro ao enviar solicitação.", "error");
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            showToast("Erro ao processar solicitação.", "error");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="text-xs text-primary hover:text-primary-dark underline font-medium"
                                >
                                    Solicitar Aumento de Limite
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-6 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Buscar fotos neste evento..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                        </div>
                        <div className="md:w-64">
                            <select
                                value={filterStatus}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="public">Públicas</option>
                                <option value="private">Privadas</option>
                                <option value="approved">Aprovadas</option>
                                <option value="pending">Pendentes</option>
                                <option value="rejected">Rejeitadas</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px]">
                                <thead className="bg-neutral-100">
                                    <tr>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Foto</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Título</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Categoria</th>
                                        <th className="p-4 text-right text-sm font-semibold text-neutral-600">Preço</th>
                                        <th className="p-4 text-center text-sm font-semibold text-neutral-600">Visibilidade</th>
                                        <th className="p-4 text-center text-sm font-semibold text-neutral-600">Moderação</th>
                                        <th className="p-4 text-right text-sm font-semibold text-neutral-600">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPhotos.map((photo, index) => (
                                        <tr key={photo.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                            <td className="p-2">
                                                <img
                                                    src={photo.thumb_url || photo.preview_url}
                                                    alt={photo.title}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-16 h-12 object-cover rounded-md border border-neutral-200"
                                                />
                                            </td>
                                            <td className="p-4 text-sm font-medium text-neutral-800">{photo.title}</td>
                                            <td className="p-4 text-sm text-neutral-500">{getCategoryName(photo.category_id)}</td>
                                            <td className="p-4 text-sm text-green-600 font-medium text-right">{photo.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${photo.is_public ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
                                                    {photo.is_public ? 'Pública' : 'Privada'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {getStatusChip(photo.moderation_status, photo.rejection_reason)}
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setEditingPhoto(photo); setIsModalOpen(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-full" title="Editar"><EditIcon /></button>
                                                    <button onClick={() => handleDelete(photo)} className="text-red-600 p-2 hover:bg-red-50 rounded-full" title="Excluir"><TrashIcon /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPhotos.length === 0 && (
                                        <tr><td colSpan={7} className="text-center p-8 text-neutral-500">Nenhuma foto encontrada neste evento.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4">
                            <button onClick={goToPreviousPage} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-neutral-300 rounded disabled:opacity-50">Anterior</button>
                            <span>Página {currentPage} de {totalPages}</span>
                            <button onClick={goToNextPage} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-neutral-300 rounded disabled:opacity-50">Próxima</button>
                        </div>
                    )}
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Create Event Modal */}
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="Novo Evento">
                <CreateEventForm
                    categories={categories}
                    onSubmit={handleCreateEvent}
                    onCancel={() => setIsEventModalOpen(false)}
                />
            </Modal>

            {/* Batch Upload Modal */}
            <Modal isOpen={isBatchUploadModalOpen} onClose={() => setIsBatchUploadModalOpen(false)} title="Adicionar Fotos em Lote" size="lg">
                {selectedEvent && (
                    <BatchUploadForm
                        event={selectedEvent}
                        photographerId={user.id}
                        onSubmit={handleBatchUpload}
                        onCancel={() => setIsBatchUploadModalOpen(false)}
                    />
                )}
            </Modal>

            {/* ... Other modals (Edit, Delete, Toast, etc. - ensure they are rendered) */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Foto">
                <PhotoUploadForm
                    initialData={editingPhoto}
                    photographerId={user.id}
                    categories={categories}
                    onSubmit={async (data) => {
                        try {
                            // Helper to upload blob
                            const uploadToStorage = async (b64: string, path: string, bucket: string) => {
                                const res = await fetch(b64);
                                const blob = await res.blob();
                                const { error } = await api.supabase.storage.from(bucket).upload(path, blob);
                                if (error) throw error;
                            };

                            let finalPreview = data.preview_url;
                            let finalFile = data.file_url;
                            let finalThumb = data.thumb_url || data.preview_url;

                            // If new upload (Base64), upload to Storage
                            if (data.preview_url.startsWith('data:')) {
                                const fileExt = 'webp'; // Converted format
                                const fileName = `${self.crypto.randomUUID()}`;
                                const basePath = `${user.id}/${selectedEvent?.id || 'misc'}/${fileName}`;

                                // Upload Original (data.file_url might be original base64)
                                if (data.file_url.startsWith('data:')) {
                                    // Determine ext from base64 header or default
                                    const origExt = data.file_url.substring(data.file_url.indexOf('/') + 1, data.file_url.indexOf(';'));
                                    await uploadToStorage(data.file_url, `${basePath}-original.${origExt}`, 'photos-original');
                                    finalFile = `${basePath}-original.${origExt}`;
                                }

                                // Upload Preview
                                await uploadToStorage(data.preview_url, `${basePath}-preview.webp`, 'photos-preview');
                                finalPreview = api.supabase.storage.from('photos-preview').getPublicUrl(`${basePath}-preview.webp`).data.publicUrl;

                                // Upload Thumb
                                if (data.thumb_url && data.thumb_url.startsWith('data:')) {
                                    await uploadToStorage(data.thumb_url, `${basePath}-thumb.webp`, 'photos-preview');
                                    finalThumb = api.supabase.storage.from('photos-preview').getPublicUrl(`${basePath}-thumb.webp`).data.publicUrl;
                                } else {
                                    finalThumb = finalPreview;
                                }
                            }

                            if (editingPhoto) {
                                // Update existing
                                await api.updatePhoto(editingPhoto.id, {
                                    ...data,
                                    preview_url: finalPreview,
                                    file_url: finalFile,
                                    thumb_url: finalThumb
                                });
                                showToast("Foto atualizada!", "success");
                            } else {
                                // Create new (Legacy single upload mode)
                                await api.createPhoto({
                                    ...data,
                                    photographer_id: user.id,
                                    file_url: finalFile,
                                    preview_url: finalPreview,
                                    thumb_url: finalThumb
                                });
                                showToast("Foto criada!", "success");
                            }
                            setIsModalOpen(false);
                            fetchData();
                        } catch (err: any) {
                            console.error(err);
                            showToast("Erro ao salvar foto.", "error");
                        }
                    }}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            {/* Modal Confirmar Exclusão Removed (Used Context) */}

            {/* Progress Modal needs to be reused/restored from original file but adapted */}
            {isBulkIndexing && (
                <Modal isOpen={true} onClose={() => { }} title="Indexando...">
                    <div className="p-6 text-center">
                        <p>Processando {bulkProgress.current} de {bulkProgress.total}...</p>
                        <button onClick={() => { stopBulkRef.current = true; setIsBulkIndexing(false); }} className="mt-4 text-red-600">Parar</button>
                    </div>
                </Modal>
            )}

            <Modal isOpen={isBulkStartConfirmOpen} onClose={() => setIsBulkStartConfirmOpen(false)} title="Confirmar Indexação"><div className="p-4"><p>Deseja indexar todas as fotos pendentes?</p><div className="flex justify-end mt-4"><button onClick={() => setIsBulkStartConfirmOpen(false)} className="mr-2 border px-4 rounded">Cancelar</button><button onClick={confirmBulkIndex} className="bg-purple-600 text-white px-4 rounded">Confirmar</button></div></div></Modal>

            {/* showToast && <Toast ... /> removed */}
        </div>
    );
};

export default PhotographerPhotos;
