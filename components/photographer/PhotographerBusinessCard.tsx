import React, { useRef, useState } from 'react';
import { User } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import Logo from '../Logo';

interface PhotographerBusinessCardProps {
    user: User;
}

const PhotographerBusinessCard: React.FC<PhotographerBusinessCardProps> = ({ user }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    // Link para o portfólio público do fotógrafo (corrigido para /portfolio/)
    const publicUrl = `${window.location.origin}/portfolio/${user.id}`;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        
        try {
            setDownloading(true);
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(cardRef.current, { 
                quality: 1, 
                pixelRatio: 3,
                style: { transform: 'scale(1)', transformOrigin: 'top left' }
            });
            
            const link = document.createElement('a');
            link.download = `cartao-fotoclic-${user.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download image', err);
            alert('Não foi possível gerar a imagem. Tente novamente.');
        } finally {
            setDownloading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Portfólio de ${user.name}`,
                    text: `Veja meu portfólio de fotos no FotoClic!`,
                    url: publicUrl,
                });
            } catch (err) {
                console.error('Share failed', err);
            }
        } else {
            navigator.clipboard.writeText(publicUrl);
            alert('Link copiado para a área de transferência!');
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-display font-bold text-primary-dark">Seu Cartão Virtual</h2>
                <p className="text-neutral-500 mt-2">
                    Este é o seu QR Code oficial. Compartilhe-o para que clientes acessem seu portfólio instantaneamente.
                </p>
            </div>

            {/* Card Preview Container */}
            <div className="flex justify-center mb-8">
                <div 
                    ref={cardRef} 
                    className="relative w-[320px] h-[480px] rounded-[24px] overflow-hidden shadow-2xl bg-black flex flex-col border border-white/10"
                >
                    {/* SVG de Background de Alta Fidelidade (Garante renderização perfeita na tela e no download do PNG) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            {/* Brilhos Laranjas de Fundo */}
                            <radialGradient id="tr-glow" cx="320" cy="0" r="160" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#FF5C00" stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="bl-glow" cx="0" cy="480" r="160" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#FF5C00" stopOpacity="0" />
                            </radialGradient>

                            {/* Gradiente das Listras */}
                            <linearGradient id="tr-line-grad" x1="320" y1="0" x2="200" y2="120" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#FF5C00" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="bl-line-grad" x1="0" y1="480" x2="120" y2="360" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.75" />
                                <stop offset="100%" stopColor="#FF5C00" stopOpacity="0.0" />
                            </linearGradient>

                            {/* Máscara e Pattern do Pontilhado */}
                            <radialGradient id="tr-mask-grad" cx="320" cy="0" r="220" gradientUnits="userSpaceOnUse">
                                <stop offset="30%" stopColor="white" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="bl-mask-grad" cx="0" cy="480" r="220" gradientUnits="userSpaceOnUse">
                                <stop offset="30%" stopColor="white" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </radialGradient>
                            <mask id="dots-mask">
                                <rect width="320" height="480" fill="black" />
                                <circle cx="320" cy="0" r="220" fill="url(#tr-mask-grad)" />
                                <circle cx="0" cy="480" r="220" fill="url(#bl-mask-grad)" />
                            </mask>
                            <pattern id="dot-grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                <circle cx="5" cy="5" r="1.2" fill="#FF5C00" />
                            </pattern>
                        </defs>

                        {/* Brilhos */}
                        <rect width="320" height="480" fill="url(#tr-glow)" />
                        <rect width="320" height="480" fill="url(#bl-glow)" />

                        {/* Grid de Pontinhos */}
                        <rect width="320" height="480" fill="url(#dot-grid)" mask="url(#dots-mask)" />

                        {/* Listras do Topo Direito (Paralelas a 45 graus) */}
                        <line x1="290" y1="0" x2="320" y2="30" stroke="url(#tr-line-grad)" strokeWidth="8" />
                        <line x1="275" y1="0" x2="320" y2="45" stroke="url(#tr-line-grad)" strokeWidth="8" />
                        <line x1="260" y1="0" x2="320" y2="60" stroke="url(#tr-line-grad)" strokeWidth="8" />
                        <line x1="245" y1="0" x2="320" y2="75" stroke="url(#tr-line-grad)" strokeWidth="8" />
                        <line x1="230" y1="0" x2="320" y2="90" stroke="url(#tr-line-grad)" strokeWidth="6" />
                        <line x1="215" y1="0" x2="320" y2="105" stroke="url(#tr-line-grad)" strokeWidth="6" />
                        <line x1="200" y1="0" x2="320" y2="120" stroke="url(#tr-line-grad)" strokeWidth="5" />
                        <line x1="185" y1="0" x2="320" y2="135" stroke="url(#tr-line-grad)" strokeWidth="4" />
                        <line x1="170" y1="0" x2="320" y2="150" stroke="url(#tr-line-grad)" strokeWidth="3" />
                        <line x1="155" y1="0" x2="320" y2="165" stroke="url(#tr-line-grad)" strokeWidth="2.5" />
                        <line x1="140" y1="0" x2="320" y2="180" stroke="url(#tr-line-grad)" strokeWidth="2" />
                        <line x1="125" y1="0" x2="320" y2="195" stroke="url(#tr-line-grad)" strokeWidth="1.5" />
                        <line x1="110" y1="0" x2="320" y2="210" stroke="url(#tr-line-grad)" strokeWidth="1" />

                        {/* Listras da Base Esquerda (Paralelas a 45 graus) */}
                        <line x1="0" y1="450" x2="30" y2="480" stroke="url(#bl-line-grad)" strokeWidth="8" />
                        <line x1="0" y1="435" x2="45" y2="480" stroke="url(#bl-line-grad)" strokeWidth="8" />
                        <line x1="0" y1="420" x2="60" y2="480" stroke="url(#bl-line-grad)" strokeWidth="8" />
                        <line x1="0" y1="405" x2="75" y2="480" stroke="url(#bl-line-grad)" strokeWidth="8" />
                        <line x1="0" y1="390" x2="90" y2="480" stroke="url(#bl-line-grad)" strokeWidth="6" />
                        <line x1="0" y1="375" x2="105" y2="480" stroke="url(#bl-line-grad)" strokeWidth="6" />
                        <line x1="0" y1="360" x2="120" y2="480" stroke="url(#bl-line-grad)" strokeWidth="5" />
                        <line x1="0" y1="345" x2="135" y2="480" stroke="url(#bl-line-grad)" strokeWidth="4" />
                        <line x1="0" y1="330" x2="150" y2="480" stroke="url(#bl-line-grad)" strokeWidth="3" />
                        <line x1="0" y1="315" x2="165" y2="480" stroke="url(#bl-line-grad)" strokeWidth="2.5" />
                        <line x1="0" y1="300" x2="180" y2="480" stroke="url(#bl-line-grad)" strokeWidth="2" />
                        <line x1="0" y1="285" x2="195" y2="480" stroke="url(#bl-line-grad)" strokeWidth="1.5" />
                        <line x1="0" y1="270" x2="210" y2="480" stroke="url(#bl-line-grad)" strokeWidth="1" />
                    </svg>

                    <div className="relative z-10 flex flex-col h-full text-center text-white p-8">
                        
                        {/* Logo no Topo */}
                        <div className="flex justify-center mt-6">
                            <Logo size={28} useImage={true} dark={true} />
                        </div>

                        {/* Nome e Cargo */}
                        <div className="flex flex-col items-center mt-8">
                            <h3 className="text-3xl font-bold tracking-tight text-white">{user.name}</h3>
                            
                            {/* Linha separadora laranja idêntica ao mockup */}
                            <div className="w-20 h-[1.5px] bg-[#FF5C00] my-4"></div>
                            
                            <div className="text-[#FF5C00] text-[10px] font-semibold uppercase tracking-[0.25em]">
                                Fotógrafo Profissional
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex-grow flex flex-col justify-center items-center py-2">
                            <div className="bg-white p-4 rounded-[20px] shadow-lg">
                                <QRCodeSVG 
                                    value={publicUrl}
                                    size={140}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#000000"
                                />
                            </div>
                        </div>

                        {/* Footer do Cartão */}
                        <div className="mt-auto pb-2">
                            <p className="text-xs text-[#FF5C00] font-semibold tracking-[0.15em]">
                                fotoclic.com.br
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center justify-center py-4 px-6 bg-neutral-900 text-white rounded-2xl font-bold shadow-xl hover:bg-neutral-800 transition-all transform active:scale-95 disabled:opacity-50"
                >
                    {downloading ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Gerando...
                        </span>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Baixar Imagem
                        </>
                    )}
                </button>
                <button 
                    onClick={handleShare}
                    className="flex items-center justify-center py-4 px-6 bg-white text-neutral-800 border border-neutral-200 rounded-2xl font-bold shadow-md hover:bg-neutral-50 transition-all transform active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Compartilhar Link
                </button>
            </div>
        </div>
    );
};

export default PhotographerBusinessCard;
