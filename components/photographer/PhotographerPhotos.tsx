
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Photo, Category, PhotoEvent } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import WatermarkedImage from '../WatermarkedImage';
import { getOptimizedImageUrl } from '../../utils/imageOptimization';
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
const PriceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;

// Helper to convert base64 to Blob without fetch (which violates connect-src CSP)
const base64ToBlob = (b64Data: string): Blob => {
    if (!b64Data || !b64Data.includes(';base64,')) {
        return new Blob([], { type: 'image/jpeg' });
    }
    const parts = b64Data.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
};

interface PhotographerPhotosProps {
    user: User;
    onDataChange?: () => void;
    isActive?: boolean;
}

const PhotographerPhotos: React.FC<PhotographerPhotosProps> = ({ user, onDataChange, isActive }) => {
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // --- STATE ---
    const [view, setView] = useState<'events' | 'photos'>('events');
    const [events, setEvents] = useState<PhotoEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<PhotoEvent | null>(null);

    // Reset view when navigating away from this menu
    useEffect(() => {
        if (isActive === false) {
            setView('events');
            setSelectedEvent(null);
        }
    }, [isActive]);

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [eventPhotoCounts, setEventPhotoCounts] = useState<Record<string, number>>({});
    const [myRequest, setMyRequest] = useState<any>(null); // New state for storage request
    const [loading, setLoading] = useState(true);
    const stopBulkRef = useRef(false);

    // Modals
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);

    // Edit Event State
    const [editingEvent, setEditingEvent] = useState<PhotoEvent | null>(null);
    const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);

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

    // Bulk Price Edit State
    const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
    const [selectedFilterPrice, setSelectedFilterPrice] = useState<string>('all');
    const [newBulkPrice, setNewBulkPrice] = useState<string>('');
    const [bulkPriceLoading, setBulkPriceLoading] = useState(false);

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [eventsData, categoriesData, statsData, myRequestData, countsData] = await Promise.all([
                api.getPhotographerEvents(user.id),
                api.getCategories(),
                api.getPhotographerStats(user.id),
                api.getMyLatestStorageRequest(),
                api.getEventPhotoCounts(user.id)
            ]);
            setEvents(eventsData);
            setCategories(categoriesData);
            setStats(statsData);
            setMyRequest(myRequestData);
            setEventPhotoCounts(countsData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const previousEventsCount = useRef(events.length);
    const previousPhotosCount = useRef(photos.length);

    useEffect(() => {
        if (
            (previousEventsCount.current !== 0 || events.length !== 0) &&
            (events.length !== previousEventsCount.current || photos.length !== previousPhotosCount.current)
        ) {
            onDataChange?.();
        }
        previousEventsCount.current = events.length;
        previousPhotosCount.current = photos.length;
    }, [events.length, photos.length, onDataChange]);

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';

    const handleViewEvent = async (event: PhotoEvent) => {
        setSelectedEvent(event);
        setView('photos');
        setLoading(true);
        try {
            const evPhotos = await api.getPhotographerPhotosByEventId(event.id);
            setPhotos(evPhotos);
        } catch (e) {
            console.error(e);
            showToast("Erro ao carregar fotos do evento", "error");
        } finally {
            setLoading(false);
        }
    };

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

    const handleUpdateEvent = async (data: Omit<PhotoEvent, 'id' | 'created_at' | 'photographer_id'>) => {
        if (!editingEvent) return;
        try {
            const updated = await api.updateEvent(editingEvent.id, data);
            if (updated) {
                setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev));
                setIsEditEventModalOpen(false);
                setEditingEvent(null);
                showToast("Evento atualizado com sucesso!", "success");
                // Atualiza a lista inteira de fotos para refletir de imediato as renomeações que houveram no backend
                fetchData();
            } else {
                showToast("Erro ao atualizar evento.", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Erro ao atualizar evento.", "error");
        }
    };

    const handleDeleteEvent = async (event: PhotoEvent, photoCount: number) => {
        const isConfirmed = await confirm({
            title: "Excluir Evento Permanentemente",
            message: `Você tem certeza que deseja excluir o evento "${event.name}"? Esta ação removerá o evento e todas as ${photoCount} fotos vinculadas a ele. Esta ação não pode ser desfeita.`,
            confirmText: "Sim, excluir tudo",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            setLoading(true);
            const success = await api.deleteEvent(event.id);
            if (success) {
                setEvents(prev => prev.filter(ev => ev.id !== event.id));
                setPhotos(prev => prev.filter(p => p.event_id !== event.id));
                showToast("Evento e fotos excluídos com sucesso.", "success");
            }
        } catch (error) {
            console.error(error);
            showToast("Erro ao excluir evento. Verifique se existem fotos vinculadas que impedem a exclusão.", "error");
        } finally {
            setLoading(false);
        }
    }

    const handleBatchUpload = async (
        files: File[],
        metadata: { price: number, tags: string[], is_public: boolean },
        onProgress?: (stats: { current: number, total: number, successes: number, failures: number }) => void
    ): Promise<{ successCount: number; failCount: number; failedFiles: Array<{ name: string; reason: string }> }> => {
        if (!selectedEvent) return { successCount: 0, failCount: 0, failedFiles: [] };

        let successCount = 0;
        let failCount = 0;
        let processedCount = 0;
        const failedFiles: Array<{ name: string; reason: string }> = [];

        showToast(`Iniciando envio de ${files.length} arquivos...`, "info");

        const uploadSingleFile = async (file: File, index: number) => {
            const isVideo = file.type.startsWith('video/') || !!file.name.match(/\.(mp4|mov|webm)$/i);
            const MAX_SIZE_MB = isVideo ? 250 : 50;

            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                const reason = `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). O limite é de ${MAX_SIZE_MB}MB.`;
                console.error(`File ${file.name} is too large: ${reason}`);
                failedFiles.push({ name: file.name, reason });
                failCount++;
                processedCount++;
                if (onProgress) onProgress({ current: processedCount, total: files.length, successes: successCount, failures: failCount });
                return;
            }

            const validTypes = ['image/jpeg', 'image/jpg', 'image/webp', 'image/png', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const isHeic = fileExt === 'heic' || fileExt === 'heif';
            const isValidExt = ['mp4', 'mov', 'webm'].includes(fileExt || '');
            
            if (!validTypes.includes(file.type) && !isHeic && !isValidExt) {
                const reason = `Formato de arquivo não suportado (${file.type || 'desconhecido'}). Envie fotos (JPG, PNG, WebP, HEIC) ou vídeos (MP4, MOV, WebM).`;
                console.error(`File ${file.name} has invalid type: ${reason}`);
                failedFiles.push({ name: file.name, reason });
                failCount++;
                processedCount++;
                if (onProgress) onProgress({ current: processedCount, total: files.length, successes: successCount, failures: failCount });
                return;
            }

            try {
                const sequenceNum = photos.filter(p => p.event_id === selectedEvent.id).length + index + 1;
                const sequence = sequenceNum.toString().padStart(2, '0');
                const title = `${sequence}-${selectedEvent.name}`;

                if (isVideo) {
                    // Video Upload Logic (Cloudflare Stream)
                    const videoDetails = await new Promise<{ duration: number; width: number; height: number }>((resolve) => {
                        const video = document.createElement('video');
                        video.preload = 'metadata';
                        video.onloadedmetadata = () => resolve({
                            duration: video.duration,
                            width: video.videoWidth,
                            height: video.videoHeight
                        });
                        video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
                        video.src = URL.createObjectURL(file);
                    });

                    if (videoDetails.duration > 90) {
                        throw new Error(`Vídeo deve ter no máximo 90 segundos. (Duração identificada: ${Math.round(videoDetails.duration)}s)`);
                    }

                    const apiUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/api/cloudflare-stream-url` : '/api/cloudflare-stream-url';
                    const urlRes = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creator_id: user.id, max_duration_seconds: 90 })
                    });
                    
                    const urlData = await urlRes.json();
                    if (!urlRes.ok) throw new Error(urlData.error || "Erro ao gerar URL segura de upload de vídeo");

                    const formData = new FormData();
                    formData.append('file', file);
                    const cfUploadRes = await fetch(urlData.uploadURL, { method: 'POST', body: formData });
                    if (!cfUploadRes.ok) throw new Error("Erro ao enviar arquivo para o Cloudflare");

                    const uid = urlData.uid;

                    const newPhoto = await api.createPhoto({
                        photographer_id: user.id,
                        category_id: selectedEvent.category_id,
                        title: title,
                        description: `Vídeo do evento ${selectedEvent.name}`,
                        price: metadata.price,
                        preview_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.gif`,
                        file_url: `https://iframe.videodelivery.net/${uid}`,
                        thumb_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
                        resolution: 'HD',
                        width: videoDetails.width,
                        height: videoDetails.height,
                        tags: metadata.tags,
                        is_public: metadata.is_public,
                        is_featured: false,
                        event_id: selectedEvent.id,
                        media_type: 'video',
                        video_uid: uid,
                        video_duration: Math.round(videoDetails.duration),
                        file_size_bytes: file.size
                    });

                    if (newPhoto) {
                        successCount++;
                        setPhotos(prev => [newPhoto, ...prev]);
                    }

                } else {
                    // Original Photo Upload Logic
                    const processed = await processImageForUpload(file);
                    const [originalBlob, previewBlob, thumbBlob] = await Promise.all([
                        base64ToBlob(processed.original),
                        base64ToBlob(processed.preview),
                        base64ToBlob(processed.thumb)
                    ]);

                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`; 
                    const filePath = `${user.id}/${selectedEvent.id}/${fileName}`;

                    const [origRes, prevRes, thumbRes] = await Promise.all([
                        api.supabase.storage.from('photos-original').upload(`${filePath}-original.${fileExt}`, originalBlob),
                        api.supabase.storage.from('photos-preview').upload(`${filePath}-preview.webp`, previewBlob),
                        api.supabase.storage.from('photos-preview').upload(`${filePath}-thumb.webp`, thumbBlob)
                    ]);

                    if (origRes.error) throw origRes.error;
                    if (prevRes.error) throw prevRes.error;
                    if (thumbRes.error) throw thumbRes.error;

                    const { data: prevUrlData } = api.supabase.storage.from('photos-preview').getPublicUrl(`${filePath}-preview.webp`);
                    const { data: thumbUrlData } = api.supabase.storage.from('photos-preview').getPublicUrl(`${filePath}-thumb.webp`);

                    const newPhoto = await api.createPhoto({
                        photographer_id: user.id,
                        category_id: selectedEvent.category_id,
                        title: title,
                        description: `Foto do evento ${selectedEvent.name}`,
                        price: metadata.price,
                        preview_url: prevUrlData.publicUrl,
                        file_url: `${filePath}-original.${fileExt}`,
                        thumb_url: thumbUrlData.publicUrl,
                        resolution: '4K',
                        width: processed.width,
                        height: processed.height,
                        tags: metadata.tags,
                        is_public: metadata.is_public,
                        is_featured: false,
                        event_id: selectedEvent.id,
                        file_size_bytes: originalBlob.size
                    });

                    if (newPhoto) {
                        if ((user as any).face_indexing_enabled !== false) {
                            faceRecognitionService.indexPhoto(newPhoto.id, newPhoto.preview_url)
                                .catch(err => console.warn("Face indexing failed:", err));
                        }
                        successCount++;
                        setPhotos(prev => [newPhoto, ...prev]);
                    }
                }

            } catch (err: any) {
                console.error(`Upload error for ${file.name}:`, err);
                failCount++;
                const errMsg = err.message || "Erro desconhecido durante o upload.";
                failedFiles.push({ name: file.name, reason: errMsg });
            } finally {
                processedCount++;
                if (onProgress) onProgress({ 
                    current: processedCount, 
                    total: files.length, 
                    successes: successCount, 
                    failures: failCount 
                });
            }
        };

        // Execution with concurrency limit (e.g., 3 files at a time)
        const CONCURRENCY = 3;
        const fileEntries = Array.from(files.entries());
        const executeTasks = async () => {
            const workers = [];
            const queue = [...fileEntries];
            
            for (let i = 0; i < Math.min(CONCURRENCY, files.length); i++) {
                workers.push((async () => {
                    while (queue.length > 0) {
                        const task = queue.shift();
                        if (task) {
                            const [index, file] = task;
                            await uploadSingleFile(file, index);
                        }
                    }
                })());
            }
            await Promise.all(workers);
        };

        await executeTasks();

        if (failCount === 0) {
            setIsBatchUploadModalOpen(false);
            showToast(`Upload concluído! ${successCount} arquivos processados com sucesso.`, "success");
        } else {
            if (successCount === 0) {
                showToast(`Falha no envio de todos os arquivos. Verifique os erros exibidos no painel.`, "error");
            } else {
                showToast(`Envio concluído com erros: ${successCount} com sucesso, ${failCount} falhas.`, "info");
            }
        }

        fetchData();

        return {
            successCount,
            failCount,
            failedFiles
        };
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

    const priceGroups = useMemo(() => {
        if (!selectedEvent) return [];
        const groups: Record<number, number> = {};
        photos.forEach(photo => {
            if (photo.event_id === selectedEvent.id) {
                groups[photo.price] = (groups[photo.price] || 0) + 1;
            }
        });
        return Object.entries(groups).map(([priceStr, count]) => ({
            price: Number(priceStr),
            count
        })).sort((a, b) => b.count - a.count);
    }, [photos, selectedEvent]);

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
            await faceRecognitionService.indexPhoto(photoToIndex.id, photoToIndex.preview_url);
            setPhotos(prev => prev.map(p => p.id === photoToIndex.id ? { ...p, is_face_indexed: true } : p));
            showToast("Sucesso! Rostos indexados.", 'success');
        } catch (error: any) { showToast(`Erro: ${error.message}`, 'error'); }
    };

    const handleConfirmBulkPriceUpdate = async () => {
        if (!selectedEvent) return;
        const newPrice = parseFloat(newBulkPrice);
        if (isNaN(newPrice) || newPrice < 10) {
            showToast("O preço mínimo por foto deve ser de R$ 10,00.", "error");
            return;
        }

        const isConfirmed = await confirm({
            title: "Confirmar Alteração de Preços",
            message: `Você tem certeza que deseja alterar o preço para ${newPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação afetará as fotos selecionadas e não pode ser desfeita.`,
            confirmText: "Confirmar",
            cancelText: "Cancelar"
        });

        if (!isConfirmed) return;

        setBulkPriceLoading(true);
        try {
            let query = api.supabase
                .from('photos')
                .update({ price: newPrice })
                .eq('event_id', selectedEvent.id);

            if (selectedFilterPrice !== 'all') {
                query = query.eq('price', parseFloat(selectedFilterPrice));
            }

            const { error } = await query;
            if (error) throw error;

            showToast("Preços atualizados com sucesso!", "success");
            setIsBulkPriceModalOpen(false);
            setNewBulkPrice('');
            setSelectedFilterPrice('all');

            // Recarregar fotos e estatísticas
            const evPhotos = await api.getPhotographerPhotosByEventId(selectedEvent.id);
            setPhotos(evPhotos);
            fetchData();
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Erro ao alterar preços em lote.", "error");
        } finally {
            setBulkPriceLoading(false);
        }
    };

    const confirmBulkIndex = async () => {
        setIsBulkStartConfirmOpen(false);
        const unindexedPhotos = photos.filter(p => !p.is_face_indexed && (selectedEvent ? p.event_id === selectedEvent.id : true));
        
        setIsBulkIndexing(true);
        setIsBulkStopRequested(false);
        stopBulkRef.current = false;
        setBulkProgress({ current: 0, total: unindexedPhotos.length, successes: 0, failures: 0 });
        
        let successes = 0;
        let failures = 0;
        
        for (let i = 0; i < unindexedPhotos.length; i++) {
            if (stopBulkRef.current) break;
            
            setBulkProgress(prev => ({ ...prev, current: i + 1 }));
            const photo = unindexedPhotos[i];
            
            try {
                await faceRecognitionService.indexPhoto(photo.id, photo.preview_url || photo.thumb_url);
                setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_face_indexed: true } : p));
                successes++;
            } catch (error) {
                console.warn(`Erro ao indexar foto ${photo.id}:`, error);
                // Força marcação como indexado para não tentar infinitamente nas próximas vezes
                await api.supabase.from('photos').update({ is_face_indexed: true }).eq('id', photo.id);
                failures++;
            }
            
            setBulkProgress(prev => ({ ...prev, successes, failures }));
            await new Promise(r => setTimeout(r, 150));
        }
        
        setIsBulkIndexing(false);
        showToast(`Processo finalizado: ${successes} processados, ${failures} falhas.`, 'info');
        fetchData();
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

    if (loading && events.length === 0 && photos.length === 0) return <Spinner size="lg" fullHeight={true} label="Carregando seus eventos e fotos..." />;

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
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <button
                                onClick={() => setIsBulkPriceModalOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-primary-dark bg-primary/10 border border-primary-dark rounded-full hover:bg-primary/20 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                <PriceIcon /> Alterar Preços em Lote
                            </button>
                            <button
                                onClick={() => setIsBulkStartConfirmOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-primary-dark bg-primary/10 border border-primary-dark rounded-full hover:bg-primary/20 transition-colors shadow-sm"
                            >
                                Indexar Rosto
                            </button>
                            <button
                                onClick={() => setIsBatchUploadModalOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <PlusIcon /> Adicionar Fotos/Vídeos
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
                                const eventPhotoCount = eventPhotoCounts[event.id] || 0;
                                return (
                                    <div
                                        key={event.id}
                                        className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow group relative"
                                    >
                                        {/* Área Clicável: Imagem */}
                                        <div 
                                            className="h-40 bg-neutral-200 relative cursor-pointer overflow-hidden"
                                            onClick={() => handleViewEvent(event)}
                                        >
                                            {event.cover_photo_url ? (
                                                <WatermarkedImage
                                                    src={getOptimizedImageUrl(event.cover_photo_url, 600, 75)}
                                                    alt="Capa"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                    <FolderIcon />
                                                </div>
                                            )}
                                        </div>

                                        {/* Área de Ações: Absoluta e isolada do clique pai */}
                                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingEvent(event);
                                                    setIsEditEventModalOpen(true);
                                                }}
                                                className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-primary-dark hover:bg-white shadow-sm transition-all hover:scale-110 active:scale-95"
                                                title="Editar Evento"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteEvent(event, eventPhotoCount);
                                                }}
                                                className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-600 hover:bg-white shadow-sm transition-all hover:scale-110 active:scale-95"
                                                title="Excluir Evento"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>

                                        {/* Área Clicável: Informações */}
                                        <div 
                                            className="p-4 cursor-pointer"
                                            onClick={() => handleViewEvent(event)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-neutral-800 line-clamp-1 group-hover:text-primary transition-colors">{event.name}</h3>
                                                <span className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                                    {eventPhotoCount} fotos
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
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-neutral-800 text-lg">Estatísticas</h3>
                            <p className="text-sm text-neutral-500">
                                Você já enviou <span className="font-semibold text-neutral-900">{stats.photos_count}</span> fotos.
                            </p>
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
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-neutral-100">
                            {paginatedPhotos.map((photo) => (
                                <div key={photo.id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 150, 70)}
                                                alt={photo.title}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-20 h-14 object-cover rounded-md border border-neutral-200"
                                            />
                                            {photo.media_type === 'video' && (
                                                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded flex items-center gap-0.5 z-10">
                                                    ▶ {photo.video_duration ? `${photo.video_duration}s` : 'Víd'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-neutral-800 text-sm truncate">{photo.title}</p>
                                            <p className="text-xs text-neutral-500 mt-0.5">{getCategoryName(photo.category_id)}</p>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${photo.is_public ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
                                                    {photo.is_public ? 'Pública' : 'Privada'}
                                                </span>
                                                {getStatusChip(photo.moderation_status, photo.rejection_reason)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                                            <span className="font-bold text-green-600">{photo.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            <span>{photo.sales_count || 0} venda(s)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setEditingPhoto(photo); setIsModalOpen(true); }} className="text-primary-dark p-2 hover:bg-primary/10 rounded-full" title="Editar"><EditIcon /></button>
                                            <button onClick={() => handleDelete(photo)} className="text-red-600 p-2 hover:bg-red-50 rounded-full" title="Excluir"><TrashIcon /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredPhotos.length === 0 && <p className="text-center p-8 text-neutral-500">Nenhuma foto encontrada neste evento.</p>}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[960px]">
                                <thead className="bg-neutral-100">
                                    <tr>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Foto</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Título</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Categoria</th>
                                        <th className="p-4 text-center text-sm font-semibold text-neutral-600">Qtd Vendas</th>
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
                                                <div className="relative w-16 h-12">
                                                    <img
                                                        src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 150, 70)}
                                                        alt={photo.title}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-16 h-12 object-cover rounded-md border border-neutral-200"
                                                    />
                                                    {photo.media_type === 'video' && (
                                                        <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded flex items-center gap-0.5 z-10">
                                                            ▶ {photo.video_duration ? `${photo.video_duration}s` : 'Víd'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-neutral-800">{photo.title}</td>
                                            <td className="p-4 text-sm text-neutral-500">{getCategoryName(photo.category_id)}</td>
                                            <td className="p-4 text-sm font-bold text-neutral-700 text-center bg-neutral-50/50">{photo.sales_count || 0}</td>
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
                                                    <button onClick={() => { setEditingPhoto(photo); setIsModalOpen(true); }} className="text-primary-dark p-2 hover:bg-primary/10 rounded-full" title="Editar"><EditIcon /></button>
                                                    <button onClick={() => handleDelete(photo)} className="text-red-600 p-2 hover:bg-red-50 rounded-full" title="Excluir"><TrashIcon /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPhotos.length === 0 && (
                                        <tr><td colSpan={8} className="text-center p-8 text-neutral-500">Nenhuma foto encontrada neste evento.</td></tr>
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

            {/* Edit Event Modal */}
            <Modal isOpen={isEditEventModalOpen} onClose={() => setIsEditEventModalOpen(false)} title="Editar Evento">
                {editingEvent && (
                    <CreateEventForm
                        categories={categories}
                        onSubmit={handleUpdateEvent}
                        onCancel={() => setIsEditEventModalOpen(false)}
                        initialData={editingEvent}
                    />
                )}
            </Modal>

            {/* Batch Upload Modal */}
            <Modal isOpen={isBatchUploadModalOpen} onClose={() => setIsBatchUploadModalOpen(false)} title="Adicionar Fotos em Lote" size="lg" closeOnOverlayClick={false}>
                {selectedEvent && (
                    <BatchUploadForm
                        event={selectedEvent}
                        photographerId={user.id}
                        onSubmit={handleBatchUpload}
                        onCancel={() => setIsBatchUploadModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Bulk Price Edit Modal */}
            <Modal
                isOpen={isBulkPriceModalOpen}
                onClose={() => {
                    setIsBulkPriceModalOpen(false);
                    setNewBulkPrice('');
                    setSelectedFilterPrice('all');
                }}
                title="Alterar Preços em Lote"
            >
                <div className="space-y-6">
                    {/* Price distribution summary */}
                    <div>
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                            Distribuição de Preços Atual no Evento
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {priceGroups.map((group) => (
                                <div
                                    key={group.price}
                                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 transition-all hover:bg-neutral-100/50"
                                >
                                    <span className="text-sm font-medium text-neutral-700">
                                        {group.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <span className="text-xs font-bold text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
                                        {group.count} {group.count === 1 ? 'foto' : 'fotos'}
                                    </span>
                                </div>
                            ))}
                            {priceGroups.length === 0 && (
                                <p className="text-sm text-neutral-400 italic py-2 col-span-2 text-center">
                                    Nenhuma foto cadastrada neste evento.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-neutral-100 my-4" />

                    {/* Form Controls */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Quais fotos você deseja alterar?
                            </label>
                            <select
                                value={selectedFilterPrice}
                                onChange={(e) => setSelectedFilterPrice(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="all">Todas as fotos do evento ({photos.length} fotos)</option>
                                {priceGroups.map((group) => (
                                    <option key={group.price} value={group.price}>
                                        Fotos que hoje custam {group.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({group.count} fotos)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Novo preço unitário
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold text-sm">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="10"
                                    placeholder="10,00"
                                    value={newBulkPrice}
                                    onChange={(e) => setNewBulkPrice(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                            <p className="text-xs text-red-500 mt-1 font-semibold">⚠️ Mínimo: R$ 10,00 por foto</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsBulkPriceModalOpen(false);
                                setNewBulkPrice('');
                                setSelectedFilterPrice('all');
                            }}
                            disabled={bulkPriceLoading}
                            className="px-5 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-full hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmBulkPriceUpdate}
                            disabled={bulkPriceLoading || !newBulkPrice}
                            className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-full hover:bg-opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                        >
                            {bulkPriceLoading ? 'Aplicando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
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
                                const blob = base64ToBlob(b64);
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

            <Modal isOpen={isBulkStartConfirmOpen} onClose={() => setIsBulkStartConfirmOpen(false)} title="Confirmar Indexação"><div className="p-4"><p>Deseja indexar todas as fotos pendentes?</p><div className="flex justify-end mt-4"><button onClick={() => setIsBulkStartConfirmOpen(false)} className="mr-2 border px-4 rounded">Cancelar</button><button onClick={confirmBulkIndex} className="bg-primary-dark text-white px-4 rounded">Confirmar</button></div></div></Modal>

            {/* showToast && <Toast ... /> removed */}
        </div>
    );
};

export default PhotographerPhotos;


