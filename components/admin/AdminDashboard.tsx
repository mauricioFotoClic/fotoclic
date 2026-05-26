import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { supabase } from '../../services/supabaseClient';
import { faceRecognitionService } from '../../services/faceRecognition';
import Spinner from '../Spinner';
import Modal from '../Modal';
import Toast from '../Toast';
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
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ setView }) => {
    const [stats, setStats] = useState<any>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [timeRange, setTimeRange] = useState(7);
    const [loading, setLoading] = useState(true);

    // Engine Reindex State
    const [isReindexing, setIsReindexing] = useState(false);
    const [reindexProgress, setReindexProgress] = useState(0);
    const [reindexTotal, setReindexTotal] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsData, salesData] = await Promise.all([
                api.getAdminStats(),
                api.getSales()
            ]);
            setStats(statsData);
            setSales(salesData);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const [currentIndexingPhoto, setCurrentIndexingPhoto] = useState<string | null>(null);
    const [lastStatus, setLastStatus] = useState<'success' | 'error' | 'none'>('none');
    
    // UI Feedback state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({
        show: false,
        message: '',
        type: 'success'
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleReindexAllPhotos = async () => {
        setShowConfirmModal(false);

        try {
            setIsReindexing(true);
            const totalToProcess = stats.notIndexedPhotosCount; 
            setReindexTotal(totalToProcess);
            setReindexProgress(0);
            setLastStatus('none');

            if (totalToProcess === 0) {
                showToast("Todas as fotos do banco de dados já estão indexadas com a nova tecnologia!", "info");
                setIsReindexing(false);
                return;
            }

            let processedCount = 0;
            const batchSize = 10;
            
            while (processedCount < totalToProcess) {
                const photosToProcess = await api.getPhotosToReindex(batchSize);
                if (!photosToProcess || photosToProcess.length === 0) break;

                for (const photo of photosToProcess) {
                    try {
                        setCurrentIndexingPhoto(photo.thumb_url || photo.preview_url);
                        setLastStatus('none');
                        
                        await faceRecognitionService.indexPhoto(photo.id, photo.preview_url || photo.thumb_url);
                        setLastStatus('success');
                        setStats((prev: any) => ({ ...prev, notIndexedPhotosCount: prev.notIndexedPhotosCount - 1 }));
                    } catch (e) {
                        console.warn(`Foto ${photo.id} falhou na IA:`, e);
                        setLastStatus('error');
                        await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photo.id);
                    }

                    processedCount++;
                    setReindexProgress(prev => Math.min(prev + 1, totalToProcess));
                    await new Promise(r => setTimeout(r, 400)); // Delay para a animação ser visível
                }
            }

            showToast("✅ Biometria atualizada com sucesso!", "success");
            fetchData();
        } catch (error) {
            console.error(error);
            showToast("Ocorreu um erro no processamento das fotos.", "error");
        } finally {
            setIsReindexing(false);
            setCurrentIndexingPhoto(null);
            setLastStatus('none');
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const {
        totalRevenue = 0,
        salesCount = 0,
        activePhotographersCount = 0,
        notIndexedPhotosCount = 0,
        topPhotographers = [],
        categoryPhotoCount = []
    } = stats || {};

    const salesChartData = useMemo(() => {
        const lastDays = Array.from({ length: timeRange }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (timeRange - 1 - i));
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });

        return lastDays.map(date => {
            const total = sales
                .filter(sale => {
                    const d = new Date(sale.sale_date);
                    const sYear = d.getFullYear();
                    const sMonth = String(d.getMonth() + 1).padStart(2, '0');
                    const sDay = String(d.getDate()).padStart(2, '0');
                    const saleLocalDate = `${sYear}-${sMonth}-${sDay}`;
                    return saleLocalDate === date;
                })
                .reduce((sum, sale) => sum + Number(sale.price), 0);
            return { date, total };
        });
    }, [sales, timeRange]);

    const maxDailySale = useMemo(() => Math.max(...salesChartData.map((s: any) => Number(s.total)), 1), [salesChartData]);
    const maxCategoryCount = useMemo(() => Math.max(...categoryPhotoCount.map((c: any) => c.count), 1), [categoryPhotoCount]);

    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando estatísticas do painel..." />;
    if (!stats) return <div className="p-8 text-center text-neutral-500">Falha ao carregar estatísticas.</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">Bem-vindo, Admin!</h1>
                    <p className="text-neutral-500">Aqui está um resumo da atividade do seu marketplace.</p>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Receita Total" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<DollarSignIcon />} colorClass="bg-green-100 text-green-600" />
                <StatCard title="Vendas Realizadas" value={salesCount} icon={<ShoppingCartIcon />} colorClass="bg-primary/20 text-primary-dark" />
                <StatCard title="Fotógrafos Ativos" value={activePhotographersCount} icon={<UsersIcon />} colorClass="bg-primary/20 text-primary-dark" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-display font-bold text-primary-dark">Desempenho de Vendas</h2>
                            <div className="flex bg-neutral-100 p-1 rounded-lg">
                                {[7, 15, 30].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                            timeRange === range 
                                            ? 'bg-white text-primary shadow-sm' 
                                            : 'text-neutral-500 hover:text-neutral-700'
                                        }`}
                                    >
                                        {range === 30 ? 'Mensal' : `${range} Dias`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex-grow flex items-end h-64 space-x-1 sm:space-x-2 border-b border-neutral-100 pb-2 mb-4">
                            {salesChartData.map((day: any, index: number) => {
                                const total = Number(day.total);
                                const h = maxDailySale > 0 ? (total / maxDailySale) * 100 : 0;

                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center justify-end group h-full relative">
                                        <div className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity mb-1 absolute -top-10 bg-white px-2 py-1 rounded shadow-lg border border-primary/10 z-20 whitespace-nowrap">
                                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            <div className="text-[8px] text-neutral-400 font-normal">
                                                {new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                        <div
                                            className={`w-full bg-primary hover:bg-primary-dark rounded-t-sm transition-all shadow-sm ${total > 0 ? 'opacity-100' : 'opacity-20'}`}
                                            style={{ height: `${total > 0 ? Math.max(h, 4) : 2}%` }}
                                        ></div>
                                        {timeRange <= 15 && (
                                            <span className="text-[8px] sm:text-[10px] text-neutral-400 mt-2 font-medium">
                                                {new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-center">
                                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Média Diária</p>
                                <p className="text-lg font-display font-bold text-primary">
                                    {(salesChartData.reduce((acc, curr) => acc + curr.total, 0) / timeRange).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                            <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/10 text-center">
                                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Total Período</p>
                                <p className="text-lg font-display font-bold text-secondary">
                                    {salesChartData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Fotógrafos em Destaque</h2>
                        <div className="space-y-4">
                            {topPhotographers.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden mr-3">
                                            {p.avatar_url && p.avatar_url !== 'base64_hidden' ? (
                                                <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold">
                                                    {p.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-800">{p.name}</p>
                                            <p className="text-xs text-neutral-500">{p.location || 'Local não informado'}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-600">{p.totalrevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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

            {/* Gerenciamento do Sistema */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md border-t-4 border-secondary">
                <h2 className="text-xl font-display font-bold text-primary-dark mb-4 flex items-center">
                    <span className="mr-2">⚙️</span> Ferramentas do Sistema
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-neutral-800 mb-1">Re-indexação Biométrica</h3>
                                <p className="text-sm text-neutral-600">
                                    Extração de vetores faciais (Human AI).
                                    <strong> {notIndexedPhotosCount} fotos pendentes.</strong>
                                </p>
                            </div>
                            {!isReindexing ? (
                                <button
                                    onClick={() => setShowConfirmModal(true)}
                                    className="px-6 py-2 bg-secondary text-white font-bold rounded-full hover:bg-secondary-light transition-all shadow-sm flex items-center"
                                >
                                    <span className="mr-2">🚀</span> Iniciar
                                </button>
                            ) : null}
                        </div>

                        {isReindexing && (
                            <div className="flex flex-col items-center">
                                {/* Animação de Carrossel / Scanner */}
                                <div className="w-full flex justify-center items-center gap-4 py-6 overflow-hidden relative">
                                    <div className="flex gap-4 animate-pulse opacity-20">
                                        <div className="w-16 h-20 bg-neutral-300 rounded shadow-inner"></div>
                                        <div className="w-16 h-20 bg-neutral-300 rounded shadow-inner"></div>
                                    </div>
                                    
                                    <div className={`relative w-32 h-40 border-4 rounded-xl overflow-hidden shadow-2xl bg-white transition-all duration-300 transform scale-110 ${
                                        lastStatus === 'success' ? 'border-green-500 ring-4 ring-green-100' : 
                                        lastStatus === 'error' ? 'border-red-500 ring-4 ring-red-100' : 'border-primary'
                                    }`}>
                                        {/* Imagem sendo indexada */}
                                        <img 
                                            src={currentIndexingPhoto || "/placeholder-silhouette.png"} 
                                            className="w-full h-full object-cover" 
                                            alt="Scanning..."
                                        />
                                        
                                        {/* Scanner Beam */}
                                        {lastStatus === 'none' && (
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-light shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan z-10"></div>
                                        )}
                                        
                                        {/* Overlay Feedback Icon */}
                                        {lastStatus === 'success' && (
                                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                                <div className="bg-white rounded-full p-2 text-green-500 shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            </div>
                                        )}
                                        {lastStatus === 'error' && (
                                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                                <div className="bg-white rounded-full p-2 text-red-500 shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 animate-pulse opacity-20">
                                        <div className="w-16 h-20 bg-neutral-300 rounded shadow-inner"></div>
                                        <div className="w-16 h-20 bg-neutral-300 rounded shadow-inner"></div>
                                    </div>
                                </div>

                                <div className="w-full space-y-2 mt-4">
                                    <div className="flex justify-between text-xs font-bold text-neutral-600">
                                        <span>Rastreando Biometria...</span>
                                        <span>{reindexProgress} / {reindexTotal}</span>
                                    </div>
                                    <div className="w-full bg-neutral-200 rounded-full h-3 shadow-inner overflow-hidden">
                                        <div
                                            className="bg-secondary h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--color-secondary),0.5)]"
                                            style={{ width: `${(reindexProgress / (reindexTotal || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <style>{`
                            @keyframes scan {
                                0% { top: 0%; opacity: 1; }
                                50% { top: 100%; opacity: 1; }
                                100% { top: 0%; opacity: 1; }
                            }
                            .animate-scan {
                                animation: scan 2s linear infinite;
                            }
                        `}</style>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação Personalizado */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="🚀 Iniciar Re-indexação em Massa"
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-lg text-primary-dark flex items-start gap-4">
                        <div className="p-2 bg-primary text-white rounded-full flex-shrink-0 mt-1">
                            <LayersIcon />
                        </div>
                        <p className="text-sm leading-relaxed">
                            Isso iniciará a re-indexação biométrica (**Human AI**) para todas as fotos marcadas como não indexadas. 
                        </p>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 text-sm flex gap-3">
                        <span className="text-xl">⚠️</span>
                        <p>
                            O processamento é feito usando a **CPU deste computador**. Mantenha esta aba aberta e ativa para garantir a velocidade máxima de processamento.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-neutral-500 hover:bg-neutral-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleReindexAllPhotos}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-secondary text-white hover:bg-secondary-dark shadow-lg shadow-secondary/20 transition-all"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Toast Dinâmico */}
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
        </div>
    );
};

export default AdminDashboard;


