
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Sale, Photo, User } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import { ChevronDown, ChevronUp, Copy, Check, HelpCircle } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-100">
        <p className="text-sm text-neutral-500 font-medium">{title}</p>
        <p className="text-3xl font-display font-bold text-primary-dark mt-1">{value}</p>
    </div>
);

interface GroupedTransaction {
    id: string; // billing_id or sale.id if null
    billing_id: string | null;
    buyer_name: string;
    sale_date: string;
    sales: Sale[];
    totalPrice: number;
    totalCommission: number;
}

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
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const itemsPerPage = 10;

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
        setExpandedIds({}); // Close all accordions
    };

    const clearFilters = () => {
        setFilters({ photographerId: '', dateRange: 'all' });
        setCurrentPage(1);
        setExpandedIds({});
    };

    const handleCopyId = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
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

    // Group sales by transaction (billing_id)
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, GroupedTransaction> = {};
        const individualSalesWithoutBilling: GroupedTransaction[] = [];

        filteredSales.forEach(sale => {
            if (sale.billing_id) {
                if (!groups[sale.billing_id]) {
                    groups[sale.billing_id] = {
                        id: sale.billing_id,
                        billing_id: sale.billing_id,
                        buyer_name: sale.buyer_name || 'Comprador Desconhecido',
                        sale_date: sale.sale_date,
                        sales: [],
                        totalPrice: 0,
                        totalCommission: 0
                    };
                }
                groups[sale.billing_id].sales.push(sale);
                groups[sale.billing_id].totalPrice += sale.price;
                groups[sale.billing_id].totalCommission += sale.commission;
            } else {
                individualSalesWithoutBilling.push({
                    id: sale.id,
                    billing_id: null,
                    buyer_name: sale.buyer_name || 'Comprador Desconhecido',
                    sale_date: sale.sale_date,
                    sales: [sale],
                    totalPrice: sale.price,
                    totalCommission: sale.commission
                });
            }
        });

        const combined = [...Object.values(groups), ...individualSalesWithoutBilling];
        return combined.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    }, [filteredSales]);

    const summaryStats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.price, 0);
        const totalCommission = filteredSales.reduce((sum, sale) => sum + sale.commission, 0);
        return {
            totalRevenue,
            totalCommission,
            salesCount: filteredSales.length,
        };
    }, [filteredSales]);

    // Pagination based on grouped transactions
    const totalPages = Math.ceil(groupedTransactions.length / itemsPerPage);
    const paginatedTransactions = useMemo(() => 
        groupedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
        [groupedTransactions, currentPage]
    );
    
    const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
    const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));

    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando histórico de vendas..." />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-6">Vendas</h1>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end border border-neutral-100">
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
                <StatCard title="Fotos Vendidas (Filtrado)" value={summaryStats.salesCount.toString()} />
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {paginatedTransactions.map((tx) => {
                    const isExpanded = !!expandedIds[tx.id];
                    const hasMultiple = tx.sales.length > 1;
                    return (
                        <div key={tx.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                            <div 
                                onClick={() => toggleExpand(tx.id)}
                                className="p-4 flex items-center justify-between cursor-pointer bg-neutral-50/50"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                                            {tx.id.substring(0, 8)}...
                                        </span>
                                        <span className="text-xs text-neutral-400">
                                            {new Date(tx.sale_date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <p className="font-bold text-neutral-800 text-sm truncate">{tx.buyer_name}</p>
                                    <p className="text-xs text-neutral-500 mt-1 font-medium">{tx.sales.length} {tx.sales.length === 1 ? 'foto' : 'fotos'}</p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <div>
                                        <p className="text-xs text-neutral-400">Total</p>
                                        <p className="text-sm font-extrabold text-neutral-800">{tx.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                    {isExpanded ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-neutral-100 p-4 space-y-4 bg-white">
                                    <div className="flex items-center justify-between bg-neutral-50 p-2 rounded text-xs mb-2">
                                        <span className="text-neutral-500">ID Completo:</span>
                                        <button 
                                            onClick={(e) => handleCopyId(tx.id, e)}
                                            className="flex items-center gap-1 font-mono text-primary font-bold hover:underline"
                                        >
                                            {copiedId === tx.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                            {tx.id}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {tx.sales.map((sale) => {
                                            const photo = getPhotoInfo(sale.photo_id);
                                            const photographerName = photo ? getPhotographerName(photo.photographer_id) : 'N/A';
                                            const baseRate = sale.commission_rate || 0.15;
                                            const baseComm = sale.price * baseRate;
                                            const gatewayFee = Math.max(0, sale.commission - baseComm);
                                            return (
                                                <div key={sale.id} className="p-3 bg-neutral-50/50 rounded-lg border border-neutral-100">
                                                    {photo ? (
                                                        <div className="flex items-center mb-2">
                                                            <img src={photo.preview_url} alt={photo.title} className="w-10 h-8 object-cover rounded mr-2 flex-shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-xs text-neutral-800 truncate">{photo.title}</p>
                                                                <p className="text-[10px] text-neutral-500">Fotógrafo: {photographerName}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-neutral-500 mb-2">Foto não encontrada</p>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-neutral-100 pt-2 mt-2">
                                                        <div>
                                                            <span className="text-neutral-500 block text-[10px]">Preço</span>
                                                            <span className="font-bold text-neutral-700">{sale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-green-600 block text-[10px] font-semibold">Comissão Cobrada</span>
                                                            <span className="font-bold text-green-700">{sale.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-[10px] text-neutral-500 bg-neutral-100/80 p-1.5 rounded flex flex-wrap gap-x-2">
                                                        <span><strong>Comissão Base:</strong> {baseComm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({(baseRate * 100).toFixed(0)}%)</span>
                                                        <span>•</span>
                                                        <span><strong>Taxa Gateway (Pix):</strong> {gatewayFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {groupedTransactions.length === 0 && <p className="text-center py-8 text-neutral-500 bg-white rounded-lg">Nenhuma venda encontrada com os filtros atuais.</p>}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-white rounded-xl shadow-md border border-neutral-200/80 overflow-hidden">
                <table className="w-full min-w-[960px] border-collapse">
                    <thead className="bg-neutral-100/80 border-b border-neutral-200">
                        <tr>
                            <th className="p-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider w-[100px]">Expandir</th>
                            <th className="p-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider w-[160px]">ID Transação</th>
                            <th className="p-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider w-[120px]">Data</th>
                            <th className="p-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">Comprador</th>
                            <th className="p-4 text-center text-xs font-bold text-neutral-600 uppercase tracking-wider w-[100px]">Fotos</th>
                            <th className="p-4 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider w-[150px]">Preço Total</th>
                            <th className="p-4 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider w-[150px]">Comissão Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map((tx, index) => {
                            const isExpanded = !!expandedIds[tx.id];
                            return (
                                <React.Fragment key={tx.id}>
                                    <tr 
                                        onClick={() => toggleExpand(tx.id)}
                                        className={`border-t border-neutral-200/60 cursor-pointer transition-colors hover:bg-neutral-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/20'}`}
                                    >
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center justify-center p-1 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-800">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-mono text-neutral-400">
                                            <span 
                                                onClick={(e) => handleCopyId(tx.id, e)}
                                                className="cursor-pointer hover:text-primary hover:underline flex items-center gap-1 group"
                                                title="Clique para copiar o ID completo"
                                            >
                                                {copiedId === tx.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                {tx.id.substring(0, 8)}...
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-neutral-500">
                                            {new Date(tx.sale_date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-neutral-800">
                                            {tx.buyer_name}
                                        </td>
                                        <td className="p-4 text-sm text-neutral-600 text-center font-medium">
                                            {tx.sales.length}
                                        </td>
                                        <td className="p-4 text-sm text-neutral-800 font-extrabold text-right">
                                            {tx.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="p-4 text-sm text-green-600 font-extrabold text-right">
                                            {tx.totalCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>

                                    {/* Expandable Accordion Content */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="p-0 bg-neutral-50/50">
                                                <div className="border-t border-b border-neutral-200/50 px-8 py-6 space-y-4">
                                                    {/* Full ID box */}
                                                    <div className="flex items-center gap-2 bg-neutral-100/70 border border-neutral-200/60 p-2.5 rounded-lg w-fit text-xs text-neutral-600">
                                                        <span className="font-semibold">ID Completo da Transação:</span>
                                                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-neutral-200 select-all">{tx.id}</span>
                                                        <button 
                                                            onClick={(e) => handleCopyId(tx.id, e)}
                                                            className="p-1 rounded hover:bg-neutral-200 text-neutral-500 transition-colors"
                                                            title="Copiar ID"
                                                        >
                                                            {copiedId === tx.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>

                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mt-2">Fotos compradas nesta transação</h5>
                                                    
                                                    {/* Sub-table for Photos */}
                                                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold">
                                                                <tr>
                                                                    <th className="p-3 text-left w-[280px]">Foto</th>
                                                                    <th className="p-3 text-left">Fotógrafo</th>
                                                                    <th className="p-3 text-right w-[110px]">Preço</th>
                                                                    <th className="p-3 text-right w-[110px]">Taxa Base</th>
                                                                    <th className="p-3 text-right w-[110px]">Comissão Base</th>
                                                                    <th className="p-3 text-right w-[140px]">Taxa Gateway (Pix)</th>
                                                                    <th className="p-3 text-right w-[130px] text-green-700">Comissão Cobrada</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-neutral-100">
                                                                {tx.sales.map((sale) => {
                                                                    const photo = sale.photo || getPhotoInfo(sale.photo_id);
                                                                    const photographerName = photo ? getPhotographerName(photo.photographer_id) : 'N/A';
                                                                    const baseRate = sale.commission_rate || 0.15;
                                                                    const baseComm = sale.price * baseRate;
                                                                    const gatewayFee = Math.max(0, sale.commission - baseComm);
                                                                    return (
                                                                        <tr key={sale.id} className="hover:bg-neutral-50/30">
                                                                            <td className="p-3 font-semibold text-neutral-800">
                                                                                {photo ? (
                                                                                    <div className="flex items-center">
                                                                                        <img src={photo.preview_url} alt={photo.title} className="w-10 h-8 object-cover rounded mr-3 border border-neutral-200" />
                                                                                        <span className="truncate max-w-[200px]" title={photo.title}>{photo.title}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-neutral-400">Foto não encontrada</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="p-3 text-neutral-500">
                                                                                {photographerName}
                                                                            </td>
                                                                            <td className="p-3 text-right font-medium text-neutral-700">
                                                                                {sale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                            </td>
                                                                            <td className="p-3 text-right text-neutral-500 font-mono">
                                                                                {(baseRate * 100).toFixed(0)}%
                                                                            </td>
                                                                            <td className="p-3 text-right text-neutral-500 font-medium">
                                                                                {baseComm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                            </td>
                                                                            <td className="p-3 text-right text-neutral-500 font-medium">
                                                                                {gatewayFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                            </td>
                                                                            <td className="p-3 text-right font-bold text-green-600 bg-green-50/10">
                                                                                {sale.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {groupedTransactions.length === 0 && (
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


