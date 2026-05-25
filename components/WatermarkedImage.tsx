
import React from 'react';

interface WatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  text?: string;
}

const WatermarkedImage: React.FC<WatermarkedImageProps> = ({
  src,
  alt,
  className = "",
  text = "FotoClic Preview",
  style,
  ...props
}) => {
  const [loaded, setLoaded] = React.useState(false);

  // Previne o menu de contexto (botão direito)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={`relative overflow-hidden select-none group bg-neutral-100 ${className}`}
      onContextMenu={handleContextMenu}
      style={{ ...style, position: 'relative' }} // Garante posicionamento para os absolutos
    >
      {/* A Imagem Real */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`block w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        draggable={false}
        {...props}
      />

      {/* Camada de Proteção (Impede arrastar a imagem para o desktop) */}
      <div className="absolute inset-0 z-10 bg-transparent" />

      {/* Marca D'água Visual */}
      {loaded && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-wrap content-center justify-center overflow-hidden opacity-35 animate-fade-in">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-1/2 h-1/3 flex items-center justify-center transform -rotate-45"
            >
              <span className="text-white/90 font-display font-bold text-[10px] sm:text-sm md:text-lg whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none border border-white/30 bg-black/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                {text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatermarkedImage;


