
import React, { useEffect, useState } from 'react';
import { User, Photo, Page, Category } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import PhotoCard from '../PhotoCard';
import Modal from '../Modal';
import PhotoUploadForm from './PhotoUploadForm';
import ReviewModal from '../ReviewModal';

interface PhotographerPortfolioPreviewProps {
    user: User;
    onNavigate?: (page: Page) => void;
    editable?: boolean;
    onAddToCart?: (photoId: string, imgElement?: HTMLImageElement) => void;
    currentUser?: User | null;
}

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

const PhotographerPortfolioPreview: React.FC<PhotographerPortfolioPreviewProps> = ({ user, onNavigate, editable = false, onAddToCart, currentUser }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [displayUser, setDisplayUser] = useState<User>(user);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit/Delete State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const freshUserData = await api.getPhotographerById(user.id);
                if (freshUserData) {
                    setDisplayUser(freshUserData);
                }

                const allPhotos = await api.getPhotosByPhotographerId(user.id);

                if (editable) {
                    setPhotos(allPhotos);
                    const cats = await api.getCategories();
                    setCategories(cats);
                } else {
                    const publicPhotos = allPhotos.filter(
                        p => p.is_public && p.moderation_status === 'approved'
                    );
                    setPhotos(publicPhotos);
                }

            } catch (error) {
                console.error("Failed to fetch portfolio data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user.id, editable]);

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
                    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
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
                setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
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

    if (loading) return <Spinner />;

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
                    <div className="mt-6 md:mt-28 w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4">
                        <div className="px-4 py-2 rounded-full text-neutral-700 bg-neutral-100 border border-neutral-200 text-sm font-medium shadow-sm">
                            {photos.length} Fotos {editable ? 'no Total' : 'Publicadas'}
                        </div>
                        {!editable && currentUser && currentUser.id !== user.id && (
                            <button
                                onClick={() => setIsReviewModalOpen(true)}
                                className="px-6 py-2 rounded-full bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Avaliar
                            </button>
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
                    <h3 className="text-2xl font-display font-bold text-primary-dark">Galeria</h3>
                    <span className="text-sm text-neutral-500 italic">
                        {editable ? 'Modo de Gerenciamento' : 'Visualização Pública'}
                    </span>
                </div>

                {photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {photos.map(photo => (
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
                                                className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
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
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg border border-dashed border-neutral-300">
                        <div className="inline-block p-4 rounded-full bg-neutral-100 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                        <h4 className="text-lg font-medium text-neutral-800">Nenhuma foto encontrada</h4>
                        <p className="text-neutral-500 mt-2 max-w-md mx-auto">
                            {editable
                                ? "Você ainda não enviou nenhuma foto. Vá para a aba 'Portfólio' para adicionar."
                                : "Suas fotos aparecerão aqui quando forem aprovadas pela moderação e marcadas como públicas."}
                        </p>
                    </div>
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
                    // Could refresh data here, but for now simple notification is fine
                    alert("Avaliação enviada com sucesso!");
                }}
            />
        </div>
    );
};

export default PhotographerPortfolioPreview;
