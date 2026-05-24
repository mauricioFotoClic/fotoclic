
import React, { useEffect, useState, useRef } from 'react';
import { Photo, User } from '../types';
import api from '../services/api';
import Spinner from './Spinner';
import Modal from './Modal';
import WatermarkedImage from './WatermarkedImage';
import { getOptimizedImageUrl } from '../utils/imageOptimization';

interface PhotoDetailModalProps {
    photoId: string;
    onClose: () => void;
    onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
    onBuy: (photoId: string) => void;
}

const PhotoDetailModal: React.FC<PhotoDetailModalProps> = ({ photoId, onClose, onAddToCart, onBuy }) => {
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [photographer, setPhotographer] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
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
                }
            } catch (error) {
                console.error("Failed to load photo details", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [photoId]);

    // Helper to find image for animation
    const getImageElement = (): HTMLImageElement | undefined => {
        if (imgContainerRef.current) {
            const img = imgContainerRef.current.querySelector('img');
            return img || undefined;
        }
        return undefined;
    };

    if (!photoId) return null;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="2xl"
            title={photo?.title || "Detalhes da Foto"}
            noPadding={true}
        >
            {loading ? (
                <div className="p-12">
                    <Spinner />
                </div>
            ) : !photo ? (
                <div className="p-8 text-center">
                    <p className="text-neutral-500">Foto não encontrada.</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row">
                    <div ref={imgContainerRef} className="lg:w-2/3 bg-neutral-100 flex flex-col items-center justify-center p-4 min-h-[300px] lg:min-h-[500px] w-full">
                        {photo.media_type === 'video' ? (
                            <div className="w-full space-y-3">
                                <div className="relative overflow-hidden select-none bg-neutral-100 w-full aspect-video rounded-lg" onContextMenu={(e) => e.preventDefault()}>
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
                                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center space-x-2 text-xs shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                    <span className="font-medium">O vídeo de prévia está sem áudio. O som original completo será ativado no arquivo final após a compra.</span>
                                </div>
                            </div>
                        ) : (
                            <WatermarkedImage
                                src={getOptimizedImageUrl(photo.preview_url, 1200, 85)}
                                alt={photo.title}
                                className="w-full h-auto max-h-[70vh] object-contain shadow-sm rounded-lg"
                            />
                        )}
                    </div>

                    <div className="lg:w-1/3 p-6 flex flex-col h-full">
                        {photographer && (
                            <div className="flex items-center mb-6 pb-6 border-b border-neutral-100">
                                <img
                                    src={photographer.avatar_url}
                                    alt={photographer.name}
                                    className="w-12 h-12 rounded-full object-cover mr-3 border border-neutral-200"
                                />
                                <div>
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Fotografia por</p>
                                    <p className="font-semibold text-neutral-900">{photographer.name}</p>
                                </div>
                            </div>
                        )}

                        <div className="mb-6 flex-grow">
                            <h3 className="text-sm font-bold text-neutral-900 mb-2">Descrição</h3>
                            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                                {photo.description || "Sem descrição disponível."}
                            </p>

                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {photo.tags.map((tag, index) => (
                                    <span key={index} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-xs">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <div className="space-y-2 text-xs text-neutral-500">
                                <div className="flex justify-between">
                                    <span>Resolução</span>
                                    <span className="font-medium text-neutral-800">{photo.resolution}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Licença</span>
                                    <span className="font-medium text-neutral-800">Royalty-Free</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Upload</span>
                                    <span className="font-medium text-neutral-800">{new Date(photo.upload_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <div className="flex items-end justify-between mb-4">
                                <span className="text-neutral-500 text-sm">Preço</span>
                                <span className="text-3xl font-display font-bold text-primary">
                                    R$ {photo.price.toFixed(2).replace('.', ',')}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => onAddToCart(photo.id, getImageElement())}
                                    className="w-full py-3 bg-primary text-white font-bold rounded-full shadow-lg hover:bg-opacity-90 transition-transform transform active:scale-95"
                                >
                                    Adicionar ao Carrinho
                                </button>
                                <button
                                    onClick={() => onBuy(photo.id)}
                                    className="w-full py-3 bg-white text-primary border-2 border-primary font-bold rounded-full hover:bg-primary hover:text-white transition-colors"
                                >
                                    Comprar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default PhotoDetailModal;


