
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../services/api';
import Spinner from '../Spinner';
import { Photo, User, Category, Sale, PhotographerWithStats } from '../../types';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    colorClass: string;
}

interface AdminDashboardProps {
    setView: (view: any, context?: any) => void;
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

const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ setView }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [photographers, setPhotographers] = useState<PhotographerWithStats[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [salesData, photosData, photographersData, categoriesData] = await Promise.all([
                api.getSales(),
                api.getAllPhotos(),
                api.getPhotographers(),
                api.getCategories(),
            ]);
            setSales(salesData);
            setPhotos(photosData);
            setPhotographers(photographersData);
            setCategories(categoriesData);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalRevenue = useMemo(() => sales.reduce((sum, sale) => sum + sale.price, 0), [sales]);
    const activePhotographersCount = useMemo(() => photographers.filter(p => p.is_active).length, [photographers]);
    const pendingPhotos = useMemo(() => photos.filter(p => p.moderation_status === 'pending'), [photos]);
    
    const salesLast7Days = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailySales = last7Days.map(date => {
            const total = sales
                .filter(sale => sale.sale_date.startsWith(date))
                .reduce((sum, sale) => sum + sale.price, 0);
            return { date, total };
        });
        return dailySales;
    }, [sales]);
    
    const maxDailySale = useMemo(() => Math.max(...salesLast7Days.map(s => s.total), 1), [salesLast7Days]);

    const topPhotographers = useMemo(() => {
        const revenueByPhotographer = sales.reduce((acc, sale) => {
            const photo = photos.find(p => p.id === sale.photo_id);
            if (photo) {
                acc[photo.photographer_id] = (acc[photo.photographer_id] || 0) + sale.price;
            }
            return acc;
        }, {} as Record<string, number>);

        return photographers
            .map(p => ({ ...p, totalRevenue: revenueByPhotographer[p.id] || 0 }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);
    }, [sales, photos, photographers]);
    
    const categoryPhotoCount = useMemo(() => {
        const counts: { [key: string]: number } = {};
        categories.forEach(cat => {
            counts[cat.name] = 0;
        });
        counts['Sem Categoria'] = 0;

        photos.forEach(photo => {
            const category = categories.find(c => c.id === photo.category_id);
            if (category) {
                counts[category.name]++;
            } else {
                counts['Sem Categoria']++;
            }
        });
        
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [photos, categories]);

    const maxCategoryCount = useMemo(() => Math.max(...categoryPhotoCount.map(c => c.count), 1), [categoryPhotoCount]);
    
    if (loading) return <Spinner />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">Bem-vindo, Admin!</h1>
            <p className="text-neutral-500 mb-6">Aqui está um resumo da atividade do seu marketplace.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Receita Total" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<DollarSignIcon />} colorClass="bg-green-100 text-green-600" />
                <StatCard title="Vendas Realizadas" value={sales.length} icon={<ShoppingCartIcon />} colorClass="bg-blue-100 text-blue-600" />
                <StatCard title="Fotógrafos Ativos" value={activePhotographersCount} icon={<UsersIcon />} colorClass="bg-purple-100 text-purple-600" />
                <StatCard title="Aguardando Moderação" value={pendingPhotos.length} icon={<ClockIcon />} colorClass="bg-yellow-100 text-yellow-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Vendas nos Últimos 7 Dias</h2>
                        <div className="flex justify-between items-end h-48 space-x-2">
                           {salesLast7Days.map((day, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center justify-end group">
                                    <div className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity -mb-1">
                                       {day.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                    <div 
                                        className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-md transition-all"
                                        style={{ height: `${(day.total / maxDailySale) * 100}%` }}
                                    ></div>
                                    <span className="text-xs text-neutral-500 mt-2">{new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                </div>
                           ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Aguardando Moderação ({pendingPhotos.length})</h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {pendingPhotos.length > 0 ? pendingPhotos.map(photo => (
                                <button
                                    key={photo.id}
                                    onClick={() => setView('photos', { filterByPhotoId: photo.id })}
                                    className="w-full flex items-center p-2 rounded-md hover:bg-neutral-100 text-left transition-colors"
                                >
                                    <img src={photo.preview_url} alt={photo.title} className="w-16 h-12 object-cover rounded-md mr-4 flex-shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-neutral-800 truncate">{photo.title}</p>
                                        <p className="text-sm text-neutral-500">por {photographers.find(p => p.id === photo.photographer_id)?.name || 'N/A'}</p>
                                    </div>
                                </button>
                            )) : <p className="text-center text-neutral-500 py-4">Nenhuma foto pendente. Bom trabalho!</p>}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Fotógrafos em Destaque</h2>
                        <div className="space-y-4">
                            {topPhotographers.map(p => (
                                <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <img src={p.avatar_url} alt={p.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                                        <div>
                                            <p className="font-semibold text-neutral-800">{p.name}</p>
                                            <p className="text-xs text-neutral-500">{p.location || 'Local não informado'}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-600">{p.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))}
                        </div>
                     </div>
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Fotos por Categoria</h2>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                            {categoryPhotoCount.map((data, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="font-medium text-neutral-700">{data.name}</span>
                                        <span className="text-neutral-500">{data.count}</span>
                                    </div>
                                    <div className="w-full bg-neutral-200 rounded-full h-2">
                                        <div className="bg-secondary h-2 rounded-full" style={{ width: `${(data.count / maxCategoryCount) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
