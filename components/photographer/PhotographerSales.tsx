import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Sale, Photo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';

interface PhotographerSalesProps {
    user: User;
}

const PhotographerSales: React.FC<PhotographerSalesProps> = ({ user }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

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

    const getPhotoInfo = (sale: Sale) => sale.photo || photos.find(p => p.id === sale.photo_id);

    // Obter URL da foto para o fotógrafo no modal
    const getCleanPhotoUrl = (sale: Sale): string => {
        const photo = getPhotoInfo(sale);
        if (!photo) return '';
        
        // Se file_url já for uma URL completa
        if (photo.file_url && photo.file_url.startsWith('http')) {
            return photo.file_url;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
        if (photo.file_url) {
            // O bucket de originais é photos-original
            return `${supabaseUrl}/storage/v1/object/public/photos-original/${photo.file_url}`;
        }

        return photo.preview_url || photo.thumb_url || '';
    };

    // Lógica de Paginação
    const totalPages = Math.ceil(sales.length / itemsPerPage);
    
    const paginatedSales = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sales.slice(startIndex, startIndex + itemsPerPage);
    }, [sales, currentPage]);

    const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
    const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));
    
    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando histórico de vendas..." />;

    const selectedPhoto = selectedSale ? getPhotoInfo(selectedSale) : null;
    const cleanPhotoUrl = selectedSale ? getCleanPhotoUrl(selectedSale) : '';

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Histórico de Vendas</h1>
                    <p className="text-sm text-neutral-500">Clique na foto ou na linha para visualizar a imagem original sem marca d'água e os detalhes do cliente.</p>
                </div>
                <span className="bg-primary/10 text-primary-dark font-semibold text-xs px-3 py-1.5 rounded-full self-start md:self-auto">
                    Total: {sales.length} venda(s)
                </span>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {paginatedSales.map((sale) => {
                    const photo = getPhotoInfo(sale);
                    const earning = sale.price - sale.commission;
                    return (
                        <div 
                            key={sale.id} 
                            onClick={() => setSelectedSale(sale)}
                            className="bg-white rounded-lg border border-neutral-200 p-4 cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <div>
                                    <p className="text-xs font-bold text-neutral-800">
                                        {sale.buyer_name || 'Cliente'}
                                    </p>
                                    {sale.buyer_email && (
                                        <p className="text-[11px] text-neutral-500">{sale.buyer_email}</p>
                                    )}
                                </div>
                                {sale.status === 'refunded' ? (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full uppercase tracking-tighter flex-shrink-0">Reembolsado</span>
                                ) : (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full uppercase tracking-tighter flex-shrink-0">Sucesso</span>
                                )}
                            </div>
                            {photo ? (
                                <div className="flex items-center mb-3 group">
                                    <div className="relative overflow-hidden rounded-md mr-3 flex-shrink-0">
                                        <img src={photo.preview_url} alt={photo.title} className="w-14 h-10 object-cover" />
                                        <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1 py-0.2 rounded-tl">🔍 Ver</span>
                                    </div>
                                    <span className="font-medium text-neutral-800 text-sm group-hover:text-primary transition-colors">{photo.title}</span>
                                </div>
                            ) : (
                                <div className="flex items-center mb-3 text-sm text-neutral-500">
                                    <div className="w-14 h-10 bg-neutral-100 rounded-md mr-3 flex-shrink-0 flex items-center justify-center text-neutral-400 border border-neutral-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"></path><circle cx="12" cy="13" r="3"></circle></svg>
                                    </div>
                                    <span className="italic text-neutral-400">Foto Excluída</span>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <div className="bg-neutral-50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-neutral-500 mb-1">Preço</p>
                                    <p className="text-xs font-medium text-neutral-800">{sale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-red-500 mb-1">Comissão</p>
                                    <p className="text-xs font-medium text-red-600">{sale.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-green-600 mb-1">Seu Ganho</p>
                                    <p className={`text-xs font-bold ${sale.status === 'refunded' ? 'text-red-400 line-through' : 'text-green-700'}`}>{earning.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-neutral-400">
                                <span>{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-primary font-medium">Ver Detalhes →</span>
                            </div>
                        </div>
                    );
                })}
                {sales.length === 0 && <p className="text-center py-8 text-neutral-500 bg-white rounded-lg">Nenhuma venda encontrada.</p>}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto border border-neutral-200">
                 <table className="w-full min-w-[960px]">
                    <thead className="bg-neutral-100">
                        <tr>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">ID da Venda</th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">Cliente / Contato</th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">Foto Vendida</th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">Data</th>
                            <th className="p-4 text-right text-xs font-bold uppercase tracking-wider text-neutral-600">Preço</th>
                            <th className="p-4 text-right text-xs font-bold uppercase tracking-wider text-neutral-600">Seu Ganho</th>
                            <th className="p-4 text-center text-xs font-bold uppercase tracking-wider text-neutral-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedSales.map((sale, index) => {
                             const photo = getPhotoInfo(sale);
                             const earning = sale.price - sale.commission;
                             const cleanPhone = sale.buyer_phone ? sale.buyer_phone.replace(/\D/g, '') : '';
                             const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}` : null;

                             return (
                                <tr 
                                    key={sale.id} 
                                    onClick={() => setSelectedSale(sale)}
                                    className={`border-t cursor-pointer hover:bg-primary/5 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                                >
                                    <td className="p-4 text-xs font-mono text-neutral-400" title={sale.id}>
                                        {sale.id.substring(0, 8)}...
                                    </td>
                                    <td className="p-4 text-sm text-neutral-800">
                                        <div className="font-semibold text-neutral-900">{sale.buyer_name || 'Cliente'}</div>
                                        {sale.buyer_email && (
                                            <div className="text-xs text-neutral-500">{sale.buyer_email}</div>
                                        )}
                                        {sale.buyer_phone && (
                                            <div className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5 font-medium">
                                                <span>📱 {sale.buyer_phone}</span>
                                                {whatsappUrl && (
                                                    <a 
                                                        href={whatsappUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-200"
                                                        title="Abrir no WhatsApp"
                                                    >
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-neutral-800 font-medium">
                                        {photo ? (
                                            <div className="flex items-center group">
                                                <div className="relative w-14 h-10 rounded-md overflow-hidden mr-3 border border-neutral-200 flex-shrink-0">
                                                    <img src={photo.preview_url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <span className="text-white text-[10px] font-bold">🔍</span>
                                                    </div>
                                                </div>
                                                <span className="group-hover:text-primary transition-colors">{photo.title}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-neutral-500">
                                                <div className="w-12 h-9 bg-neutral-100 rounded-md mr-3 flex-shrink-0 flex items-center justify-center text-neutral-400 border border-neutral-200">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"></path><circle cx="12" cy="13" r="3"></circle></svg>
                                                </div>
                                                <span className="italic text-neutral-400">Foto Excluída</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-neutral-500">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-4 text-sm text-neutral-800 text-right font-medium">{sale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className={`p-4 text-sm font-bold text-right ${sale.status === 'refunded' ? 'text-red-500 line-through' : 'text-green-600'}`}>
                                        {earning.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="p-4 text-center">
                                        {sale.status === 'refunded' ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Reembolsado</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Sucesso</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                         {sales.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-8 text-neutral-500">Nenhuma venda encontrada.</td>
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

            {/* Modal de Detalhes da Venda e Foto sem Marca d'Água */}
            <Modal
                isOpen={!!selectedSale}
                onClose={() => setSelectedSale(null)}
                title="Detalhes da Venda & Foto Original"
                size="xl"
            >
                {selectedSale && (
                    <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {/* Seção 1: Foto Vendida */}
                        <div>
                            {cleanPhotoUrl ? (
                                <div className="relative bg-neutral-900 rounded-xl overflow-hidden shadow-inner flex justify-center items-center min-h-[250px] md:min-h-[350px] border border-neutral-800">
                                    <img 
                                        src={cleanPhotoUrl} 
                                        alt={selectedPhoto?.title || 'Foto Vendida'} 
                                        className="max-h-[70vh] md:max-h-[500px] w-auto object-contain select-none"
                                        onError={(e) => {
                                            // Fallback para preview_url se o file_url de alta resolução falhar
                                            if (selectedPhoto && selectedPhoto.preview_url && e.currentTarget.src !== selectedPhoto.preview_url) {
                                                e.currentTarget.src = selectedPhoto.preview_url;
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="p-8 bg-neutral-100 rounded-xl text-center text-neutral-400 italic">
                                    Imagem indisponível ou excluída.
                                </div>
                            )}
                            <p className="mt-2 text-base font-bold text-neutral-900 text-center">
                                {selectedPhoto?.title || 'Foto Vendida'}
                            </p>
                        </div>

                        {/* Seção 2: Informações do Cliente & Financeiras */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
                            {/* Card Comprador */}
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                                <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                                    👤 Dados do Cliente / Comprador
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-neutral-500 text-xs block">Nome:</span>
                                        <span className="font-bold text-neutral-800">{selectedSale.buyer_name || 'Cliente FotoClic'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 text-xs block">E-mail:</span>
                                        <span className="font-mono text-neutral-800">{selectedSale.buyer_email || 'Não informado'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 text-xs block">Telefone:</span>
                                        {selectedSale.buyer_phone ? (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="font-mono text-neutral-800 font-semibold">{selectedSale.buyer_phone}</span>
                                                <a 
                                                    href={`https://wa.me/${selectedSale.buyer_phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                                                >
                                                    💬 Abrir WhatsApp
                                                </a>
                                            </div>
                                        ) : (
                                            <span className="text-neutral-400 italic">Não informado</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Resumo Financeiro */}
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                                <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                                    💰 Resumo Financeiro da Venda
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                                        <span className="text-neutral-600">ID da Transação:</span>
                                        <span className="font-mono text-xs text-neutral-500 truncate max-w-[160px]">{selectedSale.id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                                        <span className="text-neutral-600">Data da Compra:</span>
                                        <span className="font-medium text-neutral-800">{new Date(selectedSale.sale_date).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                                        <span className="text-neutral-600">Valor da Foto:</span>
                                        <span className="font-bold text-neutral-900">{selectedSale.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-neutral-200 pb-1.5 text-red-600">
                                        <span>Taxa da Plataforma ({((selectedSale.commission / selectedSale.price) * 100).toFixed(0)}%):</span>
                                        <span>- {selectedSale.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 text-base font-bold text-emerald-700">
                                        <span>Seu Ganho Líquido:</span>
                                        <span>{(selectedSale.price - selectedSale.commission).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default PhotographerSales;


