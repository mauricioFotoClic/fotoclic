import React, { useEffect, useState } from 'react';
import { Page, PurchasedPhoto, User } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';

interface CheckoutSuccessPageProps {
    currentUser: User | null;
    onClearCart: () => void;
    onNavigate: (page: Page) => void;
}

const CheckoutSuccessPage: React.FC<CheckoutSuccessPageProps> = ({ currentUser, onClearCart, onNavigate }) => {
    const [purchases, setPurchases] = useState<PurchasedPhoto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Remove cart items from local storage because the purchase was successful
        localStorage.removeItem('cartItems');
        // Clear global cart state in App
        onClearCart();
    }, [onClearCart]);

    useEffect(() => {
        const loadRecentPurchases = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                
                // Tenta sincronizar compras pendentes do webhook, caso o redirect tenha sido mais rápido que o webhook do Abacate Pay
                const session = await api.getSession();
                if (session?.access_token) {
                    await fetch('/api/sync-purchases', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    }).catch(err => console.warn("Sync failed, but continuing...", err));
                }

                const data = await api.getPurchasesByUserId(currentUser.id);
                // Vamos mostrar apenas as compras mais recentes (limitando às que foram processadas agora)
                // A API getPurchasesByUserId já retorna por data desc (as mais novas primeiro)
                setPurchases(data);
            } catch (error) {
                console.error("Failed to fetch purchases on success page", error);
            } finally {
                setLoading(false);
            }
        };
        loadRecentPurchases();
    }, [currentUser]);

    const handleDownload = async (photo: PurchasedPhoto) => {
        if (!currentUser) return;

        try {
            const signedUrl = await api.getSecureDownloadUrl(photo.id, currentUser.id);

            if (!signedUrl) {
                alert("Erro ao gerar link seguro. Verifique se você realmente comprou esta foto.");
                return;
            }

            const response = await fetch(signedUrl);
            if (!response.ok) throw new Error('Falha ao baixar o arquivo.');
            const blob = await response.blob();

            const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
            const fileName = `fotoclic-${photo.title.replace(/\s+/g, '-').toLowerCase()}.${ext}`;

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Erro ao iniciar download. Tente novamente.");
        }
    };

    return (
        <div className="bg-neutral-50 min-h-[80vh] py-12 flex flex-col items-center animate-fadeIn">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    
                    <h1 className="text-4xl font-display font-bold text-neutral-900 mb-4">
                        Pagamento Confirmado! 🎉
                    </h1>
                    
                    <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                        Muito obrigado pela sua compra. Suas fotos já estão liberadas para download abaixo.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center py-10">
                        <Spinner size="lg" />
                        <p className="mt-4 text-neutral-500 font-medium">Preparando suas fotos em alta resolução...</p>
                    </div>
                ) : purchases.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-neutral-200">
                        <p className="text-neutral-500 mb-4">Ainda processando o seu pagamento ou liberando as fotos. Se demorar, atualize a página.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors font-bold"
                        >
                            Atualizar Página
                        </button>
                    </div>
                ) : (
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-neutral-200">
                        <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Fotos Liberadas
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {purchases.map(photo => (
                                <div key={photo.sale_id} className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-200 flex flex-col shadow-sm hover:shadow-md transition-all">
                                    <div className="h-40 bg-neutral-200 relative">
                                        <img
                                            src={photo.thumb_url || photo.preview_url}
                                            alt={photo.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h3 className="font-bold text-neutral-900 truncate mb-1" title={photo.title}>{photo.title}</h3>
                                        <p className="text-xs text-neutral-500 mb-4">{photo.resolution}</p>
                                        
                                        <button
                                            onClick={() => handleDownload(photo)}
                                            className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Baixar Original
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 text-center border-t border-neutral-100 pt-8">
                            <button
                                onClick={() => onNavigate({ name: 'customer-dashboard' })}
                                className="text-neutral-500 hover:text-primary underline font-medium"
                            >
                                Ver todo o meu histórico de Minhas Compras
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutSuccessPage;
