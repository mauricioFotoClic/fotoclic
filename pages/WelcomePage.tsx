import React, { useEffect, useState } from 'react';
import { Page, PageRoute } from '../types';
import Logo from '../components/Logo';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface WelcomePageProps {
    onNavigate: (page: Page) => void;
    role?: 'photographer' | 'customer' | 'pending-approval';
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onNavigate, role = 'customer' }) => {
    const [secondsLeft, setSecondsLeft] = useState(5);

    const onNavigateRef = React.useRef(onNavigate);
    const roleRef = React.useRef(role);

    useEffect(() => {
        onNavigateRef.current = onNavigate;
    }, [onNavigate]);

    useEffect(() => {
        roleRef.current = role;
    }, [role]);

    // Determina o destino correto com base na role recebida
    const getTargetRoute = (): PageRoute => {
        switch (roleRef.current) {
            case 'photographer':
                return { name: 'photographer' };
            case 'pending-approval':
                return { name: 'pending-approval' };
            case 'customer':
            default:
                return { name: 'home' };
        }
    };

    useEffect(() => {
        const win = window as any;

        // Envia evento para o dataLayer (Google Ads / Analytics) se disponível
        if (win.dataLayer) {
            win.dataLayer.push({
                event: 'registration_success',
                user_role: roleRef.current
            });
        }

        // Dispara a conversão específica do Google Ads somente se for cadastro de fotógrafo
        if (win.gtag && (roleRef.current === 'photographer' || roleRef.current === 'pending-approval')) {
            win.gtag('event', 'conversion', {
                'send_to': 'AW-16960525575/NqzgCKeRoskcEleqtJc_',
                'transport_type': 'beacon'
            });
            console.log("Google Ads conversion event sent for photographer!");
        }

        const interval = setInterval(() => {
            setSecondsLeft((prev) => prev - 1);
        }, 1000);

        const timeout = setTimeout(() => {
            const target = getTargetRoute();
            console.log("WelcomePage Redirecting to:", target);
            onNavigateRef.current(target);
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    const handleSkip = () => {
        onNavigate(getTargetRoute());
    };

    const getRoleMessage = () => {
        switch (role) {
            case 'photographer':
                return {
                    title: 'Cadastro Concluído!',
                    desc: 'Seja bem-vindo à nossa comunidade de fotógrafos. Prepare-se para decolar suas vendas!',
                    btnText: 'Ir para o Painel'
                };
            case 'pending-approval':
                return {
                    title: 'Cadastro Recebido!',
                    desc: 'Seja bem-vindo! Seus dados foram enviados para análise de moderação.',
                    btnText: 'Acompanhar Status'
                };
            case 'customer':
            default:
                return {
                    title: 'Cadastro Concluído!',
                    desc: 'Seja bem-vindo ao FotoClic! Sua conta está pronta e você já pode encontrar suas fotos.',
                    btnText: 'Acessar Home'
                };
        }
    };

    const message = getRoleMessage();

    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 relative overflow-hidden">
            {/* Background decorativo sutil */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-200/40 rounded-full blur-3xl -z-10"></div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-neutral-100 shadow-xl flex flex-col items-center text-center">
                {/* Logo */}
                <div className="mb-6">
                    <Logo size={44} useImage={true} />
                </div>

                {/* Ícone de Sucesso Animado */}
                <div className="mb-6 text-emerald-500 animate-bounce">
                    <CheckCircle2 size={64} className="stroke-[1.5]" />
                </div>

                {/* Textos */}
                <h1 className="text-3xl font-extrabold text-neutral-900 font-display mb-3 tracking-tight">
                    {message.title}
                </h1>
                <p className="text-neutral-500 text-sm leading-relaxed mb-8 max-w-sm">
                    {message.desc}
                </p>

                {/* Contador de redirecionamento circular */}
                <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Círculo de fundo */}
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            className="stroke-neutral-100 fill-none"
                            strokeWidth="6"
                        />
                        {/* Círculo de progresso */}
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            className="stroke-primary fill-none transition-all duration-1000 ease-linear"
                            strokeWidth="6"
                            strokeDasharray="251.2" // 2 * PI * 40
                            strokeDashoffset={251.2 - (secondsLeft / 5) * 251.2}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-neutral-800 font-display">{secondsLeft}s</span>
                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Redirecionando</span>
                    </div>
                </div>

                {/* Botão de ação rápida */}
                <button
                    onClick={handleSkip}
                    className="w-full py-3.5 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-neutral-900/10 flex items-center justify-center gap-2 hover:gap-3 group"
                >
                    {message.btnText}
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
};

export default WelcomePage;
