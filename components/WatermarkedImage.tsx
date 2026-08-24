import React from 'react';

interface WatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  text?: string;
  containWithBlur?: boolean;
}

const WatermarkedImage: React.FC<WatermarkedImageProps> = ({
  src,
  alt,
  className = "",
  text = "FotoClic Preview",
  style,
  containWithBlur = false,
  ...props
}) => {
  const [loaded, setLoaded] = React.useState(false);

  // Previne o menu de contexto (botão direito)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Se containWithBlur for ativo, removemos classes de object-cover/object-fit do container
  // e aplicamos object-contain na imagem real, object-cover na imagem borrada.
  const containerClassName = containWithBlur 
    ? className.replace(/object-cover/g, '').replace(/bg-neutral-\d+/g, '') + " bg-neutral-950"
    : className;

  return (
    <div
      className={`relative overflow-hidden select-none group bg-neutral-100 ${containerClassName}`}
      onContextMenu={handleContextMenu}
      style={{ ...style, position: 'relative' }}
    >
      {containWithBlur ? (
        <>
          {/* Imagem Borrada no Fundo */}
          {loaded && (
            <img
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover filter blur-md opacity-40 scale-110 select-none pointer-events-none"
              draggable={false}
            />
          )}
          {/* Imagem Real Centralizada */}
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            className={`relative z-10 block w-full h-full object-contain transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
            {...props}
          />
        </>
      ) : (
        /* A Imagem Real */
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`block w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          draggable={false}
          {...props}
        />
      )}

      {/* Camada de Proteção Invisível (Impede arrastar a imagem para o desktop) */}
      <div className="absolute inset-0 z-20 bg-transparent" />

      {/* ── Malha de Proteção e Marca D'água Visual Avançada ── */}
      {loaded && (
        <div className="absolute inset-0 z-30 pointer-events-none select-none flex flex-col justify-between overflow-hidden animate-fade-in">
          {/* 1. Linhas de Segurança Cruzadas Contínuas (Estilo Banco de Imagens Getty/Shutterstock) */}
          <svg
            className="absolute inset-0 w-full h-full opacity-35"
            xmlns="http://www.w3.org/2000/svg"
            style={{ mixBlendMode: 'overlay' }}
          >
            <defs>
              <pattern id="crosshatch-grid" width="120" height="120" patternUnits="userSpaceOnUse">
                {/* Linhas diagonais cruzadas */}
                <line x1="0" y1="0" x2="120" y2="120" stroke="white" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.6" />
                <line x1="120" y1="0" x2="0" y2="120" stroke="white" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.6" />
                <line x1="0" y1="0" x2="120" y2="120" stroke="black" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.4" />
                <line x1="120" y1="0" x2="0" y2="120" stroke="black" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#crosshatch-grid)" />
          </svg>

          {/* 2. Grade de Marcas D'água Dinâmica em Diagonal (16 Células com Efeito Duplo) */}
          <div className="absolute inset-0 flex flex-wrap content-center justify-center opacity-40">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1/4 h-1/4 flex items-center justify-center transform -rotate-30 p-2"
              >
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/40 bg-black/30 backdrop-blur-[1px] shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-white font-display font-extrabold text-[9px] sm:text-xs md:text-sm tracking-wider whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {i % 2 === 0 ? text : 'fotoclic.com.br'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Selo Central de Alta Densidade (Sobre o ponto focal principal da foto) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="transform -rotate-12 bg-black/40 border-2 border-white/50 px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-xl shadow-2xl backdrop-blur-[2px] opacity-75">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary" />
                <span className="text-white font-display font-black text-xs sm:text-base md:text-xl tracking-widest uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                  FOTOCLIC • PREVIEW
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatermarkedImage;

