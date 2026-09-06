
import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
    variant?: 'default' | 'light' | 'white';
    showText?: boolean;
    useImage?: boolean; // Agora usamos a imagem por padrão se possível
}

const Logo: React.FC<LogoProps> = ({ 
    className = "", 
    size = 32, 
    variant = 'default',
    showText = true,
    useImage = true // Ativado por padrão para usar a imagem oficial do logotipo (/logo.png)
}) => {
    const isWhiteVariant = variant === 'white' || variant === 'light';
    
    // Filtro para tornar a logo branca em fundos escuros (mantendo a transparência)
    // O filtro 'brightness(0) invert(1)' torna tudo que é escuro em branco.
    const imageClass = isWhiteVariant ? 'brightness-0 invert' : '';

    if (useImage) {
        return (
            <div className={`flex items-center ${className}`}>
                <img 
                    src="/logo.png" 
                    alt="FotoClic" 
                    style={{ height: size, width: 'auto' }}
                    className={imageClass}
                />
            </div>
        );
    }

    // Fallback SVG (Fiel à original)
    const textColor = isWhiteVariant ? '#FFFFFF' : '#000000';
    const primaryColor = '#20C933';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg 
                width={size * 1.1} 
                height={size} 
                viewBox="0 0 45 35" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <path 
                    d="M14 6L11.5 9.5H6C4.34315 9.5 3 10.8431 3 12.5V30.5C3 32.1569 4.34315 33.5 6 33.5H39C40.6569 33.5 42 32.1569 42 30.5V12.5C42 10.8431 40.6569 9.5 39 9.5H33.5L31 6H14Z" 
                    stroke={textColor} 
                    strokeWidth="3.5" 
                    strokeLinejoin="round"
                />
                <circle cx="22.5" cy="21.5" r="7.5" stroke={textColor} strokeWidth="3.5" />
                <circle cx="22.5" cy="21.5" r="2.5" fill={textColor} />
                <rect x="34" y="13.5" width="4" height="4" rx="1" fill={textColor} />
            </svg>

            {showText && (
                <div className="flex items-center font-sans font-extrabold tracking-tight" style={{ fontSize: size * 0.85 }}>
                    <span style={{ color: textColor }}>Foto</span>
                    <span className="flex items-center" style={{ color: primaryColor }}>
                        cli
                        <svg 
                            width={size * 0.75} 
                            height={size * 0.75} 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            className="ml-0.5"
                        >
                            <circle cx="12" cy="12" r="10" stroke={primaryColor} strokeWidth="3" />
                            <path d="M12 2C13.5 4.5 14 7.5 14 12" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M22 12C19.5 13.5 16.5 14 12 14" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M12 22C10.5 19.5 10 16.5 10 12" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M2 12C4.5 10.5 7.5 10 12 10" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M19 19L14 14" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M5 5L10 10" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                    </span>
                </div>
            )}
        </div>
    );
};

export default Logo;


