import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pt, type TranslationKeys } from '../locales/pt';
import { en } from '../locales/en';

export type Language = 'pt' | 'en';

const translations: Record<Language, TranslationKeys> = {
    pt,
    en,
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string, params?: Record<string, string | number>) => string;
    formatCurrency: (amount: number) => string;
    formatDate: (dateStringOrObj: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'fotoclic_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const savedLang = localStorage.getItem(STORAGE_KEY) as Language;
        if (savedLang && (savedLang === 'pt' || savedLang === 'en')) {
            return savedLang;
        }
        // Auto-detect browser language or default to 'pt'
        const browserLang = navigator.language.toLowerCase();
        return browserLang.startsWith('pt') ? 'pt' : 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    };

    useEffect(() => {
        document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en-US';
    }, [language]);

    const t = (path: string, params?: Record<string, string | number>): string => {
        const keys = path.split('.');
        let currentDict: any = translations[language];
        let fallbackDict: any = translations['pt'];

        for (const key of keys) {
            if (currentDict && currentDict[key] !== undefined) {
                currentDict = currentDict[key];
            } else {
                currentDict = undefined;
            }

            if (fallbackDict && fallbackDict[key] !== undefined) {
                fallbackDict = fallbackDict[key];
            } else {
                fallbackDict = undefined;
            }
        }

        let result = typeof currentDict === 'string' ? currentDict : (typeof fallbackDict === 'string' ? fallbackDict : path);

        if (params && typeof result === 'string') {
            Object.entries(params).forEach(([paramKey, value]) => {
                result = result.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(value));
            });
        }

        return result;
    };

    const formatCurrency = (amount: number): string => {
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateInput: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
        try {
            const dateObj = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
            if (isNaN(dateObj.getTime())) return String(dateInput);

            const locale = language === 'pt' ? 'pt-BR' : 'en-US';
            const defaultOptions: Intl.DateTimeFormatOptions = options || {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            };
            return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
        } catch (e) {
            return String(dateInput);
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency, formatDate }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
