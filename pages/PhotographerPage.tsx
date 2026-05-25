import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import api from '../services/api';
import PhotographerSidebar from '../components/photographer/PhotographerSidebar';
import PhotographerDashboard from '../components/photographer/PhotographerDashboard';
import PhotographerPhotos from '../components/photographer/PhotographerPhotos';
import PhotographerSales from '../components/photographer/PhotographerSales';
import PhotographerPayouts from '../components/photographer/PhotographerPayouts';
import PhotographerProfile from '../components/photographer/PhotographerProfile';
import PhotographerPortfolioPreview from '../components/photographer/PhotographerPortfolioPreview';
import PhotographerCoupons from '../components/photographer/PhotographerCoupons';
import PhotographerAbandonedCarts from '../components/photographer/PhotographerAbandonedCarts';
import PhotographerDiscounts from '../components/photographer/PhotographerDiscounts';
import CommunicationSettings from '../components/photographer/CommunicationSettings';
import PhotographerBusinessCard from '../components/photographer/PhotographerBusinessCard';

type PhotographerView = 'dashboard' | 'photos' | 'sales' | 'payouts' | 'profile' | 'portfolio-preview' | 'coupons' | 'abandoned-carts' | 'discounts' | 'communications' | 'business-card';

const KeepAliveView = React.memo(
    ({ active, children, index = 0 }: { active: boolean; children: React.ReactNode; index?: number }) => {
        const [hasMounted, setHasMounted] = useState(active);

        // Mount immediately if it becomes active
        useEffect(() => {
            if (active && !hasMounted) {
                setHasMounted(true);
            }
        }, [active, hasMounted]);

        // Background pre-mount staggered by index
        // This ensures the menus are pre-rendered and pre-fetched before the user even clicks them!
        useEffect(() => {
            if (!hasMounted && !active) {
                const timer = setTimeout(() => {
                    setHasMounted(true);
                }, 500 + (index * 400));
                return () => clearTimeout(timer);
            }
        }, [hasMounted, active, index]);

        if (!hasMounted) return null;

        return (
            <div className={active ? 'block animate-fadeIn' : 'hidden'}>
                {children}
            </div>
        );
    },
    (prevProps, nextProps) => !prevProps.active && !nextProps.active
);

interface PhotographerPageProps {
    user: User;
    onLogout: () => void;
    onNavigate: (page: Page) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PhotographerPage: React.FC<PhotographerPageProps> = ({ user: initialUser, onLogout, onNavigate, showToast }) => {
    const getInitialView = (): PhotographerView => {
        const hash = window.location.hash.replace('#', '');
        return (hash as PhotographerView) || 'dashboard';
    };

    const [view, setView] = useState<PhotographerView>(getInitialView);
    const [currentUser, setCurrentUser] = useState<User>(initialUser);
    const [abandonedCartsCount, setAbandonedCartsCount] = useState(0);

    if (!initialUser) {
        return null;
    }

    useEffect(() => {
        setCurrentUser(initialUser);
    }, [initialUser]);

    const handleRefreshUser = async () => {
        try {
            const updatedUser = await api.getPhotographerById(currentUser.id);
            if (updatedUser) {
                setCurrentUser(updatedUser);
            }
        } catch (error) {
            console.error("Failed to refresh user data", error);
        }
    };

    const fetchAbandonedCount = async () => {
        try {
            const carts = await api.getAbandonedCartsByPhotographerId(currentUser.id);

            if (view === 'abandoned-carts') {
                const cartIds = carts.map(c => c.id);
                localStorage.setItem(`viewedAbandonedCarts_${currentUser.id}`, JSON.stringify(cartIds));
                setAbandonedCartsCount(0);
                return;
            }

            const viewedCarts = JSON.parse(localStorage.getItem(`viewedAbandonedCarts_${currentUser.id}`) || '[]');
            const newCartsCount = carts.filter(c => !viewedCarts.includes(c.id)).length;
            setAbandonedCartsCount(newCartsCount);
        } catch (e) {
            console.warn("Failed to fetch abandoned count", e);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchAbandonedCount();
            // Polling for new carts every 5 minutes
            const interval = setInterval(fetchAbandonedCount, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    // Recalculates badge completely to 0 and stores seen cars when entering the tab
    useEffect(() => {
        if (view === 'abandoned-carts' && currentUser) {
            fetchAbandonedCount();
        }
    }, [view, currentUser]);

    useEffect(() => {
        const handleHashChange = () => {
            setView(getInitialView());
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleSetView = (newView: PhotographerView) => {
        if (window.location.hash.replace('#', '') !== newView) {
            window.location.hash = newView;
        }
        setView(newView);
        window.scrollTo(0, 0);
    };

    const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(Date.now());

    const handleDataChange = () => setPortfolioRefreshTrigger(Date.now());

    const renderView = () => {
        return (
            <>
                <KeepAliveView active={view === 'dashboard'} index={0}>
                    <PhotographerDashboard user={currentUser} setView={handleSetView} showToast={showToast} />
                </KeepAliveView>
                <KeepAliveView active={view === 'photos'} index={1}>
                    <PhotographerPhotos user={currentUser} onDataChange={handleDataChange} isActive={view === 'photos'} />
                </KeepAliveView>
                <KeepAliveView active={view === 'portfolio-preview'} index={2}>
                    <PhotographerPortfolioPreview user={currentUser} onNavigate={onNavigate} editable={true} isActive={view === 'portfolio-preview'} refreshTrigger={portfolioRefreshTrigger} />
                </KeepAliveView>
                <KeepAliveView active={view === 'sales'} index={3}>
                    <PhotographerSales user={currentUser} />
                </KeepAliveView>
                <KeepAliveView active={view === 'abandoned-carts'} index={4}>
                    <PhotographerAbandonedCarts user={currentUser} setView={handleSetView} />
                </KeepAliveView>
                <KeepAliveView active={view === 'payouts'} index={5}>
                    <PhotographerPayouts user={currentUser} />
                </KeepAliveView>
                <KeepAliveView active={view === 'profile'} index={6}>
                    <PhotographerProfile user={currentUser} onProfileUpdate={handleRefreshUser} showToast={showToast} />
                </KeepAliveView>
                <KeepAliveView active={view === 'coupons'} index={7}>
                    <PhotographerCoupons user={currentUser} />
                </KeepAliveView>
                <KeepAliveView active={view === 'discounts'} index={8}>
                    <PhotographerDiscounts user={currentUser} showToast={showToast} />
                </KeepAliveView>
                <KeepAliveView active={view === 'communications'} index={9}>
                    <CommunicationSettings user={currentUser} onUpdate={handleRefreshUser} />
                </KeepAliveView>
                {view === 'business-card' && (
                    <PhotographerBusinessCard user={currentUser} />
                )}
            </>
        );
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // ... (effects and other functions)

    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Mobile Header Toggle */}
                <div className="md:hidden flex items-center justify-between py-4 mb-2">
                    <h1 className="text-xl font-display font-bold text-neutral-900">Painel do Fotógrafo</h1>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -mr-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row min-h-[calc(100vh-128px)]">
                    <PhotographerSidebar
                        activeView={view}
                        setView={handleSetView}
                        user={currentUser}
                        onLogout={onLogout}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        abandonedCartsCount={abandonedCartsCount}
                    />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-neutral-100 rounded-lg md:ml-4 mt-0 md:mt-0 min-w-0 overflow-x-hidden">
                        {renderView()}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default PhotographerPage;

