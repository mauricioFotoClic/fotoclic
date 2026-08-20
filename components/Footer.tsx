import React from 'react';
import { Page } from '../types';
import Logo from './Logo';
import { shareContent } from '../utils/share';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';

interface FooterProps {
    onNavigate: (page: Page) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <footer className="bg-neutral-900 text-neutral-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
             <a href="/" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'home' }); }} className="transition-transform hover:scale-105 active:scale-95 inline-block" aria-label="Ir para a página inicial">
              <Logo size={28} variant="white" />
            </a>
            <p className="text-sm text-neutral-200">{t('footer.slogan')}</p>
            <div className="pt-2">
              <LanguageSelector variant="inline" />
            </div>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><a href="/" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'home' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('home.categories')}</a></li>
              <li><a href="/fotografos" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'photographers' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('nav.find_photographers')}</a></li>
              <li><a href="/fotos-destaque" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'featured-photos' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('home.recent_photos')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-4">{t('nav.about')}</h3>
            <ul className="space-y-2">
              <li><a href="/sobre" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'about' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('footer.about_us')}</a></li>
              <li><a href="/contato" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'contact' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('footer.contact')}</a></li>
              <li><a href="/ajuda" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'help-center' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('footer.help_center')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="/termos" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'terms' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('footer.terms')}</a></li>
              <li><a href="/privacidade" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'privacy' }); }} className="text-sm text-neutral-200 hover:text-white transition-colors text-left block">{t('footer.privacy')}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-sm text-neutral-400">&copy; {new Date().getFullYear()} FotoClic. {t('footer.all_rights_reserved')}</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">Compartilhar site:</span>
            <button
              onClick={() => shareContent(
                'FotoClic',
                'FotoClic - Suas Melhores Fotos Sempre em um Clique',
                window.location.origin
              )}
              className="p-3 bg-white/10 hover:bg-primary text-white rounded-full transition-all shadow-md active:scale-95 flex items-center justify-center group"
              title="Compartilhar"
              aria-label="Compartilhar site"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

