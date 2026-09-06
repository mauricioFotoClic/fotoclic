
import React, { useEffect, useState } from 'react';
import { Page, PurchasedPhoto, User } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';

interface CustomerDashboardPageProps {
    onNavigate: (page: Page) => void;
    currentUser: User | null;
}

const HeadsetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
    </svg>
);

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
                
                // Tenta sincronizar compras pendentes (caso o webhook tenha falhado)
                const session = await api.getSession();
                if (session?.access_token) {
                    await fetch('/api/get-download-url?action=sync-purchases', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ targetUserId: currentUser.id })
                    }).catch(err => console.warn("Sync failed, but continuing...", err));
                }

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
            const signedUrl = await api.getSecureDownloadUrl(photo.id, currentUser.id);

            if (!signedUrl) {
                alert("Erro ao gerar link seguro. Verifique se você realmente comprou esta foto.");
                return;
            }

            const fileName = `fotoclic-${photo.title.replace(/\s+/g, '-').toLowerCase()}`;

            if (photo.media_type === 'video' || signedUrl.includes('cloudflarestream.com')) {
                const link = document.createElement('a');
                link.href = signedUrl;
                link.setAttribute('download', `${fileName}.mp4`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const response = await fetch(signedUrl);
                if (!response.ok) throw new Error('Falha ao baixar o arquivo.');
                const blob = await response.blob();

                const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                link.setAttribute('download', `${fileName}.${ext}`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(objectUrl);
            }
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

    return (
        <div className="bg-white min-h-screen">
            <div className="bg-neutral-100 py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Minhas Compras</h1>
                    <p className="mt-2 text-neutral-600">Gerencie e baixe suas fotos adquiridas.</p>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="lg:grid lg:grid-cols-4 lg:gap-8 items-start">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 mb-8 lg:mb-0">
                        {loading ? (
                            <Spinner size="lg" fullHeight={true} label="Carregando suas fotos compradas..." />
                        ) : purchases.length === 0 ? (
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {purchases.map(photo => (
                                    <div key={photo.sale_id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                        <div className="h-48 bg-neutral-100 relative">
                                            <img
                                                src={photo.thumb_url || photo.preview_url}
                                                alt={photo.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                                {photo.resolution}
                                            </div>
                                        </div>
                                        <div className="p-5 flex-grow flex flex-col">
                                            <h3 className="font-bold text-lg text-neutral-900 mb-1 truncate">{photo.title}</h3>
                                            <div className="space-y-1 mb-4 text-xs text-neutral-500">
                                                <p>
                                                    <span className="font-medium text-neutral-700">Fotógrafo:</span> {photo.photographer_name || "FotoClic"}
                                                </p>
                                                <p>
                                                    <span className="font-medium text-neutral-700">Valor pago:</span> R$ {photo.paid_price !== undefined ? photo.paid_price.toFixed(2).replace('.', ',') : photo.price.toFixed(2).replace('.', ',')}
                                                </p>
                                                <p>
                                                    <span className="font-medium text-neutral-700">Comprado em:</span> {new Date(photo.purchase_date).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>

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

                    {/* Sidebar Area with Support Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gradient-to-br from-neutral-50 to-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center space-x-3 text-primary mb-4">
                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                    <HeadsetIcon />
                                </div>
                                <h3 className="font-bold text-lg text-neutral-900">Suporte FotoClic</h3>
                            </div>
                            <p className="text-neutral-600 text-sm mb-5 leading-relaxed">
                                Dúvidas sobre downloads de fotos, problemas com pagamentos ou precisa de ajuda com sua conta? Nossa equipe está à disposição.
                            </p>
                            <div className="space-y-3">
                                <a 
                                    href="https://wa.me/5521992580137" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-full transition-all shadow-sm hover:shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.012 2c-5.506 0-9.969 4.463-9.969 9.969 0 1.758.459 3.474 1.33 4.988L2 22l5.249-1.378a9.922 9.922 0 004.763 1.218c5.506 0 9.97-4.463 9.97-9.969S17.518 2 12.012 2zm6.2 14.268c-.274.773-1.36 1.4-1.859 1.488-.456.082-.99.117-2.903-.683-2.443-1.017-4.014-3.5-4.136-3.663-.122-.163-1.04-1.385-1.04-2.642 0-1.258.65-1.877.88-2.128.23-.251.5-.314.67-.314.17 0 .34.007.49.017.158.01.37-.06.578.434.214.506.73 1.777.796 1.91.066.133.11.288.022.464-.088.176-.133.288-.265.442-.132.155-.277.346-.395.464-.132.132-.27.276-.118.536.152.26.674 1.11 1.442 1.794.99.88 1.823 1.152 2.083 1.282.26.13.41.11.562-.062.152-.172.656-.763.832-1.02.176-.258.354-.216.597-.126.242.09 1.536.724 1.8.855.264.13.44.195.506.31.066.113.066.657-.208 1.43z"/>
                                    </svg>
                                    Chamar no WhatsApp
                                </a>
                                <a 
                                    href="mailto:fvimagem@fvimagem.com"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-bold text-sm rounded-full transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    Enviar E-mail
                                </a>
                                <button 
                                    onClick={() => onNavigate({ name: 'help-center' })}
                                    className="w-full text-center text-xs text-neutral-400 hover:text-primary transition-colors font-medium pt-2"
                                >
                                    Consulte a nossa Central de Ajuda
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboardPage;


