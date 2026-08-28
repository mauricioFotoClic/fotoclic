import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Photo, User } from '../types';
import api from '../services/api';
import Spinner from './Spinner';
import WatermarkedImage from './WatermarkedImage';
import { getOptimizedImageUrl } from '../utils/imageOptimization';
import { getAvatarFallbackUrl } from '../utils/stringUtils';

interface PhotoDetailModalProps {
    photoId?: string;
    photos?: Photo[];
    currentIndex?: number;
    onNavigatePhoto?: (newIndex: number) => void;
    onClose: () => void;
    onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
    onBuy: (photoId: string) => void;
    cartItems?: string[];
    currentUser?: User | null;
}

const PhotoDetailModal: React.FC<PhotoDetailModalProps> = ({
    photoId: initialPhotoId,
    photos = [],
    currentIndex: initialIndex = 0,
    onNavigatePhoto,
    onClose,
    onAddToCart,
    onBuy,
    cartItems = [],
    currentUser
}) => {
    const isGalleryMode = photos.length > 0;
    const [localIndex, setLocalIndex] = useState<number>(initialIndex);
    const activeIndex = isGalleryMode ? (onNavigatePhoto ? initialIndex : localIndex) : 0;

    // Current active photo
    const currentPhotoFromList = isGalleryMode && photos[activeIndex] ? photos[activeIndex] : null;
    const activePhotoId = currentPhotoFromList?.id || initialPhotoId || '';

    const [photo, setPhoto] = useState<Photo | null>(currentPhotoFromList);
    const [photographer, setPhotographer] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(!currentPhotoFromList);
    const [photographerCache, setPhotographerCache] = useState<Record<string, User>>({});

    // Likes state
    const [isLiked, setIsLiked] = useState<boolean>(false);
    const [likesCount, setLikesCount] = useState<number>(0);
    const [animateLike, setAnimateLike] = useState<boolean>(false);
    const [localAddedToCart, setLocalAddedToCart] = useState<Record<string, boolean>>({});

    // Touch swipe refs
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const imgContainerRef = useRef<HTMLDivElement>(null);
    const thumbnailsRef = useRef<HTMLDivElement>(null);

    // Sync active photo when index or list changes
    useEffect(() => {
        if (isGalleryMode && photos[activeIndex]) {
            const p = photos[activeIndex];
            setPhoto(p);
            setLikesCount(p.likes || 0);
            setIsLiked(Boolean(currentUser && p.liked_by_users && p.liked_by_users.includes(currentUser.id)));
        }
    }, [activeIndex, isGalleryMode, photos, currentUser]);

    // Scroll active thumbnail into view
    useEffect(() => {
        if (thumbnailsRef.current) {
            const activeThumb = thumbnailsRef.current.querySelector(`[data-thumb-index="${activeIndex}"]`) as HTMLElement;
            if (activeThumb) {
                activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeIndex]);

    // Fetch photo details if not supplied in photos list
    useEffect(() => {
        let isMounted = true;

        const loadPhotoDetails = async () => {
            if (!activePhotoId) return;

            // If we don't have the photo or need full data
            if (!currentPhotoFromList) {
                try {
                    setLoading(true);
                    const photoData = await api.getPhotoById(activePhotoId);
                    if (isMounted && photoData) {
                        setPhoto(photoData);
                        setLikesCount(photoData.likes || 0);
                        if (currentUser && photoData.liked_by_users && photoData.liked_by_users.includes(currentUser.id)) {
                            setIsLiked(true);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load photo details", error);
                } finally {
                    if (isMounted) setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        loadPhotoDetails();

        return () => {
            isMounted = false;
        };
    }, [activePhotoId, currentPhotoFromList, currentUser]);

    // Fetch photographer data with memory cache
    useEffect(() => {
        let isMounted = true;
        const targetPhotographerId = photo?.photographer_id;

        if (!targetPhotographerId) {
            setPhotographer(null);
            return;
        }

        if (photographerCache[targetPhotographerId]) {
            setPhotographer(photographerCache[targetPhotographerId]);
            return;
        }

        const loadPhotographer = async () => {
            try {
                const photographerData = await api.getPhotographerById(targetPhotographerId);
                if (isMounted && photographerData) {
                    setPhotographer(photographerData);
                    setPhotographerCache(prev => ({ ...prev, [targetPhotographerId]: photographerData }));
                }
            } catch (error) {
                console.error("Failed to load photographer", error);
            }
        };

        loadPhotographer();

        return () => {
            isMounted = false;
        };
    }, [photo?.photographer_id, photographerCache]);

    // Preload next and prev images for lightning fast navigation
    useEffect(() => {
        if (!isGalleryMode || photos.length <= 1) return;

        const preloadIndexes = [activeIndex - 1, activeIndex + 1].filter(
            idx => idx >= 0 && idx < photos.length
        );

        preloadIndexes.forEach(idx => {
            const nextPhoto = photos[idx];
            if (nextPhoto && nextPhoto.preview_url) {
                const img = new Image();
                img.src = getOptimizedImageUrl(nextPhoto.preview_url, 1400, 85);
            }
        });
    }, [activeIndex, isGalleryMode, photos]);

    // Cloudflare Stream Video Player initialization
    useEffect(() => {
        if (!photo || photo.media_type !== 'video') return;

        let active = true;
        let cleanupFn: (() => void) | undefined = undefined;

        const initPlayer = () => {
            if (!active) return;
            const iframe = document.querySelector('iframe[src*="videodelivery.net"]');
            if (iframe && (window as any).Stream) {
                try {
                    const player = (window as any).Stream(iframe);
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

                    return () => {
                        try {
                            player.removeEventListener('volumechange', handleVolumeChange);
                            player.removeEventListener('play', handleVolumeChange);
                        } catch (e) {
                            console.warn("Error removing stream listeners:", e);
                        }
                    };
                } catch (err) {
                    console.error("Erro ao inicializar SDK do Cloudflare Stream:", err);
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
                }, 400);
            };
            document.body.appendChild(script);
        } else {
            cleanupFn = initPlayer();
        }

        return () => {
            active = false;
            if (cleanupFn) cleanupFn();
        };
    }, [photo]);

    // Navigation functions
    const goToIndex = useCallback((newIndex: number) => {
        if (!isGalleryMode) return;
        if (newIndex < 0 || newIndex >= photos.length) return;

        if (onNavigatePhoto) {
            onNavigatePhoto(newIndex);
        } else {
            setLocalIndex(newIndex);
        }
    }, [isGalleryMode, onNavigatePhoto, photos.length]);

    const handlePrev = useCallback(() => {
        if (activeIndex > 0) {
            goToIndex(activeIndex - 1);
        }
    }, [activeIndex, goToIndex]);

    const handleNext = useCallback(() => {
        if (activeIndex < photos.length - 1) {
            goToIndex(activeIndex + 1);
        }
    }, [activeIndex, photos.length, goToIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrev, handleNext, onClose]);

    // Touch Swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const diffX = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;

        if (diffX > minSwipeDistance) {
            handleNext();
        } else if (diffX < -minSwipeDistance) {
            handlePrev();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    // Helper to find image element for cart animation
    const getImageElement = (): HTMLImageElement | undefined => {
        if (imgContainerRef.current) {
            const img = imgContainerRef.current.querySelector('img');
            return img || undefined;
        }
        return undefined;
    };

    // Like / Favorite toggle
    const handleToggleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!photo) return;

        if (!currentUser) {
            alert("Você precisa estar conectado para curtir fotos.");
            return;
        }

        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikesCount(prev => (newStatus ? prev + 1 : Math.max(0, prev - 1)));

        if (newStatus) {
            setAnimateLike(true);
            setTimeout(() => setAnimateLike(false), 300);
        }

        try {
            await api.toggleLike(photo.id, currentUser.id);
        } catch (error) {
            // Revert on error
            setIsLiked(!newStatus);
            setLikesCount(prev => (newStatus ? Math.max(0, prev - 1) : prev + 1));
            console.error("Failed to toggle like", error);
        }
    };

    // Add to Cart handler
    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!photo) return;

        setLocalAddedToCart(prev => ({ ...prev, [photo.id]: true }));
        onAddToCart(photo.id, getImageElement());
    };

    const isCurrentPhotoInCart = photo ? (cartItems.includes(photo.id) || localAddedToCart[photo.id]) : false;

    if (!activePhotoId && !photo) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col bg-neutral-950/95 backdrop-blur-md text-white select-none animate-fadeIn transition-opacity duration-200"
            onClick={onClose}
        >
            {/* ── Top Header Bar ────────────────────────────────────────── */}
            <header 
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-neutral-900/60 backdrop-blur-lg flex-shrink-0 z-30"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center space-x-3 min-w-0 pr-4">
                    {isGalleryMode && (
                        <div className="px-3 py-1 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full text-xs font-semibold tracking-wider text-neutral-300 whitespace-nowrap">
                            {activeIndex + 1} / {photos.length}
                        </div>
                    )}
                    <h2 className="text-sm sm:text-base font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                        {photo?.title || "Visualizar Foto"}
                    </h2>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Botão de Favoritar (❤️) */}
                    {photo && (
                        <button
                            onClick={handleToggleLike}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                isLiked
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                                    : 'bg-white/10 text-neutral-300 hover:bg-white/20 border border-white/10'
                            }`}
                            title={isLiked ? "Descurtir" : "Curtir foto"}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`w-4 h-4 transition-transform duration-300 ${
                                    isLiked ? 'fill-current text-red-500' : 'fill-none stroke-current'
                                } ${animateLike ? 'scale-130' : 'scale-100'}`}
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {likesCount > 0 && <span className="font-semibold">{likesCount}</span>}
                        </button>
                    )}

                    {/* Botão de Fechar */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-white/10"
                        title="Fechar (Esc)"
                        aria-label="Fechar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ── Main Viewport Center Area ──────────────────────────────── */}
            <main 
                className="relative flex-1 flex flex-col lg:flex-row items-center justify-between overflow-hidden p-2 sm:p-4 gap-4"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Seta de Navegação Esquerda (Anterior) */}
                {isGalleryMode && (
                    <button
                        onClick={handlePrev}
                        disabled={activeIndex === 0}
                        aria-label="Foto anterior"
                        className={`absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl backdrop-blur-md ${
                            activeIndex === 0
                                ? 'opacity-0 pointer-events-none'
                                : 'bg-black/50 hover:bg-black/80 border border-white/20 text-white hover:scale-105 active:scale-95'
                        }`}
                        title="Foto anterior (Seta esquerda)"
                    >
                        <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Seta de Navegação Direita (Próxima) */}
                {isGalleryMode && (
                    <button
                        onClick={handleNext}
                        disabled={activeIndex === photos.length - 1}
                        aria-label="Próxima foto"
                        className={`absolute right-3 sm:right-6 lg:right-[380px] top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl backdrop-blur-md ${
                            activeIndex === photos.length - 1
                                ? 'opacity-0 pointer-events-none'
                                : 'bg-black/50 hover:bg-black/80 border border-white/20 text-white hover:scale-105 active:scale-95'
                        }`}
                        title="Próxima foto (Seta direita)"
                    >
                        <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* Área da Imagem / Vídeo */}
                <div 
                    ref={imgContainerRef}
                    className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative min-h-[280px]"
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-8">
                            <Spinner size="lg" label="Carregando foto..." />
                        </div>
                    ) : !photo ? (
                        <div className="p-8 text-center text-neutral-400">
                            Foto não encontrada.
                        </div>
                    ) : photo.media_type === 'video' ? (
                        <div className="w-full max-w-4xl space-y-3">
                            <div className="relative overflow-hidden select-none bg-black w-full aspect-video rounded-xl border border-white/10 shadow-2xl" onContextMenu={(e) => e.preventDefault()}>
                                <iframe
                                    src={`https://iframe.videodelivery.net/${photo.video_uid}?autoplay=true&loop=true&muted=true&preload=true&controls=true`}
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
                                            <span className="text-white font-display font-bold text-sm sm:text-base whitespace-nowrap drop-shadow-md select-none border-2 border-white/20 px-2 py-1 rounded-md">
                                                FotoClic Preview
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-2.5 bg-amber-950/70 border border-amber-500/30 text-amber-200 rounded-lg flex items-center space-x-2 text-xs shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>O vídeo de prévia está sem áudio. O som original em alta definição estará disponível no download após a compra.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative max-w-full max-h-[70vh] lg:max-h-[82vh] flex items-center justify-center">
                            <WatermarkedImage
                                src={getOptimizedImageUrl(photo.preview_url, 1600, 88)}
                                alt={photo.title}
                                className="w-auto h-auto max-w-full max-h-[65vh] lg:max-h-[78vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
                            />
                        </div>
                    )}
                </div>

                {/* ── Painel Lateral de Informações e Compra ─────────────────── */}
                <div className="w-full lg:w-96 bg-neutral-900/90 border border-white/10 rounded-2xl p-5 flex flex-col flex-shrink-0 shadow-2xl backdrop-blur-xl lg:max-h-[82vh] overflow-y-auto z-20">
                    {photographer && (
                        <div className="flex items-center pb-4 mb-4 border-b border-white/10">
                            <img
                                src={photographer.avatar_url || getAvatarFallbackUrl(photographer.name, 48)}
                                alt={photographer.name}
                                className="w-11 h-11 rounded-full object-cover mr-3 border border-white/20"
                                onError={(e) => { e.currentTarget.src = getAvatarFallbackUrl(photographer.name, 48); }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">Fotografia por</p>
                                <p className="font-semibold text-white truncate text-sm sm:text-base">{photographer.name}</p>
                            </div>
                        </div>
                    )}

                    {photo && (
                        <div className="space-y-4 mb-6 flex-grow text-xs sm:text-sm">
                            {photo.description && (
                                <div>
                                    <p className="text-neutral-300 leading-relaxed line-clamp-3">
                                        {photo.description}
                                    </p>
                                </div>
                            )}

                            {photo.tags && photo.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {photo.tags.map((tag, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 text-neutral-300 rounded text-[11px]">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2 text-xs text-neutral-400">
                                <div className="flex justify-between items-center">
                                    <span>Resolução:</span>
                                    <span className="font-mono text-neutral-200 font-medium">
                                        {photo.resolution || (photo.width && photo.height ? `${photo.width} x ${photo.height}` : 'Alta Definição')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Licença:</span>
                                    <span className="text-neutral-200 font-medium">Royalty-Free Digital</span>
                                </div>
                                {photo.sub_group && (
                                    <div className="flex justify-between items-center">
                                        <span>Pasta / Dia:</span>
                                        <span className="text-neutral-200 font-medium truncate max-w-[150px]">{photo.sub_group}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preço e Botões de Ação */}
                    {photo && (
                        <div className="mt-auto pt-3 border-t border-white/10 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <span className="text-neutral-400 text-xs uppercase tracking-wider font-semibold">Valor da Foto</span>
                                <span className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                                    R$ {photo.price.toFixed(2).replace('.', ',')}
                                </span>
                            </div>

                            <div className="space-y-2 pt-1">
                                <button
                                    onClick={handleAddToCartClick}
                                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-lg cursor-pointer ${
                                        isCurrentPhotoInCart
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                            : 'bg-primary hover:bg-primary-dark text-white hover:shadow-primary/30 active:scale-98'
                                    }`}
                                >
                                    {isCurrentPhotoInCart ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>No Carrinho ✓</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <circle cx="9" cy="21" r="1"></circle>
                                                <circle cx="20" cy="21" r="1"></circle>
                                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                            </svg>
                                            <span>Adicionar ao Carrinho</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => onBuy(photo.id)}
                                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
                                >
                                    Comprar Imediatamente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Bottom Mini Thumbnail Strip (Desktop & Tablet) ─────────── */}
            {isGalleryMode && photos.length > 1 && (
                <footer 
                    className="hidden sm:flex items-center px-4 py-2 border-t border-white/10 bg-neutral-900/80 backdrop-blur-md overflow-x-auto flex-shrink-0 z-30"
                    onClick={(e) => e.stopPropagation()}
                    ref={thumbnailsRef}
                >
                    <div className="flex items-center space-x-2 mx-auto py-1">
                        {photos.map((p, index) => {
                            const isSelected = index === activeIndex;
                            return (
                                <button
                                    key={p.id}
                                    data-thumb-index={index}
                                    onClick={() => goToIndex(index)}
                                    className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                                        isSelected 
                                            ? 'ring-2 ring-primary scale-110 opacity-100 shadow-md' 
                                            : 'opacity-50 hover:opacity-85 hover:scale-105'
                                    }`}
                                    title={p.title || `Foto ${index + 1}`}
                                >
                                    <img
                                        src={getOptimizedImageUrl(p.thumb_url || p.preview_url, 120, 60)}
                                        alt={p.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {p.media_type === 'video' && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </footer>
            )}
        </div>
    );
};

export default PhotoDetailModal;
