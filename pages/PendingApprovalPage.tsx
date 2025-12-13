
import React, { useEffect, useState } from 'react';
import { Page } from '../types';

interface PendingApprovalPageProps {
    onNavigate: (page: Page) => void;
}

const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onNavigate }) => {
    const [timeLeft, setTimeLeft] = useState(20);

    useEffect(() => {
        if (timeLeft === 0) {
            onNavigate({ name: 'home' });
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onNavigate]);

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                 <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
                 <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-secondary/5 rounded-full blur-[150px]"></div>
            </div>

            <div className="max-w-2xl text-center relative z-10">
                <div className="mb-8 inline-block p-6 rounded-full bg-green-50 shadow-sm">
                     <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-6">
                    Cadastro Recebido com Sucesso!
                </h1>
                
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed">
                    Estamos preparando seu palco. No <span className="font-bold text-primary">FotoClic</span>, cada fotógrafo passa por uma curadoria dedicada para garantir que sua arte receba o destaque e valorização que merece.
                </p>

                <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-100 shadow-sm mb-8">
                    <h3 className="text-lg font-bold text-neutral-800 mb-2">O que acontece agora?</h3>
                    <p className="text-neutral-600">
                        Sua conta entrou em nosso processo de moderacão. Nossa equipe analisará seu perfil e, assim que aprovado, você receberá um e-mail de boas-vindas liberando seu acesso total ao painel para começar a vender.
                    </p>
                </div>

                <div className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-2">
                    Redirecionando em
                </div>
                <div className="text-5xl font-display font-bold text-primary mb-8">
                    {timeLeft}s
                </div>

                <button 
                    onClick={() => onNavigate({ name: 'home' })}
                    className="px-8 py-3 bg-white border border-neutral-200 text-neutral-600 font-medium rounded-full hover:bg-neutral-50 hover:border-neutral-300 transition-all"
                >
                    Ir para a Home agora
                </button>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
