import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User, PhotographerBalance, Sale, Photo } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    colorClass: string;
}

interface PhotographerDashboardProps {
    user: User;
    setView: (view: any) => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass }) => (
    <div className="bg-white p-5 rounded-lg shadow-md flex items-center">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-neutral-500 font-medium">{title}</p>
            <p className="text-2xl font-display font-bold text-primary-dark">{value}</p>
        </div>
    </div>
);

const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;

const PhotographerDashboard: React.FC<PhotographerDashboardProps> = ({ user, setView }) => {
    const [balance, setBalance] = useState<PhotographerBalance | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [balanceData, salesData, photosData] = await Promise.all([
                api.getPhotographerBalanceById(user.id),
                api.getSalesByPhotographerId(user.id),
                api.getPhotosByPhotographerId(user.id),
            ]);
            setBalance(balanceData || null);
            setSales(salesData);
            setPhotos(photosData);
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
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailySales = last7Days.map(date => {
            const total = sales
                .filter(sale => sale.sale_date.startsWith(date))
                .reduce((sum, sale) => sum + (sale.price - sale.commission), 0);
            return { date, total };
        });
        return dailySales;
    }, [sales]);

    const maxDailyEarning = useMemo(() => Math.max(...salesLast7Days.map(s => s.total), 1), [salesLast7Days]);

    if (loading) return <Spinner />;
    if (!balance) return <p>Não foi possível carregar os dados do dashboard.</p>;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">Bem-vindo, {user.name}!</h1>
            <p className="text-neutral-500 mb-6">Este é o resumo da sua atividade na plataforma.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total de Fotos" value={balance.photoCount} icon={<ImageIcon />} colorClass="bg-blue-100 text-blue-600" />
                <StatCard title="Total de Vendas" value={balance.salesCount} icon={<ShoppingCartIcon />} colorClass="bg-purple-100 text-purple-600" />
                <StatCard title="Total de Curtidas" value={balance.likesCount || 0} icon={<HeartIcon />} colorClass="bg-red-100 text-red-600" />
                <StatCard title="Ganhos Totais" value={balance.totalEarnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<DollarSignIcon />} colorClass="bg-green-100 text-green-600" />
                <StatCard title="Saldo Atual" value={balance.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<CreditCardIcon />} colorClass="bg-yellow-100 text-yellow-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Seus Ganhos (Últimos 7 Dias)</h2>
                    <div className="flex justify-between items-end h-48 space-x-2">
                        {salesLast7Days.map((day, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center justify-end group">
                                <div className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity -mb-1">
                                    {day.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                                <div
                                    className="w-full bg-secondary/20 hover:bg-secondary/40 rounded-t-md transition-all"
                                    style={{ height: `${(day.total / maxDailyEarning) * 100}%` }}
                                ></div>
                                <span className="text-xs text-neutral-500 mt-2">{new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                            </div>
                        ))}
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
