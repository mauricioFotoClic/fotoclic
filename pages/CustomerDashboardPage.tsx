
import React, { useEffect, useState } from 'react';
import { Page, PurchasedPhoto, User } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';

interface CustomerDashboardPageProps {
    onNavigate: (page: Page) => void;
    currentUser: User | null;
}

const CustomerDashboardPage: React.FC<CustomerDashboardPageProps> = ({ onNavigate, currentUser }) => {
    const [purchases, setPurchases] = useState<PurchasedPhoto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPurchases = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const data = await api.getPurchasesByUserId(currentUser.id);
                setPurchases(data);
            } catch (error) {
                console.error("Failed to fetch purchases", error);
            } finally {
                setLoading(false);
            }
        };
        loadPurchases();
    }, [currentUser]);

    const handleDownload = async (photo: PurchasedPhoto) => {
        if (!currentUser) return;

        try {
            // Use the secure method to get a signed URL (valid for 1 hour)
            const secureUrl = await api.getSecureDownloadUrl(photo.id, currentUser.id);

            if (!secureUrl) {
                alert("Erro ao gerar link seguro. Verifique se você realmente comprou esta foto.");
                return;
            }

            const link = document.createElement('a');
            link.href = secureUrl;
            link.setAttribute('download', `fotoclic-${photo.title.replace(/\s+/g, '-').toLowerCase()}.jpg`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Erro ao iniciar download. Tente novamente.");
        }
    };

    if (!currentUser) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <p>Por favor, faça login para ver suas compras.</p>
                <button onClick={() => onNavigate({ name: 'login' })} className="mt-4 text-primary underline">Login</button>
            </div>
        );
    }

    if (loading) return <div className="py-20"><Spinner /></div>;

    return (
        <div className="bg-white min-h-screen">
            <div className="bg-neutral-100 py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Minhas Compras</h1>
                    <p className="mt-2 text-neutral-600">Gerencie e baixe suas fotos adquiridas.</p>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {purchases.length === 0 ? (
                    <div className="text-center py-16 bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
                        <div className="inline-block p-4 rounded-full bg-white shadow-sm mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-neutral-800 mb-2">Você ainda não comprou nenhuma foto.</h2>
                        <p className="text-neutral-500 mb-6">Explore nossa galeria e encontre a imagem perfeita.</p>
                        <button
                            onClick={() => onNavigate({ name: 'home' })}
                            className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-opacity-90 transition-colors"
                        >
                            Explorar Fotos
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {purchases.map(photo => (
                            <div key={photo.sale_id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                <div className="h-48 bg-neutral-100 relative">
                                    <img
                                        src={photo.preview_url}
                                        alt={photo.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                        {photo.resolution}
                                    </div>
                                </div>
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="font-bold text-lg text-neutral-900 mb-1 truncate">{photo.title}</h3>
                                    <p className="text-xs text-neutral-500 mb-4">
                                        Comprado em: {new Date(photo.purchase_date).toLocaleDateString('pt-BR')}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                                        <button
                                            onClick={() => onNavigate({ name: 'photo-detail', id: photo.id })}
                                            className="text-sm text-primary font-medium hover:underline"
                                        >
                                            Ver Detalhes
                                        </button>
                                        <button
                                            onClick={() => handleDownload(photo)}
                                            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-full hover:bg-green-700 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Baixar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboardPage;
