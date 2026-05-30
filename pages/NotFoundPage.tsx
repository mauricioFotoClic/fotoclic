import React from 'react';
import { Page } from '../types';

interface NotFoundPageProps {
    onNavigate: (page: Page) => void;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
    return (
        <div className="bg-neutral-50 min-h-[70vh] flex items-center justify-center py-20 px-4">
            <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
                <div className="inline-flex p-4 rounded-full bg-orange-50 text-orange-500 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">404</h1>
                <h2 className="text-xl font-bold text-neutral-800 mb-4">Página Não Encontrada</h2>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                    Ops! O endereço que você tentou acessar não existe ou foi movido para outro local.
                </p>
                <button
                    onClick={() => onNavigate({ name: 'home' })}
                    className="inline-flex items-center px-8 py-3 bg-orange-600 text-white font-semibold rounded-full hover:bg-orange-700 transition-colors shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Voltar para o Início
                </button>
            </div>
        </div>
    );
};

export default NotFoundPage;
