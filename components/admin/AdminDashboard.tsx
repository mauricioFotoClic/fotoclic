import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { supabase } from '../../services/supabaseClient';
import { faceRecognitionService } from '../../services/faceRecognition';
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
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ setView }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Engine Reindex State
    const [isReindexing, setIsReindexing] = useState(false);
    const [reindexProgress, setReindexProgress] = useState(0);
    const [reindexTotal, setReindexTotal] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const statsData = await api.getAdminStats();
            setStats(statsData);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleReindexAllPhotos = async () => {
        if (!confirm("Isso iniciará a re-indexação biométrica (Human AI) para TODAS as fotos marcadas como não indexadas. Devido ao hardware de IA rodar no seu navegador, mantenha esta aba ativa durante o processo. Deseja continuar?")) return;

        try {
            setIsReindexing(true);
            const totalToProcess = stats.notIndexedPhotosCount; // Use the count from fetched stats
            setReindexTotal(totalToProcess);
            setReindexProgress(0);

            if (totalToProcess === 0) {
                alert("Todas as fotos do banco de dados já estão indexadas com a nova tecnologia!");
                setIsReindexing(false);
                return;
            }

            let processed = 0;
            const batchSize = 10;

            while (processed < totalToProcess) {
                // Fetch next batch of non-indexed photos
                const photosToProcess = await api.getPhotosToReindex(batchSize);

                if (photosToProcess.length === 0) break;

                for (const photo of photosToProcess) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";

                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = () => {
                            console.error(`Falha ao carregar a imagem para a foto ${photo.id}`);
                            resolve(null);
                        };
                        img.src = photo.preview_url;
                    });

                    try {
                        await faceRecognitionService.indexPhoto(photo.id, img);
                    } catch (e) {
                        console.warn(`Foto ${photo.id} falhou na IA:`, e);
                    }

                    processed++;
                    setReindexProgress(processed);
                }

                // Small delay to prevent browser freeze and allow UI updates
                await new Promise(r => setTimeout(r, 100));
            }

            alert("✅ Atualização Completa! Biometria SaaS recarregada e Banco de Dados atualizado.");
            fetchData(); // Refresh stats
        } catch (error) {
            console.error(error);
            alert("Ocorreu um erro no processamento das fotos.");
        } finally {
            setIsReindexing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const {
        totalRevenue = 0,
        salesCount = 0,
        activePhotographersCount = 0,
        pendingPhotosCount = 0,
        notIndexedPhotosCount = 0, // Added here!
        pendingPhotos = [],
        salesLast7Days = [],
        topPhotographers = [],
        categoryPhotoCount = []
    } = stats || {};

    const maxDailySale = useMemo(() => Math.max(...salesLast7Days.map((s: any) => s.total), 1), [salesLast7Days]);
    const maxCategoryCount = useMemo(() => Math.max(...categoryPhotoCount.map((c: any) => c.count), 1), [categoryPhotoCount]);

    if (loading) return <Spinner />;
    if (!stats) return <div className="p-8 text-center text-neutral-500">Falha ao carregar estatísticas.</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">Bem-vindo, Admin!</h1>
                    <p className="text-neutral-500">Aqui está um resumo da atividade do seu marketplace.</p>
                </div>

                <div className="mt-4 md:mt-0 bg-white p-4 rounded-lg shadow-sm w-full md:w-auto border border-primary/20">
                    <h3 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                        <LayersIcon /> Ferramentas do Sistema
                    </h3>
                    <div className="flex flex-col gap-2">
                        {isReindexing ? (
                            <div className="w-full bg-neutral-200 rounded-full h-4 relative overflow-hidden min-w-[200px]">
                                <div
                                    className="bg-primary h-4 transition-all duration-300"
                                    style={{ width: `${(reindexProgress / Math.max(reindexTotal, 1)) * 100}%` }}
                                ></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                    {reindexProgress} / {reindexTotal} Processando...
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={handleReindexAllPhotos}
                                className="w-full md:w-auto bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors text-sm font-semibold shadow"
                            >
                                Re-Indexar Rostos Ausentes (Human AI)
                            </button>
                        )}
                        <p className="text-[11px] text-neutral-400 max-w-xs leading-tight">
                            Buscador de Biometria. Se você zerou o banco de vetores em uma atualização, aperte para recriá-los com a CPU deste PC.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Receita Total" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<DollarSignIcon />} colorClass="bg-green-100 text-green-600" />
                <StatCard title="Vendas Realizadas" value={salesCount} icon={<ShoppingCartIcon />} colorClass="bg-blue-100 text-blue-600" />
                <StatCard title="Fotógrafos Ativos" value={activePhotographersCount} icon={<UsersIcon />} colorClass="bg-purple-100 text-purple-600" />
                <StatCard title="Aguardando Moderação" value={pendingPhotosCount} icon={<ClockIcon />} colorClass="bg-yellow-100 text-yellow-600" />
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
                        <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Aguardando Moderação ({pendingPhotosCount})</h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {pendingPhotosCount > 0 ? pendingPhotos.map((photo: any) => (
                                <button
                                    key={photo.id}
                                    onClick={() => setView('photos', { filterByPhotoId: photo.id })}
                                    className="w-full flex items-center p-2 rounded-md hover:bg-neutral-100 text-left transition-colors"
                                >
                                    <img src={photo.preview_url} alt={photo.title} className="w-16 h-12 object-cover rounded-md mr-4 flex-shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-neutral-800 truncate">{photo.title}</p>
                                        <p className="text-sm text-neutral-500">por {photo.photographer_name || 'N/A'}</p>
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
                    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50">
                        <h3 className="font-bold text-neutral-800 mb-2">Re-indexação Biométrica</h3>
                        <p className="text-sm text-neutral-600 mb-4">
                            Processa fotos no seu navegador para extrair vetores faciais (Human AI).
                            Útil para fotos antigas ou migrações.
                            <strong> {notIndexedPhotosCount} fotos pendentes.</strong>
                        </p>

                        {isReindexing ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium text-neutral-700">
                                    <span>Processando...</span>
                                    <span>{reindexProgress} / {reindexTotal}</span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-2.5">
                                    <div
                                        className="bg-secondary h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(reindexProgress / (reindexTotal || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleReindexAllPhotos}
                                className="px-6 py-2 bg-secondary text-white font-bold rounded-full hover:bg-secondary-light transition-all shadow-sm flex items-center"
                            >
                                <span className="mr-2">🚀</span> Iniciar Re-indexação em Massa
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
