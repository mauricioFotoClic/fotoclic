import React, { useState, useEffect, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { type User, UserRole, type Page } from './types';
import api from './services/api';
import PhotoDetailModal from './components/PhotoDetailModal';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import FaceSearchModal from './components/FaceSearchModal';
// import Toast from './components/Toast'; // Removed, using Context
import Spinner from './components/Spinner';
import TopProgressBar from './components/TopProgressBar';

// Contexts
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ConfirmProvider, useConfirm } from './contexts/ConfirmContext';

// Lazy load wrapper to handle Vite chunk loading errors during new deployments
const lazyWithRetry = (componentImport: () => Promise<{ default: React.ComponentType<any> }>) => {
    return React.lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error: any) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // If it's a chunk loading error (network or MIME type), reload to get the new index.html
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                window.location.reload();
                // Return a promise that never resolves while the page is reloading
                return new Promise<{ default: React.ComponentType<any> }>(() => {});
            }
            throw error;
        }
    });
};

// Lazy load pages
const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage'));
const CategoryPage = lazyWithRetry(() => import('./pages/CategoryPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage'));
const FeaturedPhotosPage = lazyWithRetry(() => import('./pages/FeaturedPhotosPage'));
const PhotographerPage = lazyWithRetry(() => import('./pages/PhotographerPage'));
const PhotographerPortfolioPage = lazyWithRetry(() => import('./pages/PhotographerPortfolioPage'));
const DiscoverPage = lazyWithRetry(() => import('./pages/DiscoverPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const EventPage = lazyWithRetry(() => import('./pages/EventPage'));
const FindPhotosPage = lazyWithRetry(() => import('./pages/FindPhotosPage'));
const PhotographersPage = lazyWithRetry(() => import('./pages/PhotographersPage'));
const CartPage = lazyWithRetry(() => import('./pages/CartPage'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));
const PendingApprovalPage = lazyWithRetry(() => import('./pages/PendingApprovalPage'));
const PhotoDetailPage = lazyWithRetry(() => import('./pages/PhotoDetailPage'));
const CustomerDashboardPage = lazyWithRetry(() => import('./pages/CustomerDashboardPage'));
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage'));
const CheckoutSuccessPage = lazyWithRetry(() => import('./pages/CheckoutSuccessPage'));
const HelpCenterPage = lazyWithRetry(() => import('./pages/HelpCenterPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));


interface FlyingImage {
    src: string;
    top: number;
    left: number;
    width: number;
    height: number;
    opacity: number;
}

const MainApp: React.FC = () => {
    const { showToast } = useToast();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>({ name: 'home' });
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isFaceSearchModalOpen, setIsFaceSearchModalOpen] = useState(false);
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [cartItems, setCartItems] = useState<string[]>([]);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    // Animation State
    const [flyingImage, setFlyingImage] = useState<FlyingImage | null>(null);

    const initialized = React.useRef(false);

    // Initialize cart from localStorage and Restore Session on mount
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // 1. Cart — Não carrega se estiver na página de sucesso (a compra já foi concluída)
        const isCheckoutSuccess = window.location.pathname === '/checkout-success';
        if (!isCheckoutSuccess) {
            const savedCart = localStorage.getItem('cartItems');
            if (savedCart) {
                try {
                    setCartItems(JSON.parse(savedCart));
                } catch (e) {
                    console.error("Failed to parse cart from localStorage", e);
                }
            }
        } else {
            // Limpa imediatamente o localStorage do carrinho
            localStorage.removeItem('cartItems');
        }

        // 2. Auth Session
        const restoreSession = async () => {
            try {
                const user = await api.getCurrentUser();
                if (user) {
                    if (user.role === UserRole.ADMIN || user.role === UserRole.PHOTOGRAPHER) {
                        const hasActiveSession = sessionStorage.getItem('active_session_panel');
                        const isResetPassword = window.location.pathname === '/reset-password' || window.location.pathname.startsWith('/reset-password');
                        if (!hasActiveSession && !isResetPassword) {
                            console.log("Sessão antiga de painel detectada, mas a aba foi fechada. Deslogando.");
                            await api.logout();
                            setCurrentUser(null);
                            return;
                        } else {
                            // Garante que a flag esteja na sessão
                            sessionStorage.setItem('active_session_panel', 'true');
                        }
                    }

                    console.log("Session restored for:", user.email);
                    setCurrentUser(user);
                }
            } catch (error) {
                console.warn("Failed to restore session:", error);
            } finally {
                setIsSessionLoading(false);
            }
        };
        restoreSession();

        // PERFORMANCE: Preload FaceAPI models in background
        const preloadModels = async () => {
            try {
                console.log("App mounted: Starting background model preloading...");
                setTimeout(() => {
                    import('./services/faceRecognition').then(({ faceRecognitionService }) => {
                        faceRecognitionService.loadPreciseModel().catch(e => console.warn("Background model load failed", e));
                    });
                }, 5000); // Reduced delay to 5s
            } catch (e) {
                console.warn("Preload error", e);
            }
        };
        preloadModels();
    }, []);

    // Helper to converting Page to URL
    const getUrlFromPage = (page: Page): string => {
        switch (page.name) {
            case 'home': return '/';
            case 'find-photos': return page.initialSearch ? `/encontrar-fotos?q=${encodeURIComponent(page.initialSearch)}` : '/encontrar-fotos';
            case 'login': return '/login';
            case 'register': return '/cadastro';
            case 'pending-approval': return '/aguardando-aprovacao';
            case 'admin': return '/admin';
            case 'photographer': return '/area-fotografo';
            case 'customer-dashboard': return '/minhas-compras';
            case 'category': return `/categoria/${page.id}`;
            case 'event': return `/evento/${page.id}`;
            case 'photo-detail': return `/foto/${page.id}`;
            case 'photographer-portfolio': return `/portfolio/${page.photographerId}`;
            case 'about': return '/sobre';
            case 'contact': return '/contato';
            case 'help-center': return '/ajuda';
            case 'terms': return '/termos';
            case 'privacy': return '/privacidade';
            case 'featured-photos': return '/fotos-destaque';
            case 'discover': return page.initialSearch ? `/descobrir?q=${encodeURIComponent(page.initialSearch)}` : '/descobrir';
            case 'photographers': return '/fotografos';
            case 'cart': return '/carrinho';
            case 'checkout': return '/checkout';
            case 'checkout-success': return '/checkout-success';

            // case 'face-search': return '/busca-facial'; // Modal usually
            case 'reset-password': return page.token ? `/reset-password?token=${page.token}` : '/reset-password';
            case 'not-found': return '/404';
            default: return '/';
        }
    };

    // Helper to convert URL to Page (for initial load / popstate)
    const getPageFromUrl = (pathname: string, searchParams: URLSearchParams): Page => {
        if (pathname === '/' || pathname === '') return { name: 'home' };
        if (pathname === '/login') return { name: 'login' };
        if (pathname === '/cadastro') return { name: 'register' };
        if (pathname === '/aguardando-aprovacao') return { name: 'pending-approval' };
        if (pathname === '/admin') return { name: 'admin' };
        if (pathname === '/area-fotografo') return { name: 'photographer' };
        if (pathname === '/minhas-compras') return { name: 'customer-dashboard' };
        if (pathname === '/sobre') return { name: 'about' };
        if (pathname === '/contato') return { name: 'contact' };
        if (pathname === '/ajuda') return { name: 'help-center' };
        if (pathname === '/termos') return { name: 'terms' };
        if (pathname === '/privacidade') return { name: 'privacy' };
        if (pathname === '/fotos-destaque') return { name: 'featured-photos' };
        if (pathname === '/fotografos') return { name: 'photographers' }; // Wait, is the page name 'photographers'? Let's keep it consistent.
        if (pathname === '/404') return { name: 'not-found' };
        if (pathname === '/encontrar-fotos') {
            const q = searchParams.get('q');
            return { name: 'find-photos', initialSearch: q || undefined };
        }
        if (pathname === '/carrinho') return { name: 'cart' };
        if (pathname === '/checkout') return { name: 'checkout' };
        if (pathname === '/checkout-success') return { name: 'checkout-success' };

        if (pathname === '/reset-password') return { name: 'reset-password', token: searchParams.get('token') || undefined };

        // Dynamic routes
        if (pathname.startsWith('/descobrir')) {
            const q = searchParams.get('q');
            return { name: 'discover', initialSearch: q || undefined };
        }

        const categoryMatch = pathname.match(/^\/categoria\/(.+)$/);
        if (categoryMatch) return { name: 'category', id: categoryMatch[1] };

        const eventMatch = pathname.match(/^\/evento\/(.+)$/);
        if (eventMatch) return { name: 'event', id: eventMatch[1] };

        const photoMatch = pathname.match(/^\/foto\/(.+)$/);
        if (photoMatch) return { name: 'photo-detail', id: photoMatch[1] };

        const portfolioMatch = pathname.match(/^\/portfolio\/(.+)$/);
        if (portfolioMatch) return { name: 'photographer-portfolio', photographerId: portfolioMatch[1] };

        return { name: 'not-found' };
    };
    // Ref to access current state in event listeners without re-triggering effects
    const currentPageRef = React.useRef(currentPage);
    useEffect(() => {
        currentPageRef.current = currentPage;
        
        // Trigger progress bar on route change
        setIsNavigating(true);
        const timer = setTimeout(() => {
            setIsNavigating(false);
        }, 600); // Simulate network transition time
        
        return () => clearTimeout(timer);
    }, [currentPage]);

    // Handle initial navigation and URL routing
    useEffect(() => {
        const handleLocationChange = () => {
            const currentPath = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            const newPage = getPageFromUrl(currentPath, searchParams);

            // Structurally compare to avoid unnecessary updates/rerenders
            setCurrentPage(prev => {
                const isSame =
                    prev.name === newPage.name &&
                    (prev as any).id === (newPage as any).id &&
                    (prev as any).photographerId === (newPage as any).photographerId &&
                    (prev as any).token === (newPage as any).token &&
                    (prev as any).initialSearch === (newPage as any).initialSearch;

                return isSame ? prev : newPage;
            });
        };

        // Initial Load
        // Se o usuário entrou direto no painel (por link direto ou refresh) 
        // e clicar em Voltar, o navegador pode tirá-lo do site (ex: voltar pro Google).
        // Para evitar isso, injetamos a Home ('/') no histórico antes de carregar o painel.
        const currentPath = window.location.pathname;
        if (currentPath === '/admin' || currentPath === '/area-fotografo') {
            window.history.replaceState(null, '', '/');
            window.history.pushState(null, '', currentPath + window.location.search + window.location.hash);
        }

        handleLocationChange();

        // Browser Back/Forward
        const handlePopState = (e: PopStateEvent) => {
            const currentPath = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            const newPage = getPageFromUrl(currentPath, searchParams);

            // Trap logic for panels
            const state = currentPageRef.current;
            if ((state.name === 'admin' || state.name === 'photographer') && newPage.name !== state.name) {
                window.history.pushState(null, '', getUrlFromPage(state));
                showToast("Use o botão Sair do menu para sair do painel.", "info");
                return;
            }

            handleLocationChange();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showToast]); // Remove currentPage dependency to avoid infinite loop

    // Sync Cart with LocalStorage (Client) and Backend (User) when it changes
    useEffect(() => {
        // 1. Save to LocalStorage (client persistence for current session)
        localStorage.setItem('cartItems', JSON.stringify(cartItems));

        // 2. Sync with Backend (if logged in)
        if (currentUser) {
            api.syncCart(currentUser.id, cartItems);
        }
    }, [cartItems, currentUser]);

    const handleLoginSuccess = async (user: User) => {
        if (user.role === UserRole.ADMIN || user.role === UserRole.PHOTOGRAPHER) {
            sessionStorage.setItem('active_session_panel', 'true');
        }
        setCurrentUser(user);

        // Redirection based on role
        if (user.role === UserRole.PHOTOGRAPHER) {
            handleNavigate({ name: 'photographer' }, user);
        } else if (user.role === UserRole.ADMIN) {
            handleNavigate({ name: 'admin' }, user);
        } else {
            // Customers stay on the same page
        }

        // If customer, fetch their saved cart
        if (user.role === UserRole.CUSTOMER) {
            try {
                const savedUserCart = await api.getUserCart(user.id);
                // Merge unique items
                const mergedCart = Array.from(new Set([...cartItems, ...savedUserCart]));
                setCartItems(mergedCart);
            } catch (e) {
                console.error("Failed to retrieve user cart", e);
            }
        }
    };

    const handleLogout = async () => {
        try {
            sessionStorage.removeItem('active_session_panel');
            await api.logout();
            console.log("Logged out from Supabase");
        } catch (e) {
            console.error("Logout failed", e);
        }
        setCurrentUser(null);
        setCartItems([]);
        localStorage.removeItem('cartItems');
        localStorage.removeItem('appliedCoupon');
        handleNavigate({ name: 'home' });
    };

    const handleNavigate = (page: Page, overrideUser?: User | null) => {
        if (page.toastMessage) {
            showToast(page.toastMessage, page.toastType || 'info');
        }

        const activeUser = overrideUser !== undefined ? overrideUser : currentUser;

        if (page.name === 'login') {
            setIsLoginModalOpen(true);
            setIsRegisterModalOpen(false);
            return;
        }

        if (page.name === 'register') {
            setIsRegisterModalOpen(true);
            setIsLoginModalOpen(false);
            return;
        }

        if (page.name === 'photo-detail') {
            setCurrentPage(page);
            window.scrollTo(0, 0);
            window.history.pushState(null, '', getUrlFromPage(page));
            return;
        }

        if (page.name === 'face-search') {
            setIsFaceSearchModalOpen(true);
            return;
        }

        if (page.name === 'admin' && activeUser?.role !== UserRole.ADMIN) {
            return;
        }
        if (page.name === 'photographer' && activeUser?.role !== UserRole.PHOTOGRAPHER) {
            return;
        }
        setCurrentPage(page);
        window.scrollTo(0, 0);

        // Update URL
        const newUrl = getUrlFromPage(page);
        if (newUrl) {
            window.history.pushState(null, '', newUrl);
        }
    }

    const handleAddToCart = (photoId: string, imgElement?: HTMLImageElement) => {
        if (!cartItems.includes(photoId)) {
            // Animation Logic
            if (imgElement) {
                const rect = imgElement.getBoundingClientRect();
                const cartBtn = document.getElementById('cart-btn');

                if (cartBtn) {
                    const cartRect = cartBtn.getBoundingClientRect();
                    setFlyingImage({
                        src: imgElement.src,
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        opacity: 1
                    });

                    setTimeout(() => {
                        setFlyingImage({
                            src: imgElement.src,
                            top: cartRect.top + 10,
                            left: cartRect.left + 10,
                            width: 20,
                            height: 20,
                            opacity: 0.2
                        });
                    }, 50);

                    setTimeout(() => {
                        setFlyingImage(null);
                        setCartItems(prev => [...prev, photoId]);
                        showToast("Foto adicionada ao carrinho!");
                    }, 800);
                    return;
                }
            }

            setCartItems(prev => [...prev, photoId]);
            showToast("Foto adicionada ao carrinho!");

        } else {
            showToast("Esta foto já está no seu carrinho.", "info");
        }
    };

    const handleRemoveFromCart = (photoId: string) => {
        setCartItems(prev => prev.filter(id => id !== photoId));
    }

    const handleRemoveMultipleFromCart = (photoIds: string[]) => {
        setCartItems(prev => prev.filter(id => !photoIds.includes(id)));
    }

    const handleCheckoutInit = () => {
        if (cartItems.length === 0) return;
        if (!currentUser) {
            showToast("Você precisa estar logado para finalizar a compra.", "error");
            handleNavigate({ name: 'login' });
            return;
        }
        handleNavigate({ name: 'checkout' });
    }

    const handlePurchaseComplete = () => {
        showToast("Compra realizada com sucesso!", "success");
        setCartItems([]);
        handleNavigate({ name: 'customer-dashboard' });
    };

    const { confirm } = useConfirm();

    const handleBuyPhoto = async (photoId: string) => {
        if (!currentUser) {
            showToast("Por favor, faça login para comprar.", "info");
            handleNavigate({ name: 'login' });
            return;
        }

        const isConfirmed = await confirm({
            title: "Simular Compra",
            message: "Simular compra desta foto?",
            confirmText: "Simular",
            variant: 'primary'
        });

        if (!isConfirmed) return;

        const success = await api.purchasePhoto(photoId, currentUser.id);
        if (success) {
            showToast("Compra realizada com sucesso!", "success");
            setSelectedPhotoId(null);
            setCartItems(cartItems.filter(id => id !== photoId));
            if (currentPage.name === 'photo-detail' && currentPage.id === photoId) {
                handleNavigate({ name: 'photo-detail', id: photoId });
            }
        } else {
            showToast("Erro ao processar compra.", "error");
        }
    };

    const renderPage = () => {
        switch (currentPage.name) {
            case 'home':
                return <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'login':
                return <LoginPage onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
            case 'register':
                return <RegisterPage onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
            case 'pending-approval':
                return <PendingApprovalPage onNavigate={handleNavigate} />;
            case 'admin':
                if (isSessionLoading) return <Spinner size="lg" fullHeight={true} label="Autenticando sessão..." />;
                return currentUser?.role === UserRole.ADMIN ? <AdminPage onNavigate={handleNavigate} /> : <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'photographer':
                if (isSessionLoading) return <Spinner size="lg" fullHeight={true} label="Autenticando sessão..." />;
                return currentUser?.role === UserRole.PHOTOGRAPHER ? <PhotographerPage user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} showToast={showToast} /> : <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'customer-dashboard':
                if (isSessionLoading) return <Spinner size="lg" fullHeight={true} label="Autenticando sessão..." />;
                return <CustomerDashboardPage onNavigate={handleNavigate} currentUser={currentUser} />;
            case 'find-photos':
                const findPhotosSearch = currentPage.name === 'find-photos' ? currentPage.initialSearch : undefined;
                return <FindPhotosPage onNavigate={handleNavigate} initialSearch={findPhotosSearch} />;
            case 'category':
                return <CategoryPage categoryId={currentPage.id} onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'event':
                return <EventPage eventId={currentPage.id} onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'photo-detail':
                return <PhotoDetailPage
                    photoId={currentPage.id}
                    onNavigate={handleNavigate}
                    currentUser={currentUser}
                    onAddToCart={handleAddToCart}
                />;
            case 'photographer-portfolio':
                return <PhotographerPortfolioPage photographerId={currentPage.photographerId} onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'about':
                return <AboutPage />;
            case 'contact':
                return <ContactPage onNavigate={handleNavigate} />;
            case 'help-center':
                return <HelpCenterPage onNavigate={handleNavigate} />;
            case 'terms':
                return <TermsPage />;
            case 'privacy':
                return <PrivacyPage />;
            case 'featured-photos':
                return <FeaturedPhotosPage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'discover':
                const initialSearch = currentPage.name === 'discover' ? currentPage.initialSearch : undefined;
                return <DiscoverPage onNavigate={handleNavigate} initialSearch={initialSearch} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'photographers':
                return <PhotographersPage onNavigate={handleNavigate} />;
            case 'cart':
                return <CartPage cartItemIds={cartItems} currentUser={currentUser} onRemoveItem={handleRemoveFromCart} onRemoveMultipleItems={handleRemoveMultipleFromCart} onCheckout={handleCheckoutInit} onNavigate={handleNavigate} />;
            case 'checkout':
                return <CheckoutPage cartItemIds={cartItems} currentUser={currentUser} onPurchaseComplete={handlePurchaseComplete} onNavigate={handleNavigate} />;
            case 'checkout-success':
                return <CheckoutSuccessPage currentUser={currentUser} onClearCart={() => setCartItems([])} onNavigate={handleNavigate} />;

            case 'reset-password':
                return <ResetPasswordPage token={currentPage.token} onNavigate={handleNavigate} />;
            case 'not-found':
                return <NotFoundPage onNavigate={handleNavigate} />;
            default:
                if (isSessionLoading) return <Spinner size="lg" fullHeight={true} label="Autenticando sessão..." />;
                return <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
        }
    }

    const showFooter = !['admin', 'photographer', 'login', 'register', 'pending-approval', 'checkout', 'checkout-success'].includes(currentPage.name);

    return (
        <div className="bg-neutral-100 text-neutral-800 min-h-screen flex flex-col font-sans relative">
            <TopProgressBar isAnimating={isNavigating} />
            <Header
                user={currentUser}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                currentView={currentPage.name}
                cartCount={cartItems.length}
            />
            <main className="flex-grow relative">
                {isNavigating ? (
                    <Spinner size="lg" fullHeight={true} label="Carregando..." />
                ) : (
                    <Suspense fallback={<Spinner size="lg" fullHeight={true} label="Carregando página..." />}>
                        {renderPage()}
                    </Suspense>
                )}

                {flyingImage && (
                    <img
                        src={flyingImage.src}
                        alt=""
                        className="fixed z-[5000] pointer-events-none rounded-lg shadow-2xl object-cover border-2 border-white"
                        style={{
                            top: flyingImage.top,
                            left: flyingImage.left,
                            width: flyingImage.width,
                            height: flyingImage.height,
                            opacity: flyingImage.opacity,
                            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    />
                )}
            </main>
            {showFooter && <Footer onNavigate={handleNavigate} />}

            {isLoginModalOpen && (
                <LoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => setIsLoginModalOpen(false)}
                    onLoginSuccess={handleLoginSuccess}
                    onNavigate={handleNavigate}
                />
            )}
            {isRegisterModalOpen && (
                <RegisterModal
                    isOpen={isRegisterModalOpen}
                    onClose={() => setIsRegisterModalOpen(false)}
                    onLoginSuccess={handleLoginSuccess}
                    onNavigate={handleNavigate}
                    onShowToast={showToast}
                />
            )}
            {isFaceSearchModalOpen && (
                <FaceSearchModal
                    isOpen={isFaceSearchModalOpen}
                    onClose={() => setIsFaceSearchModalOpen(false)}
                    onNavigate={handleNavigate}
                    onAddToCart={handleAddToCart}
                    onShowToast={showToast}
                />
            )}
            {selectedPhotoId && (
                <PhotoDetailModal
                    photoId={selectedPhotoId}
                    onClose={() => setSelectedPhotoId(null)}
                    onAddToCart={handleAddToCart}
                    onBuy={handleBuyPhoto}
                />
            )}
            <CookieBanner onNavigate={handleNavigate} />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <ConfirmProvider>
                <MainApp />
            </ConfirmProvider>
        </ToastProvider>
    );
};

export default App;

