
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Sale, Photo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';

interface PhotographerSalesProps {
    user: User;
}

const PhotographerSales: React.FC<PhotographerSalesProps> = ({ user }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados da Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [salesData, photosData] = await Promise.all([
                api.getSalesByPhotographerId(user.id),
                api.getPhotosByPhotographerId(user.id)
            ]);
            setSales(salesData);
            setPhotos(photosData);
        } catch (error) {
            console.error("Failed to fetch sales data", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getPhotoInfo = (photoId: string) => photos.find(p => p.id === photoId);

    // Lógica de Paginação
    const totalPages = Math.ceil(sales.length / itemsPerPage);
    
    const paginatedSales = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sales.slice(startIndex, startIndex + itemsPerPage);
    }, [sales, currentPage]);

    const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
    const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));
    
    if (loading) return <Spinner />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-6">Histórico de Vendas</h1>

             <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                 <table className="w-full min-w-[960px]">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">ID da Venda</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Foto Vendida</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Data</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Preço de Venda</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Comissão</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Seu Ganho</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedSales.map((sale, index) => {
                             const photo = getPhotoInfo(sale.photo_id);
                             const earning = sale.price - sale.commission;
                             return (
                                <tr key={sale.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                    <td className="p-4 text-sm text-neutral-500">{sale.id}</td>
                                    <td className="p-4 text-sm text-neutral-800 font-medium">
                                        {photo ? (
                                            <div className="flex items-center">
                                                <img src={photo.preview_url} alt={photo.title} className="w-12 h-9 object-cover rounded-md mr-3" />
                                                <span>{photo.title}</span>
                                            </div>
                                        ) : (
                                            <span>Foto não encontrada</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-neutral-500">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-4 text-sm text-neutral-800 text-right">{sale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 text-sm text-red-600 text-right">- {sale.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 text-sm text-green-600 font-bold text-right">{earning.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            );
                        })}
                         {sales.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-neutral-500">Nenhuma venda encontrada.</td>
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
            )}
        </div>
    );
}

export default PhotographerSales;
