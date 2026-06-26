
import React, { useEffect, useState, useRef } from 'react';
import { Photo, User, Page } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import WatermarkedImage from '../components/WatermarkedImage';
import SEO from '../components/SEO';
import { shareContent } from '../utils/share';
import { getAvatarFallbackUrl } from '../utils/stringUtils';
import FloatingShareButton from '../components/FloatingShareButton';



interface PhotoDetailPageProps {
    photoId: string;
    onNavigate: (page: Page) => void;
    currentUser: User | null;
    onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
}

const PhotoDetailPage: React.FC<PhotoDetailPageProps> = ({ photoId, onNavigate, currentUser, onAddToCart }) => {
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [photographer, setPhotographer] = useState<User | null>(null);
    const [loadingPhoto, setLoadingPhoto] = useState(true);
    const [loadingSecondary, setLoadingSecondary] = useState(true);
    const [hasPurchased, setHasPurchased] = useState(false);
    const imgContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            try {
                setLoadingPhoto(true);
                setLoadingSecondary(true);
                const photoData = await api.getPhotoById(photoId);
                
                if (!isMounted) return;

                if (photoData) {
                    setPhoto(photoData);
                    setLoadingPhoto(false); // Foto carregada, libera o render da imagem principal imediatamente!

                    // Busca dados secundários em paralelo (Evita efeito Waterfall)
                    const promises: Promise<any>[] = [];
                    
                    promises.push(api.getPhotographerById(photoData.photographer_id).then(photographerData => {
                        if (isMounted && photographerData) setPhotographer(photographerData);
                    }));

                    if (currentUser) {
                        promises.push(api.checkIfPurchased(currentUser.id, photoId).then(purchased => {
                            if (isMounted) setHasPurchased(purchased);
                        }));
                    }
                    
                    await Promise.all(promises);
                    if (isMounted) setLoadingSecondary(false);
                } else {
                    if (isMounted) {
                        setLoadingPhoto(false);
                        setLoadingSecondary(false);
                    }
                }
            } catch (error) {
                console.error("Failed to load photo details", error);
                if (isMounted) {
                    setLoadingPhoto(false);
                    setLoadingSecondary(false);
                }
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [photoId, currentUser]);

    useEffect(() => {
        if (!photo || photo.media_type !== 'video' || hasPurchased) return;

        let active = true;
        let playerInstance: any = null;
        let cleanupFn: (() => void) | undefined = undefined;

        const initPlayer = () => {
            if (!active) return;
            const iframe = document.querySelector('iframe[src*="videodelivery.net"]');
            if (iframe && (window as any).Stream) {
                try {
                    const player = (window as any).Stream(iframe);
                    playerInstance = player;
                    
                    // Forçar mudo inicial e volume em zero
                    player.muted = true;
                    player.volume = 0;

                    const handleVolumeChange = () => {
                        if (!player.muted || player.volume > 0) {
                            player.muted = true;
                            player.volume = 0;
                        }
                    };

                    player.addEventListener('volumechange', handleVolumeChange);
                    player.addEventListener('play', handleVolumeChange);

                    const checkInterval = setInterval(() => {
                        if (player.volume > 0 || !player.muted) {
                            player.muted = true;
                            player.volume = 0;
                        }
                    }, 1000);

                    return () => {
                        clearInterval(checkInterval);
                        try {
                            player.removeEventListener('volumechange', handleVolumeChange);
                            player.removeEventListener('play', handleVolumeChange);
                        } catch (e) {
                            console.warn("Error removing listeners:", e);
                        }
                    };
                } catch (err) {
                    console.error("Erro ao inicializar o SDK do Cloudflare Stream:", err);
                }
            }
        };

        if (!(window as any).Stream) {
            const script = document.createElement('script');
            script.src = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
            script.async = true;
            script.onload = () => {
                setTimeout(() => {
                    cleanupFn = initPlayer();
                }, 500);
            };
            document.body.appendChild(script);
        } else {
            cleanupFn = initPlayer();
        }

        return () => {
            active = false;
            if (cleanupFn) cleanupFn();
        };
    }, [photo, hasPurchased]);

    const handleDownload = async () => {
        if (!photo || !currentUser) return;

        try {
            const secureUrl = await api.getSecureDownloadUrl(photo.id, currentUser.id);

            if (!secureUrl) {
                alert("Erro ao gerar link de download. Tente novamente.");
                return;
            }

            const extension = photo.media_type === 'video' ? 'mp4' : 'jpg';
            const link = document.createElement('a');
            link.href = secureUrl;
            link.setAttribute('download', `fotoclic-${photo.title.replace(/\s+/g, '-').toLowerCase()}.${extension}`);
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

    if (!loadingPhoto && !photo) {
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
            {!loadingPhoto && photo && (
                <SEO
                    title={`${photo.title} por ${photographer ? photographer.name : 'Unknown'}`}
                    description={photo.description || `Compre a foto "${photo.title}" em alta resolução no FotoClic.`}
                    image={photo.preview_url}
                    url={`https://fotoclic.com.br/foto/${photo.id}`}
                    type="article"
                />
            )}
            <div className="bg-neutral-100 py-4 border-b border-neutral-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <button onClick={() => onNavigate({ name: 'home' })} className="text-sm text-neutral-500 hover:text-primary">Home</button>
                    <span className="mx-2 text-neutral-400">/</span>
                    <span className="text-sm text-neutral-800 font-medium">
                        {loadingPhoto ? <span className="inline-block w-32 h-4 bg-neutral-200 animate-pulse rounded align-middle"></span> : photo?.title}
                    </span>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {loadingPhoto ? (
                            <div className="bg-neutral-100 rounded-lg overflow-hidden shadow-sm border border-neutral-200 flex items-center justify-center w-full aspect-video">
                                <Spinner size="lg" label="Carregando mídia..." />
                            </div>
                        ) : photo ? (
                            <>
                                <div ref={imgContainerRef} className="bg-neutral-100 rounded-lg overflow-hidden shadow-sm border border-neutral-200 flex items-center justify-center w-full">
                                    {photo.media_type === 'video' ? (
                                        hasPurchased ? (
                                            <div className="w-full aspect-video max-h-[70vh] bg-black relative">
                                                <iframe
                                                    src={`https://iframe.videodelivery.net/${photo.video_uid}?preload=true&loop=true&controls=true`}
                                                    className="w-full h-full"
                                                    style={{ border: 'none' }}
                                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-video max-h-[70vh] bg-neutral-100 relative select-none" onContextMenu={(e) => e.preventDefault()}>
                                                <iframe
                                                    src={`https://iframe.videodelivery.net/${photo.video_uid}?preload=true&loop=true&controls=true&autoplay=true&muted=true`}
                                                    className="w-full h-full"
                                                    style={{ border: 'none' }}
                                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                                <div className="absolute inset-0 z-20 pointer-events-none flex flex-wrap content-center justify-center overflow-hidden opacity-30">
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-1/3 h-1/4 flex items-center justify-center transform -rotate-45"
                                                        >
                                                            <span className="text-white font-display font-bold text-lg sm:text-xl whitespace-nowrap drop-shadow-md select-none border-2 border-white/20 px-2 py-1 rounded-md">
                                                                FotoClic Preview
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                         hasPurchased ? (
                                             <div className="relative w-full h-[70vh] bg-neutral-950 flex items-center justify-center overflow-hidden">
                                                 <img src={photo.preview_url} alt={photo.title} className="absolute inset-0 w-full h-full object-cover filter blur-md opacity-40 scale-110 select-none pointer-events-none" />
                                                 <img src={photo.preview_url} alt={photo.title} className="relative z-10 w-full h-full object-contain" />
                                             </div>
                                         ) : (
                                             <WatermarkedImage src={photo.preview_url} alt={photo.title} className="w-full h-[70vh]" containWithBlur={true} />
                                         )
                                     )}
                                </div>
                                {photo.media_type === 'video' && !hasPurchased && (
                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center space-x-2 text-sm shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                        </svg>
                                        <span className="font-medium">O vídeo de prévia está sem áudio. O som original completo será ativado no arquivo final após a compra.</span>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            {loadingPhoto ? (
                                <div className="animate-pulse">
                                    <div className="h-8 bg-neutral-200 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-neutral-200 rounded w-1/4 mb-6"></div>
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 mr-3"></div>
                                        <div>
                                            <div className="h-3 bg-neutral-200 rounded w-20 mb-2"></div>
                                            <div className="h-4 bg-neutral-200 rounded w-32"></div>
                                        </div>
                                    </div>
                                    <div className="h-64 bg-neutral-200 rounded-xl mb-6"></div>
                                </div>
                            ) : photo ? (
                                <>
                                    <h1 className="text-3xl font-display font-bold text-primary-dark mb-2">{photo.title}</h1>

                                    {photo.width && photo.height && (
                                        <p className="text-sm text-neutral-500 font-mono mb-4">{photo.width} x {photo.height}</p>
                                    )}

                                    {loadingSecondary ? (
                                        <div className="flex items-center mb-6 animate-pulse">
                                            <div className="w-10 h-10 rounded-full bg-neutral-200 mr-3"></div>
                                            <div>
                                                <div className="h-3 bg-neutral-200 rounded w-20 mb-2"></div>
                                                <div className="h-4 bg-neutral-200 rounded w-32"></div>
                                            </div>
                                        </div>
                                    ) : photographer && (
                                        <div className="flex items-center mb-6">
                                            <img
                                                src={photographer.avatar_url || getAvatarFallbackUrl(photographer.name, 40)}
                                                alt={photographer.name}
                                                className="w-10 h-10 rounded-full object-cover mr-3 border border-neutral-200"
                                                onError={(e) => { e.currentTarget.src = getAvatarFallbackUrl(photographer.name, 40); }}
                                            />
                                            <div>
                                                <p className="text-sm text-neutral-500">Fotografia por</p>
                                                <p className="font-medium text-neutral-800">{photographer.name}</p>
                                            </div>
                                        </div>
                                    )}

                            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-6">
                                {loadingSecondary ? (
                                    <div className="animate-pulse">
                                        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
                                        <div className="h-12 bg-neutral-200 rounded-full w-full mb-3"></div>
                                    </div>
                                ) : hasPurchased ? (
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
                                            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    Leve mais, pague menos!
                                                </p>
                                                <ul className="space-y-1">
                                                    {[...photographer.bulkDiscountRules]
                                                        .sort((a, b) => a.minQuantity - b.minQuantity)
                                                        .map((rule, idx) => {
                                                            let label = `${rule.minQuantity} fotos`;
                                                            if (rule.minQuantity === 2) label = "2 a 4 fotos";
                                                            else if (rule.minQuantity === 5) label = "5 a 9 fotos";
                                                            else if (rule.minQuantity === 10) label = "10 fotos ou mais";

                                                            return (
                                                                <li key={idx} className="text-sm text-primary-dark flex justify-between">
                                                                    <span>{label}</span>
                                                                    <span className="font-bold">{rule.discountPercent}% OFF</span>
                                                                </li>
                                                            );
                                                        })
                                                    }
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
                                        <span>Resolução:</span><span className="font-medium text-neutral-700">{photo.width && photo.height ? `${photo.width} x ${photo.height}` : photo.resolution}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Formato:</span><span className="font-medium text-neutral-700">{photo.media_type === 'video' ? 'MP4 / WEBM' : 'JPG / RAW'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tamanho:</span>
                                        <span className="font-medium text-neutral-700">
                                            {photo.file_size_bytes 
                                                ? (photo.file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' 
                                                : 'Desconhecido'}
                                        </span>
                                    </div>
                                    {photo.media_type === 'video' && photo.video_duration && (
                                        <div className="flex justify-between">
                                            <span>Duração:</span><span className="font-medium text-neutral-700">{photo.video_duration} s</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Licença:</span><span className="font-medium text-neutral-700">Royalty-Free</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-lg font-display font-bold text-primary-dark mb-2">Descrição</h3>
                                <p className="text-neutral-600 leading-relaxed mb-4">{photo.description || "Sem descrição disponível para esta imagem."}</p>
                                
                                <div className="pt-4 border-t border-neutral-200">
                                    <p className="text-sm font-medium text-neutral-500 mb-3">Compartilhar esta foto:</p>
                                    <button
                                        onClick={() => shareContent(
                                            'Foto no FotoClic',
                                            `Confira esta foto incrível no FotoClic`,
                                            window.location.href
                                        )}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-full transition-all shadow-md active:scale-95"
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        {navigator.share ? 'Compartilhar' : 'WhatsApp'}
                                    </button>
                                </div>
                            </div>
                            </>
                        ) : null}
                        </div>
                    </div>
                </div>
            </div>
            
            {!loadingPhoto && photo && (
                <FloatingShareButton 
                    title={photo.title}
                    text={`Confira esta foto de ${photographer?.name || 'FotoClic'} no FotoClic`}
                    url={window.location.href}
                />
            )}

            {/* Sticky Mobile CTA */}
            {!loadingPhoto && photo && !hasPurchased && !loadingSecondary && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Preço</span>
                        <span className="text-xl font-display font-bold text-primary">R$ {photo.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button 
                        onClick={handleAddToCartClick}
                        className="flex-1 py-3 bg-primary text-white font-bold rounded-full shadow-lg active:scale-95 transition-transform text-center"
                    >
                        Adicionar ao Carrinho
                    </button>
                </div>
            )}
        </div>
    );
};

export default PhotoDetailPage;


