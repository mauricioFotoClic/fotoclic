import React from 'react';
import { Page } from '../types';
import Logo from './Logo';

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
        <div className="mt-12 border-t border-gray-700 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-neutral-200">&copy; {new Date().getFullYear()} FotoClic. Todos os direitos reservados.</p>
          {/* Social media icons would go here */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

