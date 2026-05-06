
import React from 'react';
import { shareContent } from '../utils/share';

interface FloatingShareButtonProps {
    title: string;
    text: string;
    url: string;
}

const FloatingShareButton: React.FC<FloatingShareButtonProps> = ({ title, text, url }) => {
    return (
        <button
            onClick={() => shareContent(title, text, url)}
            className="md:hidden fixed bottom-24 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Compartilhar"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
        </button>
    );
};

export default FloatingShareButton;
