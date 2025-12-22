import React, { useState, useEffect, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { User, UserRole, Page } from './types';
import api from './services/api';
import PhotoDetailModal from './components/PhotoDetailModal';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import FaceSearchModal from './components/FaceSearchModal';
import Toast from './components/Toast';
import Spinner from './components/Spinner';

// Lazy load pages for performance optimization
const HomePage = React.lazy(() => import('./pages/HomePage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const FeaturedPhotosPage = React.lazy(() => import('./pages/FeaturedPhotosPage'));
const PhotographerPage = React.lazy(() => import('./pages/PhotographerPage'));
const PhotographerPortfolioPage = React.lazy(() => import('./pages/PhotographerPortfolioPage'));
const DiscoverPage = React.lazy(() => import('./pages/DiscoverPage'));
const PhotographersPage = React.lazy(() => import('./pages/PhotographersPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const PendingApprovalPage = React.lazy(() => import('./pages/PendingApprovalPage'));
const PhotoDetailPage = React.lazy(() => import('./pages/PhotoDetailPage'));
const CustomerDashboardPage = React.lazy(() => import('./pages/CustomerDashboardPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const HelpCenterPage = React.lazy(() => import('./pages/HelpCenterPage'));
const TestStripePage = React.lazy(() => import('./pages/TestStripePage'));

interface FlyingImage {
    src: string;
    top: number;
    left: number;
    width: number;
    height: number;
    opacity: number;
}

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>({ name: 'home' });
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isFaceSearchModalOpen, setIsFaceSearchModalOpen] = useState(false);
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [cartItems, setCartItems] = useState<string[]>([]);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Animation State
    const [flyingImage, setFlyingImage] = useState<FlyingImage | null>(null);

    // Initialize cart from localStorage on mount (Client/Guest Cart)
    useEffect(() => {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart from localStorage", e);
            }
        }
    }, []);

    // Sync Cart with LocalStorage (Client) and Backend (User) when it changes
    useEffect(() => {
        // 1. Save to LocalStorage (client persistence for current session)
        localStorage.setItem('cartItems', JSON.stringify(cartItems));

        // 2. Sync with Backend (if logged in as customer)
        if (currentUser && currentUser.role === UserRole.CUSTOMER) {
            api.syncCart(currentUser.id, cartItems);
        }
    }, [cartItems, currentUser]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
    };



    const handleLoginSuccess = async (user: User) => {
        setCurrentUser(user);

        // Immediate redirection based on role (Bypassing handleNavigate checks to avoid race conditions)
        if (user.role === UserRole.PHOTOGRAPHER) {
            setCurrentPage({ name: 'photographer' });
            window.scrollTo(0, 0);
        } else if (user.role === UserRole.ADMIN) {
            setCurrentPage({ name: 'admin' });
            window.scrollTo(0, 0);
        } else {
            // Customers stay on current page (or we could force home if desired)
            // Ideally, we refresh the current view if it depends on user data? 
            // For now, doing nothing preserves context which is good (e.g. on detail page).
        }

        // If customer, fetch their saved cart and merge with current session cart
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

    const handleLogout = () => {
        setCurrentUser(null);
        // Clear session cart on logout so next user/guest starts fresh
        setCartItems([]);
        localStorage.removeItem('cartItems');
        handleNavigate({ name: 'home' });
    };

    const handleNavigate = (page: Page) => {
        // Show toast if provided in navigation
        if (page.toastMessage) {
            showToast(page.toastMessage, page.toastType || 'info');
        }

        // Intercept navigation to Auth pages and open Modals instead
        if (page.name === 'login') {
            setIsLoginModalOpen(true);
            setIsRegisterModalOpen(false); // Close register if open
            return;
        }

        if (page.name === 'register') {
            setIsRegisterModalOpen(true);
            setIsLoginModalOpen(false); // Close login if open
            return;
        }

        if (page.name === 'photo-detail') {
            setCurrentPage(page);
            window.scrollTo(0, 0);
            return;
        }

        if (page.name === 'face-search') {
            setIsFaceSearchModalOpen(true);
            return;
        }

        if (page.name === 'admin' && currentUser?.role !== UserRole.ADMIN) {
            return;
        }
        if (page.name === 'photographer' && currentUser?.role !== UserRole.PHOTOGRAPHER) {
            return;
        }
        setCurrentPage(page);
        window.scrollTo(0, 0); // Scroll to top on page change
    }

    const handleAddToCart = (photoId: string, imgElement?: HTMLImageElement) => {
        if (!cartItems.includes(photoId)) {

            // Animation Logic
            if (imgElement) {
                const rect = imgElement.getBoundingClientRect();
                const cartBtn = document.getElementById('cart-btn');

                if (cartBtn) {
                    const cartRect = cartBtn.getBoundingClientRect();

                    // Initialize at starting position
                    setFlyingImage({
                        src: imgElement.src,
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        opacity: 1
                    });

                    // Trigger animation next tick
                    setTimeout(() => {
                        setFlyingImage({
                            src: imgElement.src,
                            top: cartRect.top + 10, // Center of cart roughly
                            left: cartRect.left + 10,
                            width: 20,
                            height: 20,
                            opacity: 0.2
                        });
                    }, 50);

                    // Cleanup and update cart
                    setTimeout(() => {
                        setFlyingImage(null);
                        setCartItems(prev => [...prev, photoId]);
                        showToast("Foto adicionada ao carrinho!");
                    }, 800); // Match transition duration
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
        setCartItems(cartItems.filter(id => id !== photoId));
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

    const handleBuyPhoto = async (photoId: string) => {
        if (!currentUser) {
            showToast("Por favor, faça login para comprar.", "info");
            handleNavigate({ name: 'login' });
            return;
        }
        if (!confirm("Simular compra desta foto?")) return;

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
                return currentUser?.role === UserRole.ADMIN ? <AdminPage onNavigate={handleNavigate} /> : <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'photographer':
                return currentUser?.role === UserRole.PHOTOGRAPHER ? <PhotographerPage user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} showToast={showToast} /> : <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
            case 'customer-dashboard':
                return <CustomerDashboardPage onNavigate={handleNavigate} currentUser={currentUser} />;
            case 'category':
                return <CategoryPage categoryId={currentPage.id} onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
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
                return <CartPage cartItemIds={cartItems} onRemoveItem={handleRemoveFromCart} onCheckout={handleCheckoutInit} onNavigate={handleNavigate} />;
            case 'checkout':
                return <CheckoutPage cartItemIds={cartItems} currentUser={currentUser} onPurchaseComplete={handlePurchaseComplete} onNavigate={handleNavigate} />;
            case 'test-stripe':
                return <TestStripePage />;
            default:
                return <HomePage onNavigate={handleNavigate} onAddToCart={handleAddToCart} currentUser={currentUser} />;
        }
    }

    const showFooter = !['admin', 'photographer', 'login', 'register', 'pending-approval', 'checkout'].includes(currentPage.name);

    return (
        <div className="bg-neutral-100 text-neutral-800 min-h-screen flex flex-col font-sans">
            <Header
                user={currentUser}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                currentView={currentPage.name}
                cartCount={cartItems.length}
            />
            <main className="flex-grow relative">
                <Suspense fallback={<Spinner />}>
                    {renderPage()}
                </Suspense>

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

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
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
        </div>
    );
};

export default App;