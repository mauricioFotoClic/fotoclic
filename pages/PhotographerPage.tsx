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
        switch(view) {
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

    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row min-h-[calc(100vh-128px)]">
                    <PhotographerSidebar activeView={view} setView={handleSetView} user={currentUser} onLogout={onLogout} />
                    <main className="flex-1 p-8 bg-neutral-100 rounded-lg md:ml-4 mt-4 md:mt-0">
                        {renderView()}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default PhotographerPage;