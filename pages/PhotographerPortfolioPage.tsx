
import React, { useEffect, useState } from 'react';
import { User, Page } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import PhotographerPortfolioPreview from '../components/photographer/PhotographerPortfolioPreview';
import SEO from '../components/SEO';

interface PhotographerPortfolioPageProps {
    photographerId: string;
    onNavigate: (page: Page) => void;
    onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
    currentUser?: User | null;
}

const PhotographerPortfolioPage: React.FC<PhotographerPortfolioPageProps> = ({ photographerId, onNavigate, onAddToCart, currentUser }) => {
    const [photographer, setPhotographer] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPhotographer = async () => {
            try {
                setLoading(true);
                const data = await api.getPhotographerById(photographerId);
                // Only show if user exists AND is active
                if (data && data.is_active) {
                    setPhotographer(data);
                } else {
                    setPhotographer(null);
                }
            } catch (error) {
                console.error("Failed to fetch photographer", error);
            } finally {
                setLoading(false);
            }
        };
        loadPhotographer();
    }, [photographerId]);

    if (loading) {
        return (
            <div className="bg-neutral-100 min-h-screen py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center text-sm text-neutral-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Voltar
                    </div>
                    {/* Skeleton Layout for Portfolio Header */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-12 animate-pulse">
                        <div className="h-48 md:h-64 w-full bg-neutral-200"></div>
                        <div className="px-6 pb-8 md:px-12 md:pb-12 relative flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
                            <div className="-mt-16 md:-mt-24 relative z-10 p-1.5 bg-white rounded-full">
                                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-neutral-200"></div>
                            </div>
                            <div className="flex-1 mt-4 md:mt-6 w-full">
                                <div className="h-8 bg-neutral-200 w-1/3 rounded mb-4 mx-auto md:mx-0"></div>
                                <div className="h-4 bg-neutral-200 w-1/2 rounded mb-2 mx-auto md:mx-0"></div>
                                <div className="h-4 bg-neutral-200 w-1/4 rounded mx-auto md:mx-0"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!photographer) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-display font-bold text-neutral-800">Fotógrafo não encontrado ou inativo.</h2>
                <p className="text-neutral-600 mt-2">O perfil que você está procurando não está disponível no momento.</p>
                <button
                    onClick={() => onNavigate({ name: 'home' })}
                    className="mt-4 px-6 py-2 bg-primary text-white rounded-full hover:bg-opacity-90"
                >
                    Voltar para a Home
                </button>
            </div>
        );
    }

    return (
        <div className="bg-neutral-100 min-h-screen py-8">
            <SEO
                title={`Portfólio de ${photographer.name}`}
                description={photographer.bio || `Confira o portfólio de ${photographer.name} e compre suas melhores fotos.`}
                image={photographer.avatar_url}
                url={`https://fotoclic.com.br/portfolio/${photographer.id}`}
                type="profile"
            />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => onNavigate({ name: 'home' })}
                    className="mb-6 flex items-center text-sm text-neutral-600 hover:text-primary transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Voltar
                </button>

                {/* Reuse the preview component which handles the portfolio layout logic */}
                <PhotographerPortfolioPreview
                    user={photographer}
                    onNavigate={onNavigate}
                    editable={false}
                    onAddToCart={onAddToCart}
                    currentUser={currentUser}
                />
            </div>
        </div>
    );
};

export default PhotographerPortfolioPage;


