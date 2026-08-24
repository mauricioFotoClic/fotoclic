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

      {/* ── Malha de Proteção e Marca D'água Visual Anti-Print / Anti-IA ── */}
      {loaded && (
        <div className="absolute inset-0 z-30 pointer-events-none select-none flex flex-col justify-between overflow-hidden animate-fade-in">
          {/* 1. Linhas de Segurança Cruzadas Contínuas e Grossas (Alta Visibilidade em Qualquer Fundo) */}
          <svg
            className="absolute inset-0 w-full h-full opacity-65"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="crosshatch-grid-heavy" width="100" height="100" patternUnits="userSpaceOnUse">
                {/* Linhas pretas de contorno / sombra para contraste em fundos claros */}
                <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(0,0,0,0.65)" strokeWidth="3.5" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(0,0,0,0.65)" strokeWidth="3.5" />
                {/* Linhas brancas principais grossas e pontilhadas para contraste em fundos escuros */}
                <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeDasharray="10 5" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeDasharray="10 5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#crosshatch-grid-heavy)" />
          </svg>

          {/* 2. Grade de Marcas D'água Dinâmica em Diagonal (16 Células com Alto Contraste) */}
          <div className="absolute inset-0 flex flex-wrap content-center justify-center opacity-75">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1/4 h-1/4 flex items-center justify-center transform -rotate-30 p-1.5"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/60 bg-black/45 backdrop-blur-[2px] shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,1)] animate-pulse" />
                  <span className="text-white font-display font-extrabold text-[10px] sm:text-xs md:text-sm tracking-wider whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                    {i % 2 === 0 ? text : 'fotoclic.com.br'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Selo Central de Alta Densidade com Difração Óptica (Foco no Centro da Foto) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            <div className="transform -rotate-12 bg-black/60 border-2 border-primary/90 px-5 py-2 sm:px-8 sm:py-3.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-[3px]">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary shadow-[0_0_12px_rgba(249,115,22,1)]" />
                <div className="flex flex-col text-center">
                  <span className="text-white font-display font-black text-sm sm:text-lg md:text-2xl tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                    FOTOCLIC • PREVIEW
                  </span>
                  <span className="text-orange-300 font-sans font-bold text-[9px] sm:text-xs tracking-wider uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                    IMAGEM PROTEGIDA • COMPRE A ORIGINAL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatermarkedImage;


