
import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminCategories from '../components/admin/AdminCategories';
import AdminPhotographers from '../components/admin/AdminPhotographers';
import AdminCustomers from '../components/admin/AdminCustomers';
import AdminPhotos from '../components/admin/AdminPhotos';
import AdminSales from '../components/admin/AdminSales';
import AdminPayouts from '../components/admin/AdminPayouts';
import AdminSettings from '../components/admin/AdminSettings';
import { Page } from '../types';
import api from '../services/api';

type AdminView = 'dashboard' | 'photos' | 'photographers' | 'customers' | 'categories' | 'sales' | 'payouts' | 'settings';

interface AdminPageProps {
    onNavigate: (page: Page) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
    const [view, setView] = useState<AdminView>('dashboard');
    const [navContext, setNavContext] = useState<any>(null);
    const [notificationCounts, setNotificationCounts] = useState<{payouts: number}>({ payouts: 0 });

    const handleSetView = (newView: AdminView, context: any = null) => {
        setView(newView);
        setNavContext(context);
        window.scrollTo(0, 0);
    };

    // Update notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const payoutsCount = await api.getPendingPayoutsCount();
                setNotificationCounts(prev => ({ ...prev, payouts: payoutsCount }));
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };
        fetchNotifications();
        // Update every minute or when view changes
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [view]);

    const renderView = () => {
        switch(view) {
            case 'dashboard':
                return <AdminDashboard setView={handleSetView} />;
            case 'categories':
                 return <AdminCategories />;
            case 'photographers':
                return <AdminPhotographers onNavigate={onNavigate} />;
            case 'customers':
                return <AdminCustomers />;
            case 'photos':
                return <AdminPhotos context={navContext} setContext={setNavContext} />;
            case 'sales':
                return <AdminSales />;
            case 'payouts':
                return <AdminPayouts />;
            case 'settings':
                return <AdminSettings />;
            default:
                return <AdminDashboard setView={handleSetView} />;
        }
    }

    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row min-h-[calc(100vh-128px)]">
                    <AdminSidebar activeView={view} setView={handleSetView} notificationCounts={notificationCounts} />
                    <main className="flex-1 p-8 bg-neutral-100 rounded-lg md:ml-4 mt-4 md:mt-0">
                        {renderView()}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;