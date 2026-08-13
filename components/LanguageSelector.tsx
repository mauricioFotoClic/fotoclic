import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, type Language } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
    variant?: 'dropdown' | 'inline' | 'compact';
    className?: string;
}

const GlobeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
);

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'dropdown', className = '' }) => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const languages: { code: Language; label: string; flag: string }[] = [
        { code: 'pt', label: 'Português', flag: '🇧🇷' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (variant === 'inline') {
        return (
            <div className={`flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 ${className}`}>
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            language === lang.code
                                ? 'bg-white dark:bg-neutral-900 text-primary shadow-sm font-semibold'
                                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                    >
                        <span>{lang.flag}</span>
                        <span>{lang.code.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <button
                onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-neutral-200 hover:border-primary text-neutral-700 hover:text-primary transition-all bg-white/50 backdrop-blur-sm ${className}`}
                title={language === 'pt' ? 'Mudar para Inglês' : 'Switch to Portuguese'}
            >
                <span>{languages.find(l => l.code === language)?.flag}</span>
                <span className="uppercase">{language}</span>
            </button>
        );
    }

    const currentLang = languages.find((l) => l.code === language) || languages[0];

    return (
        <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-full transition-all duration-200 border border-neutral-200 shadow-xs"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <GlobeIcon className="text-neutral-500" />
                <span className="flex items-center gap-1">
                    <span>{currentLang.flag}</span>
                    <span className="font-semibold">{currentLang.code.toUpperCase()}</span>
                </span>
                <svg className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-neutral-100 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="py-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left transition-colors ${
                                    language === lang.code
                                        ? 'bg-primary/10 text-primary font-bold'
                                        : 'text-neutral-700 hover:bg-neutral-50'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-sm">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                </span>
                                {language === lang.code && <CheckIcon className="text-primary" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
