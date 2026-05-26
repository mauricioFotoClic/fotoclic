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
                    className="relative w-[320px] aspect-[2/3] sm:aspect-[9/16] rounded-[24px] overflow-hidden shadow-2xl bg-black flex flex-col border border-white/10"
                >
                    {/* Efeitos de Fundo (Gradients Laranjas e Texturas) */}
                    
                    {/* Linhas Laranjas - Topo Direito */}
                    <div className="absolute -top-12 -right-16 w-64 h-64 -rotate-45 opacity-90 pointer-events-none flex flex-col justify-center gap-[6px]">
                        <div className="h-10 w-full bg-gradient-to-r from-transparent to-[#FF5C00]"></div>
                        <div className="h-4 w-full bg-gradient-to-r from-transparent to-[#FF5C00]"></div>
                        <div className="h-6 w-full bg-gradient-to-r from-transparent to-[#FF5C00]"></div>
                        <div className="h-2 w-full bg-gradient-to-r from-transparent to-[#FF5C00]"></div>
                        <div className="h-8 w-full bg-gradient-to-r from-transparent to-[#FF5C00]"></div>
                    </div>

                    {/* Linhas Laranjas - Base Esquerda */}
                    <div className="absolute -bottom-16 -left-16 w-64 h-64 -rotate-45 opacity-60 pointer-events-none flex flex-col justify-center gap-[6px]">
                        <div className="h-8 w-full bg-gradient-to-l from-transparent to-[#FF5C00]"></div>
                        <div className="h-2 w-full bg-gradient-to-l from-transparent to-[#FF5C00]"></div>
                        <div className="h-6 w-full bg-gradient-to-l from-transparent to-[#FF5C00]"></div>
                        <div className="h-4 w-full bg-gradient-to-l from-transparent to-[#FF5C00]"></div>
                        <div className="h-10 w-full bg-gradient-to-l from-transparent to-[#FF5C00]"></div>
                    </div>

                    {/* Padrão de Pontilhados Suaves (Simulando o grid do layout) */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF5C00 1px, transparent 1px)', backgroundSize: '12px 12px', maskImage: 'radial-gradient(circle at center, transparent 40%, black 100%)', WebkitMaskImage: 'radial-gradient(circle at center, transparent 40%, black 100%)' }}></div>

                    <div className="relative z-10 flex flex-col h-full text-center text-white p-8">
                        
                        {/* Logo no Topo */}
                        <div className="flex justify-center mt-6">
                            <Logo size={32} useImage={true} dark={true} />
                        </div>

                        {/* Nome e Cargo */}
                        <div className="flex flex-col items-center mt-12 mb-6">
                            <h3 className="text-3xl font-bold tracking-tight text-white">{user.name}</h3>
                            
                            {/* Linha separadora laranja */}
                            <div className="w-3/4 h-[1px] bg-primary/60 my-5"></div>
                            
                            <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">
                                Fotógrafo Profissional
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex-grow flex flex-col justify-center items-center py-2">
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                                <QRCodeSVG 
                                    value={publicUrl}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#000000"
                                />
                            </div>
                        </div>

                        {/* Footer do Cartão */}
                        <div className="mt-auto pb-4">
                            <p className="text-sm text-primary font-semibold tracking-wider">
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
