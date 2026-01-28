
import React, { useEffect, useState, useRef } from 'react';
import { Photo, User, Page } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import WatermarkedImage from '../components/WatermarkedImage';
import SEO from '../components/SEO';

interface PhotoDetailPageProps {
    photoId: string;
    onNavigate: (page: Page) => void;
    currentUser: User | null;
    onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
}

const PhotoDetailPage: React.FC<PhotoDetailPageProps> = ({ photoId, onNavigate, currentUser, onAddToCart }) => {
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [photographer, setPhotographer] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasPurchased, setHasPurchased] = useState(false);
    const imgContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const photoData = await api.getPhotoById(photoId);
                if (photoData) {
                    setPhoto(photoData);
                    const photographerData = await api.getPhotographerById(photoData.photographer_id);
                    if (photographerData) {
                        setPhotographer(photographerData);
                    }

                    if (currentUser) {
                        const purchased = await api.checkIfPurchased(currentUser.id, photoId);
                        setHasPurchased(purchased);
                    }
                }
            } catch (error) {
                console.error("Failed to load photo details", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [photoId, currentUser]);

    const handleDownload = async () => {
        if (!photo || !currentUser) return;

        try {
            const secureUrl = await api.getSecureDownloadUrl(photo.id, currentUser.id);

            if (!secureUrl) {
                alert("Erro ao gerar link de download. Tente novamente.");
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
            alert("Erro ao iniciar download.");
        }
    };

    const handleAddToCartClick = () => {
        if (!photo) return;
        let imgElement: HTMLImageElement | undefined = undefined;
        if (imgContainerRef.current) {
            imgElement = imgContainerRef.current.querySelector('img') || undefined;
        }
        onAddToCart(photo.id, imgElement);
    };

    if (loading) return <div className="container mx-auto px-4 py-16"><Spinner /></div>;

    if (!photo) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-display font-bold text-neutral-800">Foto não encontrada.</h2>
                <button onClick={() => onNavigate({ name: 'home' })} className="mt-4 px-6 py-2 bg-primary text-white rounded-full hover:bg-opacity-90">
                    Voltar para a Home
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen pb-12">
            <SEO
                title={`${photo.title} por ${photographer ? photographer.name : 'Unknown'}`}
                description={photo.description || `Compre a foto "${photo.title}" em alta resolução no FotoClic.`}
                image={photo.preview_url}
                url={`https://fotoclic.com.br/foto/${photo.id}`}
                type="article"
            />
            <div className="bg-neutral-100 py-4 border-b border-neutral-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <button onClick={() => onNavigate({ name: 'home' })} className="text-sm text-neutral-500 hover:text-primary">Home</button>
                    <span className="mx-2 text-neutral-400">/</span>
                    <span className="text-sm text-neutral-800 font-medium">{photo.title}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div ref={imgContainerRef} className="bg-neutral-100 rounded-lg overflow-hidden shadow-sm border border-neutral-200 flex items-center justify-center">
                            {hasPurchased ? (
                                <img src={photo.preview_url} alt={photo.title} className="w-full h-auto max-h-[70vh] object-contain" />
                            ) : (
                                <WatermarkedImage src={photo.preview_url} alt={photo.title} className="w-full h-auto max-h-[70vh] object-contain" />
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">{photo.title}</h1>

                            {photo.width && photo.height && (
                                <p className="text-sm text-neutral-500 font-mono mb-4">{photo.width} x {photo.height}</p>
                            )}

                            {photographer && (
                                <div className="flex items-center mb-6">
                                    <img src={photographer.avatar_url} alt={photographer.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-neutral-200" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Fotografia por</p>
                                        <p className="font-medium text-neutral-800">{photographer.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-6">
                                {hasPurchased ? (
                                    <div className="text-center">
                                        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-neutral-800 mb-2">Você já possui esta foto!</h3>
                                        <button onClick={handleDownload} className="w-full py-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                                            Baixar Alta Resolução
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-end justify-between mb-4">
                                            <span className="text-neutral-500">Preço da Licença</span>
                                            <span className="text-3xl font-display font-bold text-primary">
                                                R$ {photo.price.toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>

                                        {/* Bulk Discount Banner */}
                                        {photographer?.bulkDiscountRules && photographer.bulkDiscountRules.length > 0 && (
                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    Leve mais, pague menos!
                                                </p>
                                                <ul className="space-y-1">
                                                    {photographer.bulkDiscountRules.map((rule, idx) => (
                                                        <li key={idx} className="text-sm text-blue-700 flex justify-between">
                                                            <span>{rule.minQuantity} fotos</span>
                                                            <span className="font-bold">{rule.discountPercent}% OFF</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <button onClick={handleAddToCartClick} className="w-full py-3 bg-primary text-white font-bold rounded-full shadow-lg hover:bg-opacity-90 transition-all transform hover:-translate-y-0.5 mb-3">
                                            Adicionar ao Carrinho
                                        </button>
                                    </>
                                )}

                                <div className="mt-4 pt-4 border-t border-neutral-200 text-xs text-neutral-500 flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span>Resolução:</span><span className="font-medium text-neutral-700">{photo.resolution}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Formato:</span><span className="font-medium text-neutral-700">JPG / RAW</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Licença:</span><span className="font-medium text-neutral-700">Royalty-Free</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-display font-bold text-primary-dark mb-2">Descrição</h3>
                                <p className="text-neutral-600 leading-relaxed">{photo.description || "Sem descrição disponível para esta imagem."}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotoDetailPage;
