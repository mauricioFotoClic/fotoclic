import React from 'react';
import { Page } from '../types';
import Logo from './Logo';
import { shareContent } from '../utils/share';

interface FooterProps {
    onNavigate: (page: Page) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-neutral-900 text-neutral-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
             <button onClick={() => onNavigate({ name: 'home' })} className="transition-transform hover:scale-105 active:scale-95">
              <Logo size={28} variant="white" />
            </button>
            <p className="text-sm text-neutral-200">O principal marketplace de fotografia digital de alta qualidade.</p>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate({ name: 'home' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Categorias</button></li>
              <li><button onClick={() => onNavigate({ name: 'photographers' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Fotógrafos</button></li>
              <li><button onClick={() => onNavigate({ name: 'featured-photos' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Fotos em Destaque</button></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Sobre</h3>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate({ name: 'about' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Sobre Nós</button></li>
              <li><button onClick={() => onNavigate({ name: 'contact' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Contato</button></li>
              <li><button onClick={() => onNavigate({ name: 'help-center' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Central de Ajuda</button></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate({ name: 'terms' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Termos de Serviço</button></li>
              <li><button onClick={() => onNavigate({ name: 'privacy' })} className="text-sm text-neutral-200 hover:text-white transition-colors text-left">Política de Privacidade</button></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-sm text-neutral-400">&copy; {new Date().getFullYear()} FotoClic. Todos os direitos reservados.</p>
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

