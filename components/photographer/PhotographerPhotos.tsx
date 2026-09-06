
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
import { processImageForUpload, processImageFast } from '../../utils/imageProcessing';
import { s3Service } from '../../services/s3Service';

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
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;

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
    const uploadAbortRef = useRef<boolean>(false);

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

    // Photo Preview Modal State
    const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

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
    const [selectedFolder, setSelectedFolder] = useState('all');

    // Multi-Selection State for Photos
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [stats, setStats] = useState<any>(null); // Add stats state

    // Bulk Price Edit State
    const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
    const [selectedFilterPrice, setSelectedFilterPrice] = useState<string>('all');
    const [newBulkPrice, setNewBulkPrice] = useState<string>('');
    const [bulkPriceLoading, setBulkPriceLoading] = useState(false);

    // Bulk Folder State
    const [isBulkFolderModalOpen, setIsBulkFolderModalOpen] = useState(false);
    const [bulkFolderSource, setBulkFolderSource] = useState<string>('none');
    const [bulkFolderDestMode, setBulkFolderDestMode] = useState<'select' | 'new'>('select');
    const [bulkFolderDestSelect, setBulkFolderDestSelect] = useState<string>('none');
    const [bulkFolderDestNew, setBulkFolderDestNew] = useState<string>('');
    const [bulkFolderLoading, setBulkFolderLoading] = useState(false);

    const existingFolders = useMemo(() => {
        if (!selectedEvent) return [];
        const folders = photos
            .filter(p => p.event_id === selectedEvent.id && p.sub_group)
            .map(p => p.sub_group as string);
        return Array.from(new Set(folders)).filter(Boolean);
    }, [photos, selectedEvent]);

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [eventsData, categoriesData, statsData, myRequestData, countsData] = await Promise.all([
                api.getPhotographerEvents(user.id, user.email),
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
    }, [user.id, user.email]);

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
        setSelectedFolder('all');
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
                if (selectedEvent && selectedEvent.id === updated.id) {
                    setSelectedEvent(updated);
                }
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
        metadata: { price: number, tags: string[], is_public: boolean, sub_group?: string | null },
        onProgress?: (stats: { current: number, total: number, successes: number, failures: number }) => void
    ): Promise<{ successCount: number; failCount: number; failedFiles: Array<{ name: string; reason: string }> }> => {
        if (!selectedEvent) return { successCount: 0, failCount: 0, failedFiles: [] };

        let successCount = 0;
        let failCount = 0;
        let processedCount = 0;
        const failedFiles: Array<{ name: string; reason: string }> = [];

        uploadAbortRef.current = false;
        showToast(`Iniciando envio de ${files.length} arquivos...`, "info");

        const uploadSingleFile = async (file: File, index: number) => {
            if (uploadAbortRef.current) return;
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
                        file_size_bytes: file.size,
                        sub_group: metadata.sub_group,
                        original_filename: file.name
                    });

                    if (newPhoto) {
                        successCount++;
                        setPhotos(prev => [newPhoto, ...prev]);
                    }

                } else {
                    // Fast Hardware Accelerated Processing (2K WebP 85% Quality + Watermark)
                    const { thumbBlob, previewBlob, width, height } = await processImageFast(file);

                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`; 
                    let previewUrl = '';
                    let thumbUrl = '';
                    let fileUrl = '';

                    // ⚡ Tentativa 1: Upload Direto para AWS S3 de Alta Velocidade
                    try {
                        const [prevS3, thumbS3, origS3] = await Promise.all([
                            s3Service.uploadDirect(previewBlob, 'previews', user.id, selectedEvent.id, `${fileName}-preview.webp`),
                            s3Service.uploadDirect(thumbBlob, 'thumbs', user.id, selectedEvent.id, `${fileName}-thumb.webp`),
                            s3Service.uploadDirect(file, 'originals', user.id, selectedEvent.id, `${fileName}-original.${fileExt}`)
                        ]);

                        previewUrl = prevS3.publicUrl;
                        thumbUrl = thumbS3.publicUrl;
                        fileUrl = origS3.s3Key;
                    } catch (s3Err) {
                        console.warn("[Upload Flash] Fallback para Supabase Storage devido a:", s3Err);

                        // 🛡️ Fallback de Segurança 2: Supabase Storage
                        const filePath = `${user.id}/${selectedEvent.id}/${fileName}`;
                        const [prevRes, thumbRes] = await Promise.all([
                            api.supabase.storage.from('photos-preview').upload(`${filePath}-preview.webp`, previewBlob, { upsert: true }),
                            api.supabase.storage.from('photos-preview').upload(`${filePath}-thumb.webp`, thumbBlob, { upsert: true })
                        ]);

                        if (prevRes.error) throw prevRes.error;
                        if (thumbRes.error) throw thumbRes.error;

                        try {
                            const { data: { user: authUser } } = await api.supabase.auth.getUser();
                            if (authUser) {
                                await api.supabase.storage.from('photos-original').upload(`${filePath}-original.${fileExt}`, file, { upsert: true });
                            }
                        } catch (e) {}

                        const { data: prevUrlData } = api.supabase.storage.from('photos-preview').getPublicUrl(`${filePath}-preview.webp`);
                        const { data: thumbUrlData } = api.supabase.storage.from('photos-preview').getPublicUrl(`${filePath}-thumb.webp`);
                        previewUrl = prevUrlData.publicUrl;
                        thumbUrl = thumbUrlData.publicUrl;
                        fileUrl = `${filePath}-original.${fileExt}`;
                    }

                    const newPhoto = await api.createPhoto({
                        photographer_id: user.id,
                        category_id: selectedEvent.category_id,
                        title: title,
                        description: `ORIGINAL_FILENAME:${file.name}`,
                        price: metadata.price,
                        preview_url: previewUrl,
                        file_url: fileUrl,
                        thumb_url: thumbUrl,
                        resolution: '4K',
                        width: width,
                        height: height,
                        tags: metadata.tags,
                        is_public: selectedEvent.is_photos_private ? false : metadata.is_public,
                        is_featured: false,
                        event_id: selectedEvent.id,
                        file_size_bytes: file.size,
                        sub_group: metadata.sub_group,
                        original_filename: file.name
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

        // Execution with concurrency limit (10 files simultaneously)
        const CONCURRENCY = 10;
        const fileEntries = Array.from(files.entries());
        const executeTasks = async () => {
            const workers = [];
            const queue = [...fileEntries];
            
            for (let i = 0; i < Math.min(CONCURRENCY, files.length); i++) {
                workers.push((async () => {
                    while (queue.length > 0) {
                        if (uploadAbortRef.current) break;
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

        try {
            await executeTasks();

            if (failCount === 0) {
                setIsBatchUploadModalOpen(false);
                showToast(`Upload concluído! ${successCount} arquivos processados com sucesso.`, "success");
            } else {
                if (successCount === 0) {
                    showToast(`Falha no envio dos arquivos. Verifique a lista de erros.`, "error");
                } else {
                    showToast(`Envio concluído com alertas: ${successCount} com sucesso, ${failCount} falhas.`, "info");
                }
            }
        } catch (err: any) {
            console.error("Batch upload overall failure:", err);
            showToast("Erro durante o processamento do lote de arquivos.", "error");
        } finally {
            if (selectedEvent) {
                try {
                    const evPhotos = await api.getPhotographerPhotosByEventId(selectedEvent.id);
                    setPhotos(evPhotos);
                } catch (_) {}
            }
            fetchData();
        }

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

        if (selectedFolder && selectedFolder !== 'all') {
            list = list.filter(p => p.sub_group === selectedFolder);
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
    }, [photos, searchTerm, filterStatus, selectedFolder, selectedEvent, view]);

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

    useEffect(() => {
        if (!previewPhoto) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPreviewPhoto(null);
            } else if (e.key === 'ArrowLeft') {
                const currIdx = filteredPhotos.findIndex(p => p.id === previewPhoto.id);
                if (currIdx > 0) setPreviewPhoto(filteredPhotos[currIdx - 1]);
                else if (filteredPhotos.length > 0) setPreviewPhoto(filteredPhotos[filteredPhotos.length - 1]);
            } else if (e.key === 'ArrowRight') {
                const currIdx = filteredPhotos.findIndex(p => p.id === previewPhoto.id);
                if (currIdx < filteredPhotos.length - 1) setPreviewPhoto(filteredPhotos[currIdx + 1]);
                else if (filteredPhotos.length > 0) setPreviewPhoto(filteredPhotos[0]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewPhoto, filteredPhotos]);

    // --- SELECTION & BULK DELETE HANDLERS ---
    const handleToggleSelectPhoto = (id: string) => {
        setSelectedPhotoIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        const visibleIds = filteredPhotos.map(p => p.id);
        const allSelected = visibleIds.every(id => selectedPhotoIds.includes(id));

        if (allSelected) {
            setSelectedPhotoIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedPhotoIds(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPhotoIds.length === 0) return;

        const count = selectedPhotoIds.length;
        const isConfirmed = await confirm({
            title: `Excluir ${count} Foto(s) Selecionada(s)`,
            message: `Tem certeza absoluta que deseja excluir permanentemente ${count} foto(s)? Esta ação não poderá ser desfeita.`,
            confirmText: `Sim, Excluir ${count} Fotos`,
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            setIsBulkDeleting(true);
            const idsToDelete = [...selectedPhotoIds];
            const success = await api.deletePhotos(idsToDelete, user.id);

            if (success) {
                setPhotos(prev => prev.filter(p => !idsToDelete.includes(p.id)));
                setSelectedPhotoIds([]);
                showToast(`${count} foto(s) excluída(s) com sucesso.`, 'success');
                fetchData();
            } else {
                showToast('Erro ao excluir as fotos selecionadas.', 'error');
            }
        } catch (error: any) {
            console.error("Bulk delete error:", error);
            showToast(error.message || 'Erro ao excluir fotos.', 'error');
        } finally {
            setIsBulkDeleting(false);
        }
    };

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
                setSelectedPhotoIds(prev => prev.filter(id => id !== photo.id));
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

    const handleConfirmBulkFolder = async () => {
        if (!selectedEvent) return;

        let targetFolder: string | null = null;
        if (bulkFolderDestMode === 'new') {
            if (!bulkFolderDestNew.trim()) {
                showToast("Por favor, digite o nome da nova pasta.", "error");
                return;
            }
            targetFolder = bulkFolderDestNew.trim();
        } else {
            targetFolder = bulkFolderDestSelect === 'none' ? null : bulkFolderDestSelect;
        }

        const isConfirmed = await confirm({
            title: "Confirmar Organização em Pasta",
            message: `Você tem certeza que deseja mover as fotos selecionadas para a pasta "${targetFolder || 'Sem Pasta'}"?`,
            confirmText: "Confirmar",
            cancelText: "Cancelar"
        });

        if (!isConfirmed) return;

        setBulkFolderLoading(true);
        try {
            let query = api.supabase
                .from('photos')
                .update({ sub_group: targetFolder })
                .eq('event_id', selectedEvent.id);

            if (bulkFolderSource === 'none') {
                query = query.or('sub_group.is.null,sub_group.eq.');
            } else if (bulkFolderSource !== 'all') {
                query = query.eq('sub_group', bulkFolderSource);
            }

            const { error } = await query;
            if (error) throw error;

            showToast("Pastas organizadas com sucesso!", "success");
            setIsBulkFolderModalOpen(false);
            setBulkFolderDestNew('');
            
            // Reload photos
            const evPhotos = await api.getPhotographerPhotosByEventId(selectedEvent.id);
            setPhotos(evPhotos);
        } catch (error) {
            console.error(error);
            showToast("Erro ao organizar pastas.", "error");
        } finally {
            setBulkFolderLoading(false);
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
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-dark">
                                {view === 'events' ? 'Meus Eventos' : selectedEvent?.name}
                            </h1>
                            {view === 'photos' && selectedEvent && (
                                selectedEvent.is_photos_private ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs" title="Fotos ocultas: disponíveis somente por busca facial">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        Fotos Ocultas (Apenas Busca Facial)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs" title="Galeria pública: fotos abertas para todos">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                        Galeria Pública
                                    </span>
                                )
                            )}
                        </div>
                        {view === 'photos' && selectedEvent && (
                            <p className="text-neutral-500 text-sm mt-0.5">{getCategoryName(selectedEvent.category_id)} • {formatEventDate(selectedEvent.event_date)}</p>
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
                                onClick={() => {
                                    if (!selectedEvent) return;
                                    setEditingEvent(selectedEvent);
                                    setIsEditEventModalOpen(true);
                                }}
                                className="px-3.5 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-full hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm flex items-center gap-1.5"
                                title="Editar detalhes e visibilidade do evento"
                            >
                                <EditIcon />
                                <span>Editar</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!selectedEvent) return;
                                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fotoclic.com.br';
                                    const eventUrl = `${origin}/evento/${selectedEvent.id}`;
                                    navigator.clipboard.writeText(eventUrl);
                                    showToast('Link do evento copiado para a área de transferência!', 'success');
                                }}
                                className="px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-1.5"
                                title="Copiar link público deste evento"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                Copiar Link
                            </button>
                            <button
                                onClick={() => setIsBulkPriceModalOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-primary-dark bg-primary/10 border border-primary-dark rounded-full hover:bg-primary/20 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                <PriceIcon /> Alterar Preços em Lote
                            </button>
                            <button
                                onClick={() => setIsBulkFolderModalOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-primary-dark bg-primary/10 border border-primary-dark rounded-full hover:bg-primary/20 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                📁 Organizar Pastas
                            </button>
                            <button
                                onClick={() => setIsBulkStartConfirmOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-primary-dark bg-primary/10 border border-primary-dark rounded-full hover:bg-primary/20 transition-colors shadow-sm"
                            >
                                Indexar Rosto
                            </button>
                            <button
                                onClick={async () => {
                                    if (selectedEvent) {
                                        try {
                                            const evPhotos = await api.getPhotographerPhotosByEventId(selectedEvent.id);
                                            setPhotos(evPhotos);
                                        } catch (e) {
                                            console.error("Failed to load photos for deduplication", e);
                                        }
                                    }
                                    setIsBatchUploadModalOpen(true);
                                }}
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
                                        className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative"
                                    >
                                        {/* Área Clicável: Imagem */}
                                        <div 
                                            className="h-40 bg-neutral-200 relative cursor-pointer overflow-hidden"
                                            onClick={() => handleViewEvent(event)}
                                        >
                                            {event.cover_photo_url ? (
                                                <img
                                                    src={getOptimizedImageUrl(event.cover_photo_url, 600, 75)}
                                                    alt={event.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                    <FolderIcon />
                                                </div>
                                            )}
                                        </div>

                                        {/* Badge de Visibilidade no Card */}
                                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                                            {event.is_photos_private ? (
                                                <span className="px-2.5 py-1 bg-amber-950/85 backdrop-blur-md text-amber-200 border border-amber-500/50 text-[11px] font-bold rounded-full shadow flex items-center gap-1.5" title="Fotos ocultas: clientes só encontram via Reconhecimento Facial">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                    Fotos Ocultas (Facial)
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-neutral-900/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 text-[11px] font-bold rounded-full shadow flex items-center gap-1.5" title="Galeria pública visível para todos">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                                    Galeria Pública
                                                </span>
                                            )}
                                        </div>

                                        {/* Área de Ações: Absoluta e isolada do clique pai */}
                                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                                            {(event as any).is_team_event ? (
                                                <span className="px-2.5 py-1 bg-amber-500 text-white text-[11px] font-bold rounded-full shadow backdrop-blur-xs flex items-center gap-1">
                                                    👥 Cobertura em Equipe
                                                </span>
                                            ) : (
                                                <>
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
                                                </>
                                            )}
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
                                            <p className="text-sm text-neutral-500 mb-2">{getCategoryName(event.category_id)}</p>

                                            {(event as any).is_team_event && (
                                                <div className="mb-2.5 p-2 bg-amber-50/80 border border-amber-200/60 rounded-lg flex items-center justify-between text-[11px]">
                                                    <span className="text-amber-900 font-medium">🏢 Produtor: <strong>{(event as any).producer_name}</strong></span>
                                                    <span className="text-amber-700 font-bold">{(event as any).producer_commission_percent}% taxa</span>
                                                </div>
                                            )}
                                            <div className="space-y-2 mt-4 pt-3.5 border-t border-neutral-100 text-xs text-neutral-400">
                                                <div className="flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                    <span>{formatEventDate(event.event_date)}</span>
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-start gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                        <span className="line-clamp-1 text-neutral-500 font-medium" title={event.location}>
                                                            {event.location}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Botão Copiar Link do Evento */}
                                                <div className="pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fotoclic.com.br';
                                                            const eventUrl = `${origin}/evento/${event.id}`;
                                                            navigator.clipboard.writeText(eventUrl);
                                                            showToast('Link do evento copiado para a área de transferência!', 'success');
                                                        }}
                                                        className="w-full py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary-dark font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs border border-primary/20"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                        <span>Copiar Link do Evento</span>
                                                    </button>
                                                </div>
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
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                        {/* Banner Informativo de Visibilidade do Evento */}
                        {selectedEvent?.is_photos_private ? (
                            <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                                <span className="p-1 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </span>
                                <div>
                                    <strong className="font-bold block text-amber-950 text-sm">🔒 Modo Fotos Ocultas Ativo</strong>
                                    <span className="text-amber-800/90 leading-relaxed">
                                        As fotos deste evento <strong>não são exibidas abertamente na galeria pública</strong>. Seus clientes só encontrarão as fotos que pertencerem a eles ao fazer o <strong>Reconhecimento Facial</strong> (selfie ou envio de foto).
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                                <span className="p-1 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                </span>
                                <div>
                                    <strong className="font-bold block text-emerald-950 text-sm">🌐 Modo Galeria Pública Ativo</strong>
                                    <span className="text-emerald-800/90 leading-relaxed">
                                        Todas as fotos aprovadas estão <strong>visíveis na página do evento para qualquer visitante navegar</strong>, além da busca inteligente por Reconhecimento Facial.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filters & Bulk Action Bar */}
                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
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
                            {existingFolders.length > 0 && (
                                <div className="md:w-64">
                                    <select
                                        value={selectedFolder}
                                        onChange={(e) => { setSelectedFolder(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm"
                                    >
                                        <option value="all">Todas as Pastas</option>
                                        {existingFolders.map(folder => (
                                            <option key={folder} value={folder}>{folder}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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

                        {/* Barra de Ações em Lote */}
                        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-semibold text-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={filteredPhotos.length > 0 && filteredPhotos.every(p => selectedPhotoIds.includes(p.id))}
                                        onChange={handleToggleSelectAll}
                                        className="w-4 h-4 text-primary rounded border-neutral-300 focus:ring-primary"
                                    />
                                    <span>Selecionar Todas ({filteredPhotos.length})</span>
                                </label>
                                {selectedPhotoIds.length > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary-dark font-bold px-2.5 py-1 rounded-full">
                                        {selectedPhotoIds.length} selecionada(s)
                                    </span>
                                )}
                            </div>

                            {selectedPhotoIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={isBulkDeleting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                >
                                    <TrashIcon />
                                    <span>Excluir Selecionadas ({selectedPhotoIds.length})</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-neutral-100">
                            {paginatedPhotos.map((photo) => (
                                <div key={photo.id} className={`p-4 ${selectedPhotoIds.includes(photo.id) ? 'bg-red-50/40' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedPhotoIds.includes(photo.id)}
                                            onChange={() => handleToggleSelectPhoto(photo.id)}
                                            className="w-4 h-4 mt-1 text-primary rounded border-neutral-300 focus:ring-primary flex-shrink-0"
                                        />
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
                                            {photo.sub_group && (
                                                <p className="text-[11px] text-primary-dark font-semibold mt-0.5">📁 {photo.sub_group}</p>
                                            )}
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
                                        <th className="p-4 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={filteredPhotos.length > 0 && filteredPhotos.every(p => selectedPhotoIds.includes(p.id))}
                                                onChange={handleToggleSelectAll}
                                                className="w-4 h-4 text-primary rounded border-neutral-300 focus:ring-primary"
                                            />
                                        </th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Foto</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Título</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Categoria</th>
                                        <th className="p-4 text-left text-sm font-semibold text-neutral-600">Pasta</th>
                                        <th className="p-4 text-center text-sm font-semibold text-neutral-600">Qtd Vendas</th>
                                        <th className="p-4 text-right text-sm font-semibold text-neutral-600">Preço</th>
                                        <th className="p-4 text-center text-sm font-semibold text-neutral-600">Visibilidade</th>
                                        <th className="p-4 text-center text-sm font-semibold text-neutral-600">Moderação</th>
                                        <th className="p-4 text-right text-sm font-semibold text-neutral-600">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPhotos.map((photo, index) => {
                                        const isSelected = selectedPhotoIds.includes(photo.id);
                                        return (
                                            <tr key={photo.id} className={`border-t ${isSelected ? 'bg-red-50/50' : (index % 2 === 0 ? 'bg-white' : 'bg-neutral-50')}`}>
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectPhoto(photo.id)}
                                                        className="w-4 h-4 text-primary rounded border-neutral-300 focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <div 
                                                        className="relative w-16 h-12 group overflow-hidden rounded-md border border-neutral-200 shadow-sm cursor-pointer transition-transform hover:scale-105"
                                                        onClick={() => setPreviewPhoto(photo)}
                                                        title="Clique para ver o preview da imagem"
                                                    >
                                                        <img
                                                            src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 150, 70)}
                                                            alt={photo.title}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="w-16 h-12 object-cover transition-opacity group-hover:opacity-85"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="11" cy="11" r="8"></circle>
                                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                                                <line x1="8" y1="11" x2="14" y2="11"></line>
                                                            </svg>
                                                        </div>
                                                        {photo.media_type === 'video' && (
                                                            <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded flex items-center gap-0.5 z-10">
                                                                ▶ {photo.video_duration ? `${photo.video_duration}s` : 'Víd'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td 
                                                    className="p-4 text-sm font-medium text-neutral-800 hover:text-primary cursor-pointer transition-colors"
                                                    onClick={() => setPreviewPhoto(photo)}
                                                    title="Clique para ver o preview da imagem"
                                                >
                                                    {photo.title}
                                                </td>
                                            <td className="p-4 text-sm text-neutral-500">{getCategoryName(photo.category_id)}</td>
                                            <td className="p-4 text-sm text-neutral-500">
                                                {photo.sub_group ? (
                                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary-dark px-2.5 py-1 rounded-full text-xs font-semibold">
                                                        📁 {photo.sub_group}
                                                    </span>
                                                ) : (
                                                    <span className="text-neutral-400 italic text-xs">Sem pasta</span>
                                                )}
                                            </td>
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
                                        );
                                    })}
                                    {filteredPhotos.length === 0 && (
                                        <tr><td colSpan={10} className="text-center p-8 text-neutral-500">Nenhuma foto encontrada neste evento.</td></tr>
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
            <Modal
                isOpen={isBatchUploadModalOpen}
                onClose={() => {
                    uploadAbortRef.current = true;
                    setIsBatchUploadModalOpen(false);
                }}
                title="Adicionar Fotos em Lote"
                size="lg"
                closeOnOverlayClick={false}
            >
                {selectedEvent && (
                    <BatchUploadForm
                        event={selectedEvent}
                        photographerId={user.id}
                        existingFolders={existingFolders}
                        existingPhotos={photos.filter(p => p.event_id === selectedEvent.id)}
                        onSubmit={handleBatchUpload}
                        onCancel={() => {
                            uploadAbortRef.current = true;
                            setIsBatchUploadModalOpen(false);
                        }}
                    />
                )}
            </Modal>

            {/* Bulk Folder Organizer Modal */}
            <Modal
                isOpen={isBulkFolderModalOpen}
                onClose={() => {
                    setIsBulkFolderModalOpen(false);
                    setBulkFolderSource('none');
                    setBulkFolderDestMode('select');
                    setBulkFolderDestSelect('none');
                    setBulkFolderDestNew('');
                }}
                title="Organizar Pastas em Lote"
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-neutral-800 mb-1 font-sans">1. Quais fotos deseja mover?</label>
                        <select
                            value={bulkFolderSource}
                            onChange={(e) => setBulkFolderSource(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                        >
                            <option value="none">Apenas fotos sem pasta (fora de qualquer pasta)</option>
                            <option value="all">Todas as fotos do evento</option>
                            {existingFolders.map(folder => (
                                <option key={folder} value={folder}>Fotos atualmente na pasta "{folder}"</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-neutral-800 mb-2 font-sans">2. Para qual pasta de destino?</label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <label className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50">
                                <input
                                    type="radio"
                                    name="bulkFolderDestMode"
                                    checked={bulkFolderDestMode === 'select'}
                                    onChange={() => setBulkFolderDestMode('select')}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-xs text-neutral-700 font-medium">Pasta existente / Sem pasta</span>
                            </label>
                            <label className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50">
                                <input
                                    type="radio"
                                    name="bulkFolderDestMode"
                                    checked={bulkFolderDestMode === 'new'}
                                    onChange={() => setBulkFolderDestMode('new')}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-xs text-neutral-700 font-medium">Criar nova pasta</span>
                            </label>
                        </div>

                        {bulkFolderDestMode === 'select' ? (
                            <select
                                value={bulkFolderDestSelect}
                                onChange={(e) => setBulkFolderDestSelect(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                            >
                                <option value="none">Remover de qualquer pasta (deixar soltas)</option>
                                {existingFolders.map(folder => (
                                    <option key={folder} value={folder}>{folder}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={bulkFolderDestNew}
                                onChange={(e) => setBulkFolderDestNew(e.target.value)}
                                placeholder="Digite o nome da nova pasta (ex: Sábado, Dia 2)"
                                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                            />
                        )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => {
                                setIsBulkFolderModalOpen(false);
                                setBulkFolderSource('none');
                                setBulkFolderDestMode('select');
                                setBulkFolderDestSelect('none');
                                setBulkFolderDestNew('');
                            }}
                            disabled={bulkFolderLoading}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmBulkFolder}
                            disabled={bulkFolderLoading}
                            className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-70 disabled:cursor-wait font-bold shadow-md"
                        >
                            {bulkFolderLoading ? 'Movendo...' : 'Mover Fotos'}
                        </button>
                    </div>
                </div>
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
                                const { error } = await api.supabase.storage.from(bucket).upload(path, blob, { upsert: true });
                                if (error) {
                                    if (bucket === 'photos-original') {
                                        console.warn("Notice: photos-original storage upload RLS bypassed:", error.message);
                                    } else {
                                        throw error;
                                    }
                                }
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
                            if (selectedEvent) {
                                const evPhotos = await api.getPhotographerPhotosByEventId(selectedEvent.id);
                                setPhotos(evPhotos);
                            }
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

            {/* Modal Confirmar Indexação em Lote */}
            <Modal isOpen={isBulkStartConfirmOpen} onClose={() => setIsBulkStartConfirmOpen(false)} title="Confirmar Indexação"><div className="p-4"><p>Deseja indexar todas as fotos pendentes?</p><div className="flex justify-end mt-4"><button onClick={() => setIsBulkStartConfirmOpen(false)} className="mr-2 border px-4 rounded">Cancelar</button><button onClick={confirmBulkIndex} className="bg-primary-dark text-white px-4 rounded">Confirmar</button></div></div></Modal>

            {/* Photo Preview Modal com Animação */}
            {previewPhoto && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-neutral-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 px-6 bg-white border-b border-neutral-100 flex-shrink-0">
                            <div className="flex items-center gap-3 overflow-hidden pr-4">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                                    <ImageIcon />
                                </div>
                                <div className="truncate">
                                    <h3 className="text-lg font-display font-bold text-primary-dark truncate">
                                        {previewPhoto.title}
                                    </h3>
                                    <p className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                                        <span>{selectedEvent?.name}</span>
                                        <span>•</span>
                                        <span className="font-semibold text-neutral-700">{getCategoryName(previewPhoto.category_id)}</span>
                                        {previewPhoto.sub_group && (
                                            <>
                                                <span>•</span>
                                                <span className="bg-primary/10 text-primary-dark px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                    📁 {previewPhoto.sub_group}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${previewPhoto.is_public ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
                                    {previewPhoto.is_public ? 'Pública' : 'Privada'}
                                </span>
                                {getStatusChip(previewPhoto.moderation_status, previewPhoto.rejection_reason)}
                                
                                <button
                                    onClick={() => setPreviewPhoto(null)}
                                    className="p-2 ml-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                                    title="Fechar (Esc)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Main Preview Area */}
                        <div className="relative flex-grow flex items-center justify-center bg-neutral-950 p-2 sm:p-6 overflow-hidden min-h-[320px] max-h-[65vh]">
                            {/* Previous Button */}
                            {filteredPhotos.length > 1 && (
                                <button
                                    onClick={() => {
                                        const currIdx = filteredPhotos.findIndex(p => p.id === previewPhoto.id);
                                        const prevIdx = currIdx > 0 ? currIdx - 1 : filteredPhotos.length - 1;
                                        setPreviewPhoto(filteredPhotos[prevIdx]);
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all transform hover:scale-110 shadow-lg z-20 backdrop-blur-sm"
                                    title="Foto anterior (←)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                            )}

                            {/* Media (Image or Video) */}
                            {previewPhoto.media_type === 'video' ? (
                                <video
                                    src={previewPhoto.preview_url || previewPhoto.file_url}
                                    controls
                                    autoPlay
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                                />
                            ) : (
                                <img
                                    src={previewPhoto.preview_url || previewPhoto.thumb_url}
                                    alt={previewPhoto.title}
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all"
                                />
                            )}

                            {/* Next Button */}
                            {filteredPhotos.length > 1 && (
                                <button
                                    onClick={() => {
                                        const currIdx = filteredPhotos.findIndex(p => p.id === previewPhoto.id);
                                        const nextIdx = currIdx < filteredPhotos.length - 1 ? currIdx + 1 : 0;
                                        setPreviewPhoto(filteredPhotos[nextIdx]);
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all transform hover:scale-110 shadow-lg z-20 backdrop-blur-sm"
                                    title="Próxima foto (→)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Footer / Details & Actions Bar */}
                        <div className="p-4 px-6 bg-white border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                                <div>
                                    <span className="text-neutral-400 text-xs block">Preço</span>
                                    <span className="font-bold text-green-600 text-base">
                                        {previewPhoto.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                                <div className="h-8 w-px bg-neutral-200"></div>
                                <div>
                                    <span className="text-neutral-400 text-xs block">Vendas</span>
                                    <span className="font-bold text-neutral-800 text-base">
                                        {previewPhoto.sales_count || 0}
                                    </span>
                                </div>
                                <div className="h-8 w-px bg-neutral-200"></div>
                                <div>
                                    <span className="text-neutral-400 text-xs block">Posição</span>
                                    <span className="font-medium text-neutral-600 text-xs">
                                        {filteredPhotos.findIndex(p => p.id === previewPhoto.id) + 1} de {filteredPhotos.length} fotos
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={previewPhoto.preview_url || previewPhoto.thumb_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                                    title="Abrir imagem em nova aba"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Ver Alta Resolução
                                </a>
                                <button
                                    onClick={() => {
                                        const toEdit = previewPhoto;
                                        setPreviewPhoto(null);
                                        setEditingPhoto(toEdit);
                                        setIsModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
                                >
                                    <EditIcon />
                                    Editar Detalhes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* showToast && <Toast ... /> removed */}
        </div>
    );
};

export default PhotographerPhotos;


