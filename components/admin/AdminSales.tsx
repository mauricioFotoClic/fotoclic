
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Sale, Photo, User } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm text-neutral-500 font-medium">{title}</p>
        <p className="text-3xl font-display font-bold text-primary-dark">{value}</p>
    </div>
);


const AdminSales: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [photographers, setPhotographers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        photographerId: '',
        dateRange: 'all',
    });
    const itemsPerPage = 5;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [salesData, photosData, photographersData] = await Promise.all([
                api.getSales(),
                api.getAllPhotos(),
                api.getPhotographers()
            ]);
            setSales(salesData);
            setPhotos(photosData);
            setPhotographers(photographersData);
        } catch (error) {
            console.error("Failed to fetch sales data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getPhotoInfo = (photoId: string) => photos.find(p => p.id === photoId);
    const getPhotographerName = (photographerId: string) => photographers.find(p => p.id === photographerId)?.name || 'N/A';
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const clearFilters = () => {
        setFilters({ photographerId: '', dateRange: 'all' });
        setCurrentPage(1);
    };

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            // Photographer filter
            const photo = getPhotoInfo(sale.photo_id);
            if (filters.photographerId && photo?.photographer_id !== filters.photographerId) {
                return false;
            }

            // Date range filter
            if (filters.dateRange !== 'all') {
                const saleDate = new Date(sale.sale_date);
                const now = new Date();
                
                if (filters.dateRange === 'last7') {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    if (saleDate < sevenDaysAgo) return false;
                } else if (filters.dateRange === 'last30') {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    if (saleDate < thirtyDaysAgo) return false;
                } else if (filters.dateRange === 'thisMonth') {
                    if (saleDate.getMonth() !== now.getMonth() || saleDate.getFullYear() !== now.getFullYear()) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [sales, filters, photos]);

    const summaryStats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.price, 0);
        const totalCommission = filteredSales.reduce((sum, sale) => sum + sale.commission, 0);
        return {
            totalRevenue,
            totalCommission,
            salesCount: filteredSales.length,
        };
    }, [filteredSales]);

    // Pagination
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = useMemo(() => filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredSales, currentPage]);
    
    const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
    const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));


    if (loading) return <Spinner />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-6">Vendas</h1>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div>
                    <label htmlFor="photographerId" className="text-xs text-neutral-500">Filtrar por Fotógrafo</label>
                    <select id="photographerId" name="photographerId" value={filters.photographerId} onChange={handleFilterChange} className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white">
                        <option value="">Todos os Fotógrafos</option>
                        {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="dateRange" className="text-xs text-neutral-500">Filtrar por Período</label>
                    <select id="dateRange" name="dateRange" value={filters.dateRange} onChange={handleFilterChange} className="w-full mt-1 p-2 border border-neutral-200 rounded-md bg-white">
                        <option value="all">Todo o Período</option>
                        <option value="last7">Últimos 7 dias</option>
                        <option value="last30">Últimos 30 dias</option>
                        <option value="thisMonth">Este Mês</option>
                    </select>
                </div>
                <div>
                    <button onClick={clearFilters} className="w-full px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">Limpar Filtros</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Receita Total (Filtrado)" value={summaryStats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                <StatCard title="Comissão (Filtrado)" value={summaryStats.totalCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                <StatCard title="Vendas (Filtrado)" value={summaryStats.salesCount.toString()} />
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                 <table className="w-full min-w-[960px]">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">ID da Venda</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Foto</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Fotógrafo</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Data</th>
                            <th className="p-4 text-left text-sm font-semibold text-neutral-600">Comprador</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Preço</th>
                            <th className="p-4 text-right text-sm font-semibold text-neutral-600">Comissão</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedSales.map((sale, index) => {
                             const photo = getPhotoInfo(sale.photo_id);
                             const photographerName = photo ? getPhotographerName(photo.photographer_id) : 'N/A';
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
                                    <td className="p-4 text-sm text-neutral-500">{photographerName}</td>
                                    <td className="p-4 text-sm text-neutral-500">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-4 text-sm text-neutral-500">{sale.buyer_name}</td>
                                    <td className="p-4 text-sm text-neutral-800 font-medium text-right">{sale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 text-sm text-green-600 font-medium text-right">{sale.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            );
                        })}
                         {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-8 text-neutral-500">Nenhuma venda encontrada com os filtros atuais.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>
            
             {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <button onClick={goToPreviousPage} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                        Anterior
                    </button>
                    <span className="text-sm text-neutral-500">Página {currentPage} de {totalPages}</span>
                    <button onClick={goToNextPage} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}

export default AdminSales;
