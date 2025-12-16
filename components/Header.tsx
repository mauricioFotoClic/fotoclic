
import React, { useState } from 'react';
import { User, UserRole, Page } from '../types';

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
    const isAdminView = currentView === 'admin';
    const isPhotographerView = currentView === 'photographer';
    const isAuthPage = ['login', 'register', 'pending-approval'].includes(currentView);

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate({ name: 'home' })} className="flex items-center space-x-2 text-primary-dark hover:text-primary transition-colors">
                            <CameraIcon className="h-7 w-7" />
                            <span className="text-2xl font-display font-bold">FotoClic</span>
                        </button>

                        {!isAuthPage && !isAdminView && !isPhotographerView && (
                            <button
                                onClick={() => onNavigate({ name: 'face-search' })}
                                className="hidden md:flex items-center space-x-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 px-3 py-1.5 rounded-full transition-colors text-sm font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                    <path d="M12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                                </svg>
                                <span>Buscar por Selfie</span>
                            </button>
                        )}
                    </div>

                    {!isAuthPage && (
                        <div className="flex items-center space-x-4">
                            {!(isAdminView || isPhotographerView) && (
                                <nav className="hidden lg:flex items-center space-x-6">
                                    <button onClick={() => onNavigate({ name: 'discover' })} className="text-sm font-medium text-neutral-800 hover:text-primary transition-colors">Descobrir</button>
                                    <button onClick={() => onNavigate({ name: 'photographers' })} className="text-sm font-medium text-neutral-800 hover:text-primary transition-colors">Fotógrafos</button>
                                </nav>
                            )}
                            <div className="hidden sm:flex items-center space-x-2">
                                {!user ? (
                                    <>
                                        <button onClick={() => onNavigate({ name: 'login' })} className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                                            Entrar
                                        </button>
                                        <button onClick={() => onNavigate({ name: 'register' })} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                                            Cadastrar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {user.role === UserRole.ADMIN && !isAdminView && (
                                            <button onClick={() => onNavigate({ name: 'admin' })} className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-full hover:bg-opacity-90 transition-colors">
                                                Painel Admin
                                            </button>
                                        )}
                                        {user.role === UserRole.PHOTOGRAPHER && !isPhotographerView && (
                                            <button onClick={() => onNavigate({ name: 'photographer' })} className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-full hover:bg-opacity-90 transition-colors">
                                                Painel do Fotógrafo
                                            </button>
                                        )}
                                        {user.role === UserRole.CUSTOMER && (
                                            <button onClick={() => onNavigate({ name: 'customer-dashboard' })} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-primary transition-colors">
                                                Minhas Compras
                                            </button>
                                        )}
                                        <span className="text-sm font-medium border-l border-neutral-200 pl-2 ml-2">Olá, {user.name}</span>
                                        <button onClick={onLogout} className="ml-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                                            Sair
                                        </button>
                                    </>
                                )}
                            </div>
                            {!(isAdminView || isPhotographerView) && (
                                <button
                                    id="cart-btn"
                                    onClick={() => onNavigate({ name: 'cart' })}
                                    className="relative text-neutral-800 hover:text-primary transition-colors p-2"
                                >
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-secondary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                                            {cartCount}
                                        </span>
                                    )}
                                </button>
                            )}
                            {!(isAdminView || isPhotographerView) && (
                                <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
                    {!(isAdminView || isPhotographerView) && (
                        <>
                            <button onClick={() => { onNavigate({ name: 'discover' }); setIsMenuOpen(false); }} className="block text-sm font-medium text-neutral-800 hover:text-primary transition-colors w-full text-left py-2">Descobrir</button>
                            <button onClick={() => { onNavigate({ name: 'photographers' }); setIsMenuOpen(false); }} className="block text-sm font-medium text-neutral-800 hover:text-primary transition-colors w-full text-left py-2">Fotógrafos</button>

                            <button onClick={() => { onNavigate({ name: 'face-search' }); setIsMenuOpen(false); }} className="block w-full text-left text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors py-2 bg-blue-50 rounded-lg px-2 mt-1 -ml-2 w-[calc(100%+16px)]">
                                <span className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                        <path d="M12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                                    </svg>
                                    Buscar por Selfie
                                </span>
                            </button>
                            <div className="h-px bg-neutral-100 my-2"></div>
                        </>
                    )}
                    {!user ? (
                        <div className="flex items-center space-x-2 pt-2">
                            <button onClick={() => { onNavigate({ name: 'login' }); setIsMenuOpen(false); }} className="w-full text-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                                Entrar
                            </button>
                            <button onClick={() => { onNavigate({ name: 'register' }); setIsMenuOpen(false); }} className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                                Cadastrar
                            </button>
                        </div>
                    ) : (
                        <>
                            {user.role === UserRole.CUSTOMER && (
                                <button onClick={() => { onNavigate({ name: 'customer-dashboard' }); setIsMenuOpen(false); }} className="block w-full text-left text-sm font-medium text-neutral-800 hover:text-primary transition-colors py-2">
                                    Minhas Compras
                                </button>
                            )}
                            <div className="h-px bg-neutral-100 my-2"></div>
                            <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Conta</span>
                            <span className="block text-sm text-neutral-800 mb-2 font-medium">Olá, {user.name}</span>
                            <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors mt-2">
                                Sair
                            </button>
                        </>
                    )}
                </div>
            )
            }
        </header >
    );
};

export default Header;
