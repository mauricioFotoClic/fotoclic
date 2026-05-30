import React, { useState, useEffect } from 'react';
import { Page } from '../types';

interface CookieBannerProps {
    onNavigate: (page: Page) => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onNavigate }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('fotoclic-cookie-consent');
        if (!consent) {
            // Pequeno atraso para carregar suavemente após a renderização da página
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('fotoclic-cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('fotoclic-cookie-consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100] animate-fade-in-up">
            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                            <path d="M8.5 8.5v.01" />
                            <path d="M16 15.5v.01" />
                            <path d="M12 18v.01" />
                            <path d="M11 13v.01" />
                            <path d="M7 14v.01" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-display font-bold text-neutral-900 dark:text-white text-base">
                            Nós respeitamos sua privacidade
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                            Usamos cookies para melhorar sua experiência, analisar tráfego e personalizar conteúdos de acordo com a LGPD. Ao continuar, você concorda com nossa{' '}
                            <button
                                onClick={() => onNavigate({ name: 'privacy' })}
                                className="text-primary hover:underline font-semibold focus:outline-none"
                            >
                                Política de Privacidade
                            </button>
                            .
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center justify-end w-full">
                    <button
                        onClick={handleDecline}
                        className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all focus:outline-none"
                    >
                        Rejeitar
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-full shadow-md transition-all active:scale-95 focus:outline-none"
                    >
                        Aceitar tudo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieBanner;
