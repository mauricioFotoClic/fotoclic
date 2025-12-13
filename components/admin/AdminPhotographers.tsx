
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, PhotographerWithStats, Page } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
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

const AdminPhotographers: React.FC<AdminPhotographersProps> = ({ onNavigate }) => {
    const [photographers, setPhotographers] = useState<PhotographerWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhotographer, setEditingPhotographer] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 8;



    const fetchPhotographers = useCallback(async () => {
        try {
            const data = await api.getPhotographers();
            setPhotographers(data);
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
        setCurrentPage(1); // Reset page on new search
    };



    const handleToggleStatus = async (id: string, newStatus: boolean) => {
        // Optimistic update
        setPhotographers(prev => prev.map(p => p.id === id ? { ...p, is_active: newStatus } : p));
        try {
            await api.updatePhotographer(id, { is_active: newStatus });
            await api.notifyPhotographerStatusChange(id, newStatus);
        } catch (error) {
            // Revert on error
            setPhotographers(prev => prev.map(p => p.id === id ? { ...p, is_active: !newStatus } : p));
            alert('Falha ao atualizar o status do fotógrafo.');
        }
    };

    const filteredPhotographers = useMemo(() => {
        return photographers.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [photographers, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredPhotographers.length / itemsPerPage);
    const paginatedPhotographers = useMemo(() => {
        return filteredPhotographers.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredPhotographers, currentPage]);

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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Fotógrafos</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors"
                >
                    Novo Fotógrafo
                </button>
            </div>

            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou e-mail..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Nome</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Email</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Fotos</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Vendas</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Comissão Gerada</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Status</th>
                            <th className="p-4 text-center text-sm font-semibold text-neutral-600">Portfólio</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPhotographers.map((user, index) => (
                            <tr key={user.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                <td className="p-4 text-sm text-neutral-800 font-medium">
                                    <div className="flex items-center">
                                        <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover mr-3" />
                                        {user.name}
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-neutral-500">{user.email}</td>
                                <td className="p-4 text-sm text-neutral-500 text-center">{user.photoCount}</td>
                                <td className="p-4 text-sm text-neutral-500 text-center">{user.salesCount}</td>
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
                                            onClick={() => handleOpenModal(user)}
                                            className="flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
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
                                <td colSpan={8} className="text-center p-8 text-neutral-500">
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
        </div>
    );
};

export default AdminPhotographers;
