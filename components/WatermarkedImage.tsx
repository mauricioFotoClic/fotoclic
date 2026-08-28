import React, { useId, useState, useEffect } from 'react';

interface WatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  text?: string;
  containWithBlur?: boolean;
  placeholderSrc?: string;
  instant?: boolean;
}

const WatermarkedImage: React.FC<WatermarkedImageProps> = ({
  src,
  alt,
  className = "",
  text = "fotoclic.com.br",
  style,
  containWithBlur = false,
  placeholderSrc,
  instant = false,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const patternId = useId().replace(/:/g, '_');

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  // Previne o menu de contexto (botão direito)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Se containWithBlur for ativo, removemos classes de object-cover/object-fit do container
  const containerClassName = containWithBlur 
    ? className.replace(/object-cover/g, '').replace(/bg-neutral-\d+/g, '') + " bg-neutral-950"
    : className;

  return (
    <div
      className={`relative overflow-hidden select-none group bg-neutral-900 ${containerClassName}`}
      onContextMenu={handleContextMenu}
      style={{ ...style, position: 'relative' }}
    >
      {/* ── Imagem Base (Placeholder / Thumbnail em Cache Instantâneo) ── */}
      {placeholderSrc && placeholderSrc !== src && (
        <img
          src={placeholderSrc}
          alt=""
          className={`absolute inset-0 w-full h-full ${containWithBlur ? 'object-contain' : 'object-cover'} pointer-events-none select-none`}
          draggable={false}
        />
      )}

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
            className={`relative z-10 block w-full h-full object-contain ${
              instant ? '' : 'transition-opacity duration-150'
            } ${loaded || !placeholderSrc ? 'opacity-100' : 'opacity-0'}`}
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
          className={`block w-full h-full object-cover ${
            instant ? '' : 'transition-opacity duration-150'
          } ${loaded || !placeholderSrc ? 'opacity-100' : 'opacity-0'} ${className}`}
          draggable={false}
          {...props}
        />
      )}

      {/* Camada de Proteção Invisível (Impede arrastar a imagem para o desktop) */}
      <div className="absolute inset-0 z-20 bg-transparent" />

      {/* ── Malha de Proteção e Marca D'água Anti-Print / Anti-IA ── */}
      <div className="absolute inset-0 z-30 pointer-events-none select-none flex items-center justify-center overflow-hidden">
        {/* 1. Grade Vetorial SVG com Textos Cruzados e Linhas Finas de Segurança */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id={`wm-pattern-${patternId}`}
              width="200"
              height="100"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-28)"
            >
              {/* Linhas de segurança sutis anti-corte e anti-IA */}
              <line x1="0" y1="0" x2="200" y2="0" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />
              <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(0,0,0,0.14)" strokeWidth="0.75" />
              <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />

              {/* Linha 1: FotoClic .com.br com ponto laranja */}
              <g transform="translate(16, 32)">
                <text
                  x="0"
                  y="0"
                  fill="rgba(255, 255, 255, 0.55)"
                  stroke="rgba(0, 0, 0, 0.45)"
                  strokeWidth="0.6"
                  paintOrder="stroke fill"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 800,
                    fontSize: '13px',
                    letterSpacing: '1px',
                  }}
                >
                  FOTOCLIC
                </text>
                <text
                  x="76"
                  y="0"
                  fill="rgba(249, 115, 22, 0.70)"
                  stroke="rgba(0, 0, 0, 0.4)"
                  strokeWidth="0.5"
                  paintOrder="stroke fill"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 700,
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                  }}
                >
                  .com.br
                </text>
              </g>

              {/* Linha 2 (deslocada): PREVIEW PROTEGIDA */}
              <g transform="translate(100, 82)">
                <text
                  x="0"
                  y="0"
                  fill="rgba(255, 255, 255, 0.42)"
                  stroke="rgba(0, 0, 0, 0.38)"
                  strokeWidth="0.5"
                  paintOrder="stroke fill"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '1.5px',
                  }}
                >
                  PREVIEW
                </text>
                <circle cx="68" cy="-3" r="1.5" fill="rgba(249, 115, 22, 0.7)" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#wm-pattern-${patternId})`} />
        </svg>

        {/* 2. Selo Central Discreto e Translúcido */}
        <div className="relative z-10 hidden sm:flex items-center justify-center p-2 transform scale-90 md:scale-100 transition-transform">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/30 border border-white/20 shadow-md backdrop-blur-[1px]">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse" />
            <span className="text-white font-display font-bold text-[10px] md:text-xs tracking-wider uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              FotoClic Preview
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatermarkedImage;
