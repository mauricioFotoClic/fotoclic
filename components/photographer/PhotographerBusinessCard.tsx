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

    // Link para a página pública do fotógrafo
    const publicUrl = `${window.location.origin}/photographer/${user.id}`;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        
        try {
            setDownloading(true);
            // Pequeno delay para garantir que tudo renderizou
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
                    Personalizado com sua foto de perfil e banner.
                </p>
            </div>

            {/* Card Preview Container */}
            <div className="flex justify-center mb-8">
                <div 
                    ref={cardRef} 
                    className="relative w-[320px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 flex flex-col"
                    style={{
                        backgroundImage: user.banner_url ? `url(${user.banner_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* Camada de Gradiente para leitura */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90"></div>

                    {/* Conteúdo do Cartão */}
                    <div className="relative z-10 flex flex-col h-full p-6 text-center text-white">
                        
                        {/* Logo no Topo */}
                        <div className="flex justify-center mb-10 mt-4">
                            <Logo size={24} useImage={true} dark={true} />
                        </div>

                        {/* Foto e Nome */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-28 h-28 rounded-full p-1 bg-white/20 backdrop-blur-md mb-4 shadow-xl">
                                <img 
                                    src={user.avatar_url || 'https://via.placeholder.com/150'} 
                                    alt={user.name} 
                                    className="w-full h-full object-cover rounded-full border-2 border-white/50"
                                    crossOrigin="anonymous"
                                />
                            </div>
                            <h3 className="text-2xl font-display font-bold tracking-wide drop-shadow-md">{user.name}</h3>
                            <div className="mt-1 px-3 py-0.5 bg-primary rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                Fotógrafo Profissional
                            </div>
                        </div>

                        {/* Espaço Flexível */}
                        <div className="flex-grow"></div>

                        {/* Seção do QR Code */}
                        <div className="flex flex-col items-center mb-8">
                            <p className="text-[11px] font-medium mb-3 text-white/80 uppercase tracking-widest">
                                Escaneie para comprar fotos
                            </p>
                            <div className="bg-white p-3 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                                <QRCodeSVG 
                                    value={publicUrl}
                                    size={150}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#000000"
                                />
                            </div>
                        </div>

                        {/* Footer do Cartão */}
                        <div className="border-t border-white/10 pt-4 mb-2">
                            <p className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-bold">
                                fotoclic.com.br
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Painel de Ações */}
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

            <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-xs text-center text-primary-dark font-medium leading-relaxed">
                    💡 <b>Dica:</b> O cartão utiliza automaticamente sua <b>foto de perfil</b> e sua <b>foto de capa</b>. 
                    Se quiser mudar o visual do cartão, basta atualizar suas fotos na aba "Meu Perfil".
                </p>
            </div>
        </div>
    );
};

export default PhotographerBusinessCard;
