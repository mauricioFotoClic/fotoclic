import React, { useEffect, useState } from 'react';
import { Page } from '../types';
import Spinner from '../components/Spinner';

interface CheckoutSuccessPageProps {
    onNavigate: (page: Page) => void;
}

const CheckoutSuccessPage: React.FC<CheckoutSuccessPageProps> = ({ onNavigate }) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        // Remove cart items from local storage because the purchase was successful
        localStorage.removeItem('cartItems');

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onNavigate({ name: 'customer-dashboard' });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onNavigate]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-neutral-50 animate-fadeIn">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4 text-center">
                Pagamento Confirmado!
            </h1>
            
            <p className="text-neutral-600 text-center max-w-md mb-8">
                Muito obrigado pela sua compra. Seu pagamento foi registrado com sucesso. 
                As fotos compradas já estão sendo processadas e liberadas no seu painel.
            </p>
            
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                <button
                    onClick={() => onNavigate({ name: 'customer-dashboard' })}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary-dark transition-all"
                >
                    Ir para Minhas Compras
                </button>
                
                <p className="text-sm text-neutral-400 flex items-center gap-2">
                    <Spinner size="sm" /> 
                    Redirecionando em {countdown} segundos...
                </p>
            </div>
        </div>
    );
};

export default CheckoutSuccessPage;


