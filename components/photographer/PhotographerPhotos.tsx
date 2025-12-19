
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Photo, Category } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import PhotoUploadForm from './PhotoUploadForm';
import PhotoLikesModal from './PhotoLikesModal';
import Toast from '../Toast';

// import { faceRecognitionService } from '../../services/faceRecognition';
import { faceRecognitionService } from '../../services/faceRecognition';

// TEMP DEBUG: Mock service to isolate crash
// const faceRecognitionService = {
//     indexPhoto: async (id: string, img: any) => { console.log("Mock indexing", id); },
//     getFaceDescriptor: async () => null
// };

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const HeartIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const FaceScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>;

interface PhotographerPhotosProps {
    user: User;
}

const PhotographerPhotos: React.FC<PhotographerPhotosProps> = ({ user }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const stopBulkRef = useRef(false);

    // Estado para Modais
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);

    // Estado para Modal de Likes
    const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
    const [selectedPhotoForLikes, setSelectedPhotoForLikes] = useState<Photo | null>(null);

    // Estado para Modal de Confirmação de Indexação
    const [isIndexConfirmModalOpen, setIsIndexConfirmModalOpen] = useState(false);
    const [photoToIndex, setPhotoToIndex] = useState<Photo | null>(null);

    // Estado para Bulk Indexing
    const [isBulkIndexing, setIsBulkIndexing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });
    const [isBulkStopRequested, setIsBulkStopRequested] = useState(false);
    const [isBulkStartConfirmOpen, setIsBulkStartConfirmOpen] = useState(false);
    const [isBulkStopConfirmOpen, setIsBulkStopConfirmOpen] = useState(false);

    // Estado para Toast
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

    // Estado para Filtro e Busca
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Estado para Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [photosData, categoriesData] = await Promise.all([
                api.getPhotosByPhotographerId(user.id),
                api.getCategories()
            ]);
            setPhotos(photosData);
            setCategories(categoriesData);
        } catch (error) {
            console.error("Failed to fetch photos", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';

    // Lógica de Filtragem
    const filteredPhotos = useMemo(() => {
        return photos.filter(photo => {
            const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesFilter = true;
            if (filterStatus === 'public') matchesFilter = photo.is_public;
            if (filterStatus === 'private') matchesFilter = !photo.is_public;
            if (filterStatus === 'approved') matchesFilter = photo.moderation_status === 'approved';
            if (filterStatus === 'pending') matchesFilter = photo.moderation_status === 'pending';
            if (filterStatus === 'rejected') matchesFilter = photo.moderation_status === 'rejected';

            return matchesSearch && matchesFilter;
        });
    }, [photos, searchTerm, filterStatus]);

    // Lógica de Paginação baseada nos itens filtrados
    const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);

    const paginatedPhotos = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPhotos.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPhotos, currentPage, itemsPerPage]);

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset para primeira página ao buscar
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterStatus(e.target.value);
        setCurrentPage(1); // Reset para primeira página ao filtrar
    };

    const getStatusChip = (status: Photo['moderation_status'], reason?: string) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status) {
            case 'approved':
                return <span className={`${baseClasses} bg-green-100 text-green-800`}>Aprovado</span>;
            case 'pending':
                return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pendente</span>;
            case 'rejected':
                return <span title={`Motivo: ${reason}`} className={`${baseClasses} bg-red-100 text-red-800 cursor-help`}>Rejeitado</span>;
            default:
                return null;
        }
    }

    const handleOpenModal = (photo: Photo | null = null) => {
        setEditingPhoto(photo);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPhoto(null);
    };

    const handleOpenLikesModal = (photo: Photo) => {
        if (photo.likes > 0) {
            setSelectedPhotoForLikes(photo);
            setIsLikesModalOpen(true);
        }
    };

    const showToastNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleFormSubmit = async (formData: Omit<Photo, 'id' | 'upload_date' | 'moderation_status' | 'rejection_reason' | 'likes' | 'liked_by_users'>) => {
        try {
            if (editingPhoto) {
                // Nova Lógica: Se já estava aprovado, mantém aprovado. Se não, volta para pendente.
                let nextStatus: Photo['moderation_status'] = 'pending';

                if (editingPhoto.moderation_status === 'approved') {
                    nextStatus = 'approved';
                }

                const updatedPhoto = await api.updatePhoto(editingPhoto.id, { ...formData, moderation_status: nextStatus });
                if (updatedPhoto) {
                    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
                }
            } else {
                // Create logic (novas fotos sempre pendentes)
                const newPhoto = await api.createPhoto(formData);

                // Start indexing immediately if there is a preview (image data)
                if (formData.preview_url) {
                    try {
                        const img = new Image();
                        img.src = formData.preview_url;
                        // Determine if it is base64 or url (it should be base64 from the form)
                        await new Promise((resolve) => { img.onload = resolve; });

                        // Async index, don't block
                        faceRecognitionService.indexPhoto(newPhoto.id, img).then(() => {
                            console.log("Photo indexed successfully:", newPhoto.id);
                            // Optional: notify user it's ready for search
                            // alert("Foto indexada para busca facial com sucesso!"); 
                        }).catch(e => {
                            console.error("Failed to index photo:", e);
                            // Optional: notify user it's ready for search
                            // showToastNotification("Foto indexada para busca facial com sucesso!", 'success'); 
                        }).catch(e => {
                            console.error("Failed to index photo:", e);
                            showToastNotification("Atenção: A foto foi salva, mas ocorreu um erro ao indexar o rosto.", 'error');
                        });
                    } catch (e) {
                        console.error("Error setting up indexing:", e);
                    }
                }

                setPhotos(prev => [newPhoto, ...prev]);
                setCurrentPage(1);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save photo", error);
            showToastNotification("Ocorreu um erro ao salvar a foto.", 'error');
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
                setPhotos(prev => {
                    const updatedList = prev.filter(p => p.id !== photoToDelete.id);
                    if (paginatedPhotos.length === 1 && currentPage > 1) {
                        setCurrentPage(c => c - 1);
                    }
                    return updatedList;
                });
            } else {
                showToastNotification('Erro: A foto não foi encontrada ou não pôde ser excluída.', 'error');
            }
        } catch (error) {
            console.error("Falha ao excluir foto", error);
            showToastNotification('Ocorreu um erro ao tentar excluir a foto.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setPhotoToDelete(null);
        }
    };

    const handleManualIndex = (photo: Photo) => {
        setPhotoToIndex(photo);
        setIsIndexConfirmModalOpen(true);
    };

    const confirmManualIndex = async () => {
        if (!photoToIndex) return;
        setIsIndexConfirmModalOpen(false); // Close modal first

        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = photoToIndex.preview_url;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            await faceRecognitionService.indexPhoto(photoToIndex.id, img);

            // Update local state to show the green badge immediately
            setPhotos(prev => prev.map(p => p.id === photoToIndex.id ? { ...p, is_face_indexed: true } : p));
            showToastNotification("Sucesso! Rostos detectados e indexados.", 'success');
        } catch (error: any) {
            console.error("Index error:", error);
            showToastNotification(`Erro ao indexar: ${error.message || "Erro desconhecido"}`, 'error');
        } finally {
            setPhotoToIndex(null);
        }
    };

    const handleBulkIndexClick = () => {
        const unindexedPhotos = photos.filter(p => !p.is_face_indexed);
        if (unindexedPhotos.length === 0) {
            showToastNotification("Todas as fotos já estão indexadas!", 'info');
            return;
        }
        setIsBulkStartConfirmOpen(true);
    };

    const confirmBulkIndex = async () => {
        setIsBulkStartConfirmOpen(false);
        const unindexedPhotos = photos.filter(p => !p.is_face_indexed);

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
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = photo.preview_url;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                await faceRecognitionService.indexPhoto(photo.id, img);

                // Mark locally as indexed
                setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_face_indexed: true } : p));
                successes++;
            } catch (error) {
                console.error(`Failed to bulk index photo ${photo.id}:`, error);
                failures++;
            }
            // Small delay to let UI breathe
            await new Promise(r => setTimeout(r, 100));
        }

        setIsBulkIndexing(false);
        showToastNotification(`Processo finalizado: ${successes} indexadas, ${failures} falhas.`, failures > 0 ? 'info' : 'success');
    };

    const handleStopBulkIndexClick = () => {
        setIsBulkStopConfirmOpen(true);
    };

    const confirmStopBulkIndex = () => {
        setIsBulkStopRequested(true);
        stopBulkRef.current = true;
        setIsBulkStopConfirmOpen(false);
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Minhas Fotos</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleBulkIndexClick}
                        disabled={isBulkIndexing}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-full transition-colors shadow-sm ${isBulkIndexing ? 'bg-neutral-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                        title="Indexar automaticamente todas as fotos pendentes"
                    >
                        {isBulkIndexing ? 'Indexando...' : 'Indexar Pendentes'}
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-sm"
                    >
                        Enviar Nova Foto
                    </button>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Buscar por título..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-all shadow-sm text-sm"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                </div>
                <div className="md:w-64">
                    <select
                        value={filterStatus}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-all shadow-sm text-sm cursor-pointer"
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
                                <th className="p-4 text-center text-sm font-semibold text-neutral-600">
                                    <div className="flex items-center justify-center gap-1">
                                        <HeartIcon className="w-4 h-4 text-red-500 fill-current" />
                                        <span>Amei</span>
                                    </div>
                                </th>
                                <th className="p-4 text-center text-sm font-semibold text-neutral-600">Visibilidade</th>
                                <th className="p-4 text-center text-sm font-semibold text-neutral-600">Moderação</th>
                                <th className="p-4 text-right text-sm font-semibold text-neutral-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPhotos.map((photo, index) => (
                                <tr key={photo.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'} hover:bg-neutral-50 transition-colors`}>
                                    <td className="p-2">
                                        <img src={photo.preview_url} alt={photo.title} className="w-16 h-12 object-cover rounded-md border border-neutral-200" />
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-neutral-800 font-medium">{photo.title}</div>
                                        {photo.width && photo.height && (
                                            <div className="text-xs text-neutral-400 mt-0.5">
                                                {photo.width}x{photo.height}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-neutral-500">{getCategoryName(photo.category_id)}</td>
                                    <td className="p-4 text-sm text-green-600 font-medium text-right">{photo.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 text-center text-sm text-neutral-600">
                                        <button
                                            className={`inline-flex items-center justify-center gap-1 rounded-full py-1.5 px-3 transition-all ${photo.likes > 0 ? 'bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer shadow-sm border border-red-100' : 'bg-neutral-100 text-neutral-400 cursor-default'}`}
                                            title={photo.likes > 0 ? "Ver interessados e fazer marketing" : "Ninguém amou ainda"}
                                            onClick={() => handleOpenLikesModal(photo)}
                                            disabled={photo.likes === 0}
                                        >
                                            <HeartIcon className={`w-4 h-4 ${photo.likes > 0 ? 'fill-current' : ''}`} />
                                            <span className="font-bold">{photo.likes}</span>
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${photo.is_public ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
                                            {photo.is_public ? 'Pública' : 'Privada'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {getStatusChip(photo.moderation_status, photo.rejection_reason)}
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => handleOpenModal(photo)}
                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-full transition-colors mr-2"
                                            title="Editar Foto"
                                        >
                                            <EditIcon />
                                        </button>
                                        <div className="relative inline-block mr-2">
                                            <button
                                                onClick={() => handleManualIndex(photo)}
                                                className={`p-2 rounded-full transition-colors ${photo.is_face_indexed ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'}`}
                                                title={photo.is_face_indexed ? "Rostos Indexados (Clique para refazer)" : "Indexar Rostos para Busca"}
                                            >
                                                <FaceScanIcon />
                                            </button>
                                            {photo.is_face_indexed && (
                                                <div className="absolute top-0 right-0 -mt-1 -mr-1">
                                                    <span className="flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(photo)}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-full transition-colors"
                                            title="Excluir Foto"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPhotos.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center p-8 text-neutral-500">Nenhuma foto encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {
                totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-neutral-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                        >
                            Próxima
                        </button>
                    </div>
                )
            }

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingPhoto ? "Editar Foto" : "Nova Foto"}
            >
                <PhotoUploadForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleCloseModal}
                    initialData={editingPhoto}
                    photographerId={user.id}
                    categories={categories}
                />
            </Modal>

            <PhotoLikesModal
                isOpen={isLikesModalOpen}
                onClose={() => setIsLikesModalOpen(false)}
                photo={selectedPhotoForLikes}
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
                                        Esta ação também removerá permanentemente o registro da foto do seu painel.
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
                isOpen={isIndexConfirmModalOpen}
                onClose={() => setIsIndexConfirmModalOpen(false)}
                title="Confirmar Indexação"
            >
                {photoToIndex && (
                    <div>
                        <p className="text-neutral-600 mb-6">
                            Deseja processar a foto <strong>"{photoToIndex.title}"</strong> para reconhecimento facial?
                            Isso permitirá que clientes encontrem esta foto através de selfies.
                        </p>

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setIsIndexConfirmModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmManualIndex}
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
                            >
                                Confirmar e Indexar
                            </button>
                        </div>
                    </div>
                )}

            </Modal>

            {/* Bulk Indexing Progress Modal */}
            <Modal
                isOpen={isBulkIndexing}
                onClose={() => { }} // Disable closing by background click
                title="Indexando Fotos em Massa"
            >
                <div className="text-center">
                    <div className="mb-4">
                        <FaceScanIcon /> {/* Reuse icon or make larger */}
                        <div className="mx-auto h-12 w-12 text-purple-600 animate-pulse mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>
                        </div>
                        <p className="text-lg font-semibold text-neutral-800">Processando fotos...</p>
                        <p className="text-sm text-neutral-500">Por favor, não feche esta janela.</p>
                    </div>

                    <div className="w-full bg-neutral-200 rounded-full h-4 mb-2 overflow-hidden">
                        <div
                            className="bg-purple-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-sm text-neutral-600 mb-6">
                        <span>Progresso: {bulkProgress.current} / {bulkProgress.total}</span>
                        <span>{bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%</span>
                    </div>

                    <button
                        onClick={handleStopBulkIndexClick}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>

            </Modal>

            {/* Modal de Confirmação de Início de Bulk Index */}
            <Modal
                isOpen={isBulkStartConfirmOpen}
                onClose={() => setIsBulkStartConfirmOpen(false)}
                title="Iniciar Indexação em Massa"
            >
                <div>
                    <p className="text-neutral-600 mb-6">
                        Existem <strong>{photos.filter(p => !p.is_face_indexed).length}</strong> fotos pendentes de indexação.
                        <br /><br />
                        Deseja iniciar o processo agora? Isso pode levar alguns minutos. Mantenha esta janela aberta até o fim.
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => setIsBulkStartConfirmOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmBulkIndex}
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
                        >
                            Iniciar Processo
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Parada */}
            <Modal
                isOpen={isBulkStopConfirmOpen}
                onClose={() => setIsBulkStopConfirmOpen(false)}
                title="Parar Indexação"
            >
                <div>
                    <p className="text-neutral-600 mb-6">
                        Tem certeza que deseja parar o processo? <br />
                        Todo o progresso feito até agora será salvo automaticamente.
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => setIsBulkStopConfirmOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            Continuar Indexando
                        </button>
                        <button
                            type="button"
                            onClick={confirmStopBulkIndex}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                        >
                            Parar Agora
                        </button>
                    </div>
                </div>
            </Modal>

            {
                showToast && (
                    <Toast
                        message={toastMessage}
                        type={toastType}
                        onClose={() => setShowToast(false)}
                    />
                )
            }
        </div>
    );
};

export default PhotographerPhotos;
