import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User, PhotographerBalance, Sale, Photo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    colorClass: string;
    tooltip?: string;
}

interface PhotographerDashboardProps {
    user: User;
    setView: (view: any) => void;
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass, tooltip }) => (
    <div className="bg-white p-5 rounded-lg shadow-md flex items-center relative group">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <div className="flex items-center gap-1">
                <p className="text-sm text-neutral-500 font-medium">{title}</p>
                {tooltip && (
                    <div className="relative flex items-center">
                        <div className="text-neutral-300 hover:text-neutral-500 cursor-help transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        </div>
                        {/* Tooltip content */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-800 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none text-center leading-tight">
                            {tooltip}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800"></div>
                        </div>
                    </div>
                )}
            </div>
            <p className="text-2xl font-display font-bold text-primary-dark">{value}</p>
        </div>
    </div>
);

const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const PercentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>;
const SpinnerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin-slow"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>;

const PhotographerDashboard: React.FC<PhotographerDashboardProps> = ({ user, setView, showToast }) => {
    const [balance, setBalance] = useState<PhotographerBalance | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [abandonedCartsCount, setAbandonedCartsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [hasNotified, setHasNotified] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [balanceData, salesData, photosData, abandonedData] = await Promise.all([
                api.getPhotographerBalanceById(user.id),
                api.getSalesByPhotographerId(user.id),
                api.getPhotosByPhotographerId(user.id),
                api.getAbandonedCartsByPhotographerId(user.id)
            ]);
            setBalance(balanceData || null);
            setSales(salesData);
            setPhotos(photosData);

            const viewedCarts = JSON.parse(localStorage.getItem(`viewedAbandonedCarts_${user.id}`) || '[]');
            const newCarts = abandonedData.filter(c => !viewedCarts.includes(c.id));

            setAbandonedCartsCount(newCarts.length);

            // Notify if there are abandoned carts and we haven't notified yet in this session
            if (newCarts.length > 0 && !hasNotified && showToast) {
                showToast(`Você tem ${newCarts.length} novo(s) carrinho(s) para recuperação!`, 'info');
                setHasNotified(true);
            }
        } catch (error) {
            console.error("Failed to fetch photographer dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const salesLast7Days = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            // Format YYYY-MM-DD in LOCAL browser time
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });

        const dailySales = last7Days.map(date => {
            const total = sales
                .filter(sale => {
                    const d = new Date(sale.sale_date);
                    const sYear = d.getFullYear();
                    const sMonth = String(d.getMonth() + 1).padStart(2, '0');
                    const sDay = String(d.getDate()).padStart(2, '0');
                    const saleLocalDate = `${sYear}-${sMonth}-${sDay}`;
                    return saleLocalDate === date;
                })
                .reduce((sum, sale) => sum + (Number(sale.price) - Number(sale.commission)), 0);
            return { date, total };
        });
        return dailySales;
    }, [sales]);

    const maxDailyEarning = useMemo(() => Math.max(...salesLast7Days.map(s => s.total), 1), [salesLast7Days]);

    if (loading) return <Spinner />;
    if (!balance) return <p>Não foi possível carregar os dados do dashboard.</p>;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">Bem-vindo, {user.name}!</h1>
                    <p className="text-neutral-500">Este é o resumo da sua atividade na plataforma.</p>
                </div>
                <button
                    onClick={() => setView('business-card')}
                    className="flex items-center px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold shadow-lg hover:bg-neutral-800 transition-all transform hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Meu Cartão Virtual
                </button>
            </div>

            {(!user.avatar_url || !user.banner_url) && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg shadow-sm">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Atenção: Perfil Incompleto</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>Seu perfil <strong>não está sendo exibido</strong> na página inicial do FotoClic. Para aparecer na vitrine principal, você precisa:</p>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                    {!user.avatar_url && <li><strong>Adicionar uma foto de perfil</strong></li>}
                                    {!user.banner_url && <li><strong>Adicionar um banner</strong></li>}
                                    {balance.photoCount === 0 && <li><strong>Publicar pelo menos 1 foto</strong></li>}
                                </ul>
                            </div>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setView('profile')}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Completar Perfil Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(user.avatar_url && user.banner_url && balance.photoCount === 0) && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg shadow-sm">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-800">Quase lá! Publique sua primeira foto</h3>
                            <div className="mt-2 text-sm text-amber-700">
                                <p>Seu perfil está completo, mas você ainda <strong>não aparece na página inicial</strong> porque não tem nenhuma foto publicada. Faça seu primeiro upload e sua vitrine estará visível para todos!</p>
                            </div>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setView('photos')}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                                >
                                    Publicar Primeira Foto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total de Fotos" value={balance.photoCount} icon={<ImageIcon />} colorClass="bg-primary/20 text-primary-dark" />
                <StatCard title="Total de Vendas" value={balance.salesCount} icon={<ShoppingCartIcon />} colorClass="bg-primary/20 text-primary-dark" />
                <StatCard title="Total de Curtidas" value={balance.likesCount || 0} icon={<HeartIcon />} colorClass="bg-red-100 text-red-600" />
                <StatCard 
                    title="Taxa de Serviço" 
                    value={`${(balance.commissionRate * 100).toFixed(0)}%`} 
                    icon={<PercentIcon />} 
                    colorClass="bg-cyan-100 text-cyan-600" 
                    tooltip="Esta taxa cobre custos de manutenção da plataforma, processamento de pagamentos (cartão/pix) e marketing para atrair clientes."
                />
                <div onClick={() => setView('abandoned-carts')} className="cursor-pointer transition-transform hover:scale-105">
                    <StatCard
                        title="Carrinhos Pendentes"
                        value={abandonedCartsCount}
                        icon={<ShoppingCartIcon />}
                        colorClass={`${abandonedCartsCount > 0 ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-neutral-100 text-neutral-400'}`}
                    />
                </div>
                <StatCard 
                    title="Ganhos Totais" 
                    value={balance.totalEarnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                    icon={<DollarSignIcon />} 
                    colorClass="bg-green-100 text-green-600" 
                    tooltip="Soma total de todas as suas vendas líquidas (já descontada a comissão da plataforma) desde o início."
                />
                <StatCard 
                    title="Saldo Pendente" 
                    value={(balance.balance_pending || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                    icon={<SpinnerIcon />} 
                    colorClass="bg-orange-100 text-orange-600" 
                    tooltip="Vendas realizadas nos últimos 7 dias que ainda estão em período de retenção para segurança contra estornos."
                />
                <StatCard 
                    title="Saldo Disponível" 
                    value={(balance.balance_available || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                    icon={<CreditCardIcon />} 
                    colorClass="bg-emerald-100 text-emerald-600" 
                    tooltip="Saldo liberado para saque. O pagamento automático ocorre quando este valor atinge R$ 100,00."
                />
                <StatCard 
                    title="Total Sacado" 
                    value={(balance.totalPaid || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                    icon={<DollarSignIcon />} 
                    colorClass="bg-blue-100 text-blue-600" 
                    tooltip="Valor total que já foi transferido para sua conta PIX."
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Seus Ganhos (Últimos 7 Dias)</h2>
                    <div className="flex justify-between items-end h-48 space-x-2 border-b border-neutral-100 pb-2">
                        {salesLast7Days.map((day, index) => {
                            const total = Number(day.total);
                            const h = maxDailyEarning > 0 ? (total / maxDailyEarning) * 100 : 0;

                            return (
                                <div key={index} className="flex-1 flex flex-col items-center justify-end group h-full relative">
                                    <div className="text-[10px] font-bold text-secondary opacity-0 group-hover:opacity-100 transition-opacity mb-1 absolute -top-6 bg-white px-1 rounded shadow-sm border border-secondary/10 z-10 whitespace-nowrap">
                                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                    <div
                                        className="w-full bg-secondary hover:bg-secondary-dark rounded-t-sm transition-all shadow-sm"
                                        style={{ height: `${total > 0 ? Math.max(h, 4) : 0}%` }}
                                        title={total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    ></div>
                                    <span className="text-[10px] text-neutral-400 mt-2 font-medium">
                                        {new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-display font-bold text-primary-dark">Vendas Recentes</h2>
                        <button onClick={() => setView('sales')} className="text-sm font-medium text-primary hover:underline">Ver Todas</button>
                    </div>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                        {sales.slice(0, 5).map(sale => {
                            const photo = photos.find(p => p.id === sale.photo_id);
                            return (
                                <div key={sale.id} className="flex items-center p-2 rounded-md hover:bg-neutral-50">
                                    <img src={photo?.preview_url} alt={photo?.title} className="w-12 h-9 object-cover rounded-md mr-4 flex-shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-neutral-800 truncate">{photo?.title || 'Foto'}</p>
                                        <p className="text-xs text-neutral-500">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <span className="font-bold text-green-600 text-sm">
                                        +{(sale.price - sale.commission).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            );
                        })}
                        {sales.length === 0 && <p className="text-center text-neutral-500 py-4">Nenhuma venda registrada ainda.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotographerDashboard;


