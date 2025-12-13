
import React, { useEffect, useState, useCallback } from 'react';
import { Category } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import CategoryForm from './CategoryForm';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const WarningIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;

const AdminCategories: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50; // Increased for sorting visibility

    // State for delete confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
    const [photoCountInCategory, setPhotoCountInCategory] = useState<number>(0);
    const [isReordering, setIsReordering] = useState(false);


    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getCategories();
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category: Category | null = null) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleFormSubmit = async (data: { name: string; image_url: string }) => {
        try {
            if (editingCategory) {
                const updatedCategory = await api.updateCategory(editingCategory.id, data);
                if (updatedCategory) {
                    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
                }
            } else {
                const newCategory = await api.createCategory(data);
                setCategories(prev => [...prev, newCategory]); // Append new category
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save category", error);
            alert("Ocorreu um erro ao salvar a categoria.");
        }
    };
    
    const handleDelete = async (id: string) => {
        setCategoryToDeleteId(id);
        try {
            const photos = await api.getPhotosByCategoryId(id);
            setPhotoCountInCategory(photos.length);
        } catch (error) {
            console.error("Failed to get photo count for category", error);
            setPhotoCountInCategory(0);
        }
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDeleteId) return;

        try {
            const success = await api.deleteCategory(categoryToDeleteId);
            if (success) {
                setCategories(prev => prev.filter(cat => cat.id !== categoryToDeleteId));
            } else {
                alert('Erro: A categoria não foi encontrada ou não pôde ser excluída.');
            }
        } catch (error) {
            console.error("Falha ao excluir categoria", error);
            alert('Ocorreu um erro ao tentar excluir a categoria.');
        } finally {
            setIsConfirmModalOpen(false);
            setCategoryToDeleteId(null);
        }
    };

    // Reordering Logic
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (isReordering) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;

        const newCategories = [...categories];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap items in array
        [newCategories[index], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[index]];
        
        // Optimistic update
        setCategories(newCategories);
        setIsReordering(true);

        try {
            // Update all categories to persist new order
            await api.updateCategoriesOrder(newCategories);
        } catch (error) {
            console.error("Failed to reorder categories", error);
            // Revert on error
            fetchCategories();
        } finally {
            setIsReordering(false);
        }
    };


    // Pagination logic
    const totalPages = Math.ceil(categories.length / itemsPerPage);
    const paginatedCategories = categories.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 1));
    };


    if (loading) {
        return <Spinner />;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Categorias</h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors"
                >
                    Nova Categoria
                </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600 w-20">Ordem</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Imagem</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Nome</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Slug</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCategories.map((cat, index) => {
                            // Calculate actual index in full array
                            const actualIndex = (currentPage - 1) * itemsPerPage + index;
                            return (
                                <tr key={cat.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                            <button 
                                                onClick={() => handleMove(actualIndex, 'up')}
                                                disabled={actualIndex === 0 || isReordering}
                                                className={`p-1 rounded hover:bg-neutral-200 transition-colors ${actualIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'text-neutral-600'}`}
                                                title="Mover para cima"
                                            >
                                                <ArrowUpIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleMove(actualIndex, 'down')}
                                                disabled={actualIndex === categories.length - 1 || isReordering}
                                                className={`p-1 rounded hover:bg-neutral-200 transition-colors ${actualIndex === categories.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-neutral-600'}`}
                                                title="Mover para baixo"
                                            >
                                                <ArrowDownIcon />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <img src={cat.image_url} alt={cat.name} className="w-20 h-14 object-cover rounded-md" />
                                    </td>
                                    <td className="p-4 text-sm text-neutral-800 font-medium">{cat.name}</td>
                                    <td className="p-4 text-sm text-neutral-500">{cat.slug}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleOpenModal(cat)} 
                                                className="flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Editar"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(cat.id)} 
                                                className="flex items-center justify-center w-9 h-9 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                                title="Excluir"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
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
                title={editingCategory ? "Editar Categoria" : "Nova Categoria"}
            >
                <CategoryForm 
                    onSubmit={handleFormSubmit}
                    onCancel={handleCloseModal}
                    initialData={editingCategory}
                />
            </Modal>
            
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Confirmar Exclusão"
            >
                <div>
                    <p className="text-neutral-600 mb-4">
                        Tem certeza que deseja excluir a categoria <strong>"{categories.find(c => c.id === categoryToDeleteId)?.name}"</strong>?
                    </p>

                    {photoCountInCategory > 0 && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <WarningIcon className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        Existem <strong>{photoCountInCategory} foto(s)</strong> nesta categoria. Elas ficarão sem categoria e precisarão ser reatribuídas pelos fotógrafos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
            </Modal>
        </div>
    );
};

export default AdminCategories;
