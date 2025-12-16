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

type PhotographerView = 'dashboard' | 'photos' | 'sales' | 'payouts' | 'profile' | 'portfolio-preview' | 'coupons' | 'abandoned-carts' | 'discounts';

interface PhotographerPageProps {
    user: User;
    onLogout: () => void;
    onNavigate: (page: Page) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PhotographerPage: React.FC<PhotographerPageProps> = ({ user: initialUser, onLogout, onNavigate, showToast }) => {
    const [view, setView] = useState<PhotographerView>('dashboard');
    const [currentUser, setCurrentUser] = useState<User>(initialUser);

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

    const handleSetView = (newView: PhotographerView) => {
        setView(newView);
        window.scrollTo(0, 0);
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <PhotographerDashboard user={currentUser} setView={handleSetView} />;
            case 'photos':
                return <PhotographerPhotos user={currentUser} />;
            case 'sales':
                return <PhotographerSales user={currentUser} />;
            case 'abandoned-carts':
                return <PhotographerAbandonedCarts user={currentUser} setView={handleSetView} />;
            case 'payouts':
                return <PhotographerPayouts user={currentUser} />;
            case 'profile':
                return <PhotographerProfile user={currentUser} onProfileUpdate={handleRefreshUser} />;
            case 'portfolio-preview':
                return <PhotographerPortfolioPreview user={currentUser} onNavigate={onNavigate} editable={true} />;
            case 'coupons':
                return <PhotographerCoupons user={currentUser} />;
            case 'discounts':
                return <PhotographerDiscounts user={currentUser} showToast={showToast} />;
            default:
                return <PhotographerDashboard user={currentUser} setView={handleSetView} />;
        }
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