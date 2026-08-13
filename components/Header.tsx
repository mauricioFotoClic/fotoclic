
import React, { useState } from 'react';
import { type User, UserRole, type Page } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import Logo from './Logo';

const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
        <circle cx="12" cy="13" r="3"></circle>
    </svg>
);

const ShoppingCartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
);

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
    onNavigate: (page: Page) => void;
    currentView: string;
    cartCount: number;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onNavigate, currentView, cartCount }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { showToast } = useToast();
    const { t } = useLanguage();
    const isAdminView = currentView === 'admin';
    const isPhotographerView = currentView === 'photographer';
    const isAuthPage = ['login', 'register', 'pending-approval'].includes(currentView);

    const handleCopyLink = () => {
        if (!user) return;
        const url = `${window.location.origin}/portfolio/${user.slug || user.id}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast(t('nav.portfolio_link_copied'), 'success');
        }).catch(err => {
            console.error('Erro ao copiar link', err);
            showToast(t('common.error'), 'error');
        });
    };

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <a href="/" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'home' }); }} className="transition-transform hover:scale-105 active:scale-95 block" aria-label="Ir para a página inicial">
                            <Logo size={35} />
                        </a>
                    </div>

                    {!isAuthPage && (
                        <div className="flex items-center space-x-4">
                            {!(isAdminView || isPhotographerView) && (
                                <nav className="hidden lg:flex items-center space-x-6">
                                    <a href="/find-photos" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'find-photos' }); }} className={`text-sm font-medium transition-colors ${currentView === 'find-photos' ? 'text-primary' : 'text-neutral-800 hover:text-primary'}`}>{t('nav.find_photos')}</a>
                                    <a href="/photographers" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'photographers' }); }} className={`text-sm font-medium transition-colors ${currentView === 'photographers' ? 'text-primary' : 'text-neutral-800 hover:text-primary'}`}>{t('nav.find_photographers')}</a>
                                </nav>
                            )}

                            {/* Language Selector Dropdown */}
                            <LanguageSelector variant="dropdown" />

                            <div className="hidden sm:flex items-center space-x-2">
                                {!user ? (
                                    <>
                                        <button onClick={() => onNavigate({ name: 'login' })} className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                                            {t('nav.login')}
                                        </button>
                                        <button onClick={() => onNavigate({ name: 'register' })} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                                            {t('nav.register')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {user.role === UserRole.ADMIN && !isAdminView && (
                                            <button onClick={() => onNavigate({ name: 'admin' })} className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-full hover:bg-opacity-90 transition-colors">
                                                {t('nav.admin_panel')}
                                            </button>
                                        )}
                                        {user.role === UserRole.PHOTOGRAPHER && !isPhotographerView && (
                                            <button onClick={() => onNavigate({ name: 'photographer' })} className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors">
                                                {t('nav.photographer_panel')}
                                            </button>
                                        )}
                                        {user.role === UserRole.CUSTOMER && (
                                            <button onClick={() => onNavigate({ name: 'customer-dashboard' })} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-primary transition-colors">
                                                {t('nav.my_purchases')}
                                            </button>
                                        )}
                                        {isPhotographerView && (
                                            <button
                                                onClick={handleCopyLink}
                                                className="px-4 py-2 text-sm font-medium text-white bg-secondary hover:bg-secondary-light rounded-full shadow-sm transition-all flex items-center gap-2"
                                                title={t('nav.copy_portfolio_link')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                {t('nav.copy_portfolio_link')}
                                            </button>
                                        )}
                                        <span className="text-sm font-medium border-l border-neutral-200 pl-2 ml-2">Olá, {user.name}</span>
                                        <button onClick={onLogout} className="ml-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                                            {t('nav.logout')}
                                        </button>
                                    </>
                                )}
                            </div>
                            {!(isAdminView || isPhotographerView) && (
                                <button
                                    id="cart-btn"
                                    onClick={() => onNavigate({ name: 'cart' })}
                                    className="relative text-neutral-900 hover:text-primary transition-colors p-2"
                                    aria-label={`Ver carrinho com ${cartCount} itens`}
                                >
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                                            {cartCount}
                                        </span>
                                    )}
                                </button>
                            )}
                            {!(isAdminView || isPhotographerView) && (
                                <button className="lg:hidden p-2 text-neutral-900 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"} aria-expanded={isMenuOpen}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {isMenuOpen && !isAuthPage && (
                <div className="lg:hidden bg-white py-4 px-4 space-y-2">
                    <div className="pb-2 border-b border-neutral-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t('footer.language')}</span>
                        <LanguageSelector variant="inline" />
                    </div>
                    {!(isAdminView || isPhotographerView) && (
                        <>
                            <a href="/find-photos" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'find-photos' }); setIsMenuOpen(false); }} className="block text-sm font-medium text-neutral-800 hover:text-primary transition-colors w-full text-left py-2">{t('nav.find_photos')}</a>
                            <a href="/photographers" onClick={(e) => { e.preventDefault(); onNavigate({ name: 'photographers' }); setIsMenuOpen(false); }} className="block text-sm font-medium text-neutral-800 hover:text-primary transition-colors w-full text-left py-2">{t('nav.find_photographers')}</a>

                            <div className="h-px bg-neutral-100 my-2"></div>
                        </>
                    )}
                    {!user ? (
                        <div className="flex items-center space-x-2 pt-2">
                            <button onClick={() => { onNavigate({ name: 'login' }); setIsMenuOpen(false); }} className="w-full text-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                                {t('nav.login')}
                            </button>
                            <button onClick={() => { onNavigate({ name: 'register' }); setIsMenuOpen(false); }} className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                                {t('nav.register')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {user.role === UserRole.CUSTOMER && (
                                <button onClick={() => { onNavigate({ name: 'customer-dashboard' }); setIsMenuOpen(false); }} className="block w-full text-left text-sm font-medium text-neutral-800 hover:text-primary transition-colors py-2">
                                    {t('nav.my_purchases')}
                                </button>
                            )}
                            <div className="h-px bg-neutral-100 my-2"></div>
                            <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Conta</span>
                            {user.role === UserRole.PHOTOGRAPHER && !isPhotographerView && (
                                <button
                                    onClick={() => { onNavigate({ name: 'photographer' }); setIsMenuOpen(false); }}
                                    className="w-full text-center px-4 py-2 mb-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-full shadow-sm transition-all"
                                >
                                    {t('nav.photographer_panel')}
                                </button>
                            )}
                            {isPhotographerView && (
                                <button
                                    onClick={() => { handleCopyLink(); setIsMenuOpen(false); }}
                                    className="w-full text-center px-4 py-2 mb-2 text-sm font-medium text-white bg-secondary hover:bg-secondary-light rounded-full shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    {t('nav.copy_portfolio_link')}
                                </button>
                            )}
                            <span className="block text-sm text-neutral-800 mb-2 font-medium">Olá, {user.name}</span>
                            <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors mt-2">
                                {t('nav.logout')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </header>
    );
};

export default Header;


