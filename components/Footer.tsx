import React from 'react';
import { Page } from '../types';

const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
      <circle cx="12" cy="13" r="3"></circle>
    </svg>
  );
  
interface FooterProps {
    onNavigate: (page: Page) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-primary-dark text-neutral-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
             <button onClick={() => onNavigate({ name: 'home' })} className="flex items-center space-x-2 text-white">
              <CameraIcon className="h-7 w-7" />
              <span className="text-2xl font-display font-bold">FotoClic</span>
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