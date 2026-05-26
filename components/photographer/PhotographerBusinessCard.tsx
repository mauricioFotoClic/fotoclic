import React, { useRef, useState } from 'react';
import { User } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';

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
                    {/* SVG Background */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            {/* Mask: opaque at top-right and bottom-left corners, transparent at center */}
                            <radialGradient id="bc-tr-corner" cx="320" cy="0" r="220" gradientUnits="userSpaceOnUse">
                                <stop offset="0%"   stopColor="white" stopOpacity="1" />
                                <stop offset="60%"  stopColor="white" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="bc-bl-corner" cx="0" cy="480" r="220" gradientUnits="userSpaceOnUse">
                                <stop offset="0%"   stopColor="white" stopOpacity="1" />
                                <stop offset="60%"  stopColor="white" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </radialGradient>
                            <mask id="bc-corners-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                                <rect x="0" y="0" width="320" height="480" fill="black" />
                                <circle cx="320" cy="0"   r="220" fill="url(#bc-tr-corner)" />
                                <circle cx="0"   cy="480" r="220" fill="url(#bc-bl-corner)" />
                            </mask>
                            {/* Dot pattern */}
                            <pattern id="bc-dot-grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                <circle cx="5" cy="5" r="1.3" fill="#FF5C00" />
                            </pattern>

                            {/* Linear Gradients for Stripes */}
                            <linearGradient id="tr-stripes-grad" x1="320" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FF5C00" stopOpacity="1" />
                                <stop offset="40%" stopColor="#FF5C00" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#FF5C00" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="bl-stripes-grad" x1="0" y1="480" x2="160" y2="320" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FF5C00" stopOpacity="1" />
                                <stop offset="40%" stopColor="#FF5C00" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#FF5C00" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Top-Right Corner Stripes */}
                        <g>
                            <line x1="170" y1="0" x2="320" y2="150" stroke="url(#tr-stripes-grad)" strokeWidth="3" />
                            <line x1="185" y1="0" x2="320" y2="135" stroke="url(#tr-stripes-grad)" strokeWidth="4" />
                            <line x1="200" y1="0" x2="320" y2="120" stroke="url(#tr-stripes-grad)" strokeWidth="5" />
                            <line x1="215" y1="0" x2="320" y2="105" stroke="url(#tr-stripes-grad)" strokeWidth="6" />
                            <line x1="230" y1="0" x2="320" y2="90" stroke="url(#tr-stripes-grad)" strokeWidth="8" />
                            <line x1="245" y1="0" x2="320" y2="75" stroke="url(#tr-stripes-grad)" strokeWidth="10" />
                            <line x1="260" y1="0" x2="320" y2="60" stroke="url(#tr-stripes-grad)" strokeWidth="12" />
                            <line x1="275" y1="0" x2="320" y2="45" stroke="url(#tr-stripes-grad)" strokeWidth="14" />
                            <line x1="290" y1="0" x2="320" y2="30" stroke="url(#tr-stripes-grad)" strokeWidth="16" />
                            <line x1="305" y1="0" x2="320" y2="15" stroke="url(#tr-stripes-grad)" strokeWidth="18" />
                            <line x1="315" y1="0" x2="320" y2="5" stroke="url(#tr-stripes-grad)" strokeWidth="20" />
                        </g>

                        {/* Bottom-Left Corner Stripes */}
                        <g>
                            <line x1="0" y1="330" x2="150" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="3" />
                            <line x1="0" y1="345" x2="135" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="4" />
                            <line x1="0" y1="360" x2="120" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="5" />
                            <line x1="0" y1="375" x2="105" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="6" />
                            <line x1="0" y1="390" x2="90" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="8" />
                            <line x1="0" y1="405" x2="75" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="10" />
                            <line x1="0" y1="420" x2="60" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="12" />
                            <line x1="0" y1="435" x2="45" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="14" />
                            <line x1="0" y1="450" x2="30" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="16" />
                            <line x1="0" y1="465" x2="15" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="18" />
                            <line x1="0" y1="475" x2="5" y2="480" stroke="url(#bl-stripes-grad)" strokeWidth="20" />
                        </g>

                        {/* Orange dots — masked to the same corners */}
                        <rect width="320" height="480" fill="url(#bc-dot-grid)" mask="url(#bc-corners-mask)" opacity="0.7" />
                    </svg>

                    <div className="relative z-10 flex flex-col h-full text-center text-white px-8 pt-9 pb-6">

                        {/* Logo no Topo */}
                        <div className="flex justify-center">
                            <div className="relative inline-block" style={{ height: '32px' }}>
                                {/* Copy 1: White Logo (Underneath) */}
                                <img 
                                    src="/logo.png" 
                                    alt="FotoClic" 
                                    className="brightness-0 invert select-none"
                                    style={{ height: '32px', width: 'auto', display: 'block' }}
                                />
                                {/* Copy 2: Orange Clic (Overlay) */}
                                <img 
                                    src="/logo.png" 
                                    alt="FotoClic" 
                                    className="absolute inset-0 select-none"
                                    style={{ height: '32px', width: 'auto', display: 'block', clipPath: 'inset(0 0 0 51.5%)' }}
                                />
                            </div>
                        </div>

                        {/* Nome e Cargo */}
                        <div className="flex flex-col items-center mt-9">
                            <h3 className="text-[2.1rem] font-bold tracking-tight text-white leading-tight">{user.name}</h3>
                            <div className="w-24 h-[1px] bg-[#FF5C00] my-3"></div>
                            <div className="text-[#FF5C00] text-[10px] font-semibold uppercase tracking-[0.25em]">
                                FOTÓGRAFO PROFISSIONAL
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex-grow flex flex-col justify-center items-center">
                            <div className="bg-white p-5 rounded-[24px] shadow-lg">
                                <QRCodeSVG
                                    value={publicUrl}
                                    size={185}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#000000"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div>
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
