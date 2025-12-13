
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
  // Previne o menu de contexto (botão direito)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className={`relative overflow-hidden select-none group ${className}`} 
      onContextMenu={handleContextMenu}
      style={{ ...style, position: 'relative' }} // Garante posicionamento para os absolutos
    >
      {/* A Imagem Real */}
      <img 
        src={src} 
        alt={alt} 
        className={`block w-full h-full ${className}`}
        draggable={false}
        {...props}
      />

      {/* Camada de Proteção (Impede arrastar a imagem para o desktop) */}
      <div className="absolute inset-0 z-10 bg-transparent" />

      {/* Marca D'água Visual */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-wrap content-center justify-center overflow-hidden opacity-30">
        {Array.from({ length: 12 }).map((_, i) => (
          <div 
            key={i} 
            className="w-1/3 h-1/4 flex items-center justify-center transform -rotate-45"
          >
            <span className="text-white font-display font-bold text-lg sm:text-xl whitespace-nowrap drop-shadow-md select-none border-2 border-white/20 px-2 py-1 rounded-md">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatermarkedImage;
