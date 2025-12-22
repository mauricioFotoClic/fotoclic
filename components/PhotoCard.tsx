
import React, { useState, useEffect } from 'react';
import { Photo, User, Page } from '../types';
import WatermarkedImage from './WatermarkedImage';
import api from '../services/api';

interface PhotoCardProps {
    photo: Photo;
    photographer?: User;
    onNavigate?: (page: Page) => void;
    onAddToCart?: (photoId: string, imgElement?: HTMLImageElement) => void;
    currentUser?: User | null;
    loading?: "lazy" | "eager";
}

const ShoppingCartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
);

const HeartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);


const PhotoCard: React.FC<PhotoCardProps> = ({ photo, photographer, onNavigate, onAddToCart, currentUser, loading }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(photo.likes);
    const [animateLike, setAnimateLike] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100);
        // Check if current user has liked this photo (needs initial data population from API or parent)
        if (currentUser && photo.liked_by_users && photo.liked_by_users.includes(currentUser.id)) {
            setIsLiked(true);
        }
        return () => clearTimeout(timer);
    }, [currentUser, photo]);

    const handleDetailsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onNavigate) {
            onNavigate({ name: 'photo-detail', id: photo.id });
        }
    };

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAddToCart) {
            // Try to find the image element within this card for the flying animation
            const imgElement = e.currentTarget.closest('.group')?.querySelector('img') as HTMLImageElement;
            onAddToCart(photo.id, imgElement);
        }
    };

    const handleLikeClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            // alert("Você precisa estar logado para curtir fotos.");
            if (onNavigate) onNavigate({
                name: 'login',
                toastMessage: "Faça login para curtir esta foto.",
                toastType: 'info'
            });
            return;
        }

        // Optimistic update
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikesCount(prev => newStatus ? prev + 1 : prev - 1);

        if (newStatus) {
            setAnimateLike(true);
            setTimeout(() => setAnimateLike(false), 300);
        }

        try {
            await api.toggleLike(photo.id, currentUser.id);
        } catch (error) {
            // Revert on error
            setIsLiked(!newStatus);
            setLikesCount(prev => newStatus ? prev - 1 : prev + 1);
            console.error("Failed to toggle like", error);
        }
    };

    return (
        <div className={`group relative overflow-hidden rounded-lg shadow-md bg-white transition-all duration-700 ease-out hover:shadow-xl ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="cursor-pointer overflow-hidden h-48" onClick={handleDetailsClick}>
                <WatermarkedImage
                    src={photo.preview_url}
                    alt={photo.title}
                    loading={loading}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </div>
            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                <button
                    onClick={handleLikeClick}
                    className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-white text-red-500' : 'bg-white/80 text-neutral-700 hover:bg-white hover:text-red-500'}`}
                    title={isLiked ? "Descurtir" : "Amei"}
                >
                    <HeartIcon className={`w-5 h-5 transition-transform ${isLiked ? 'fill-current' : ''} ${animateLike ? 'scale-125' : 'scale-100'}`} />
                </button>
                <button
                    onClick={handleAddToCartClick}
                    className="bg-white/80 p-2 rounded-full text-neutral-700 hover:bg-white hover:text-primary transition-colors"
                    title="Adicionar ao Carrinho"
                >
                    <ShoppingCartIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3
                        className="font-display font-semibold text-md text-primary-dark truncate cursor-pointer hover:text-primary transition-colors flex-grow pr-2"
                        onClick={handleDetailsClick}
                    >
                        {photo.title}
                    </h3>
                    {likesCount > 0 && (
                        <div className="flex items-center text-xs text-neutral-400 mt-1">
                            <HeartIcon className="w-3 h-3 mr-1 fill-current text-red-400" />
                            {likesCount}
                        </div>
                    )}
                </div>

                {photo.width && photo.height && (
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                        {photo.width} x {photo.height}
                    </p>
                )}

                {photographer && (
                    <div className="flex items-center mt-2">
                        <img
                            src={photographer.avatar_url}
                            alt={photographer.name}
                            className="w-6 h-6 rounded-full object-cover mr-2"
                        />
                        <p className="text-sm text-neutral-500 truncate">{photographer.name}</p>
                    </div>
                )}
                <div className="flex justify-between items-center mt-4">
                    <p className="text-lg font-display font-bold text-primary">R${photo.price.toFixed(2).replace('.', ',')}</p>
                    <button
                        onClick={handleDetailsClick}
                        className="text-sm font-medium text-primary hover:underline focus:outline-none"
                    >
                        Ver Detalhes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhotoCard;
