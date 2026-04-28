
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
import AdminStorageRequests from '../components/admin/AdminStorageRequests';
import AdminRekognitionStats from '../components/admin/AdminRekognitionStats';
import { Page } from '../types';
import api from '../services/api';

type AdminView = 'dashboard' | 'photos' | 'photographers' | 'customers' | 'categories' | 'sales' | 'payouts' | 'settings' | 'storage-requests' | 'rekognition';

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

interface AdminPageProps {
    onNavigate: (page: Page) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
    const [view, setView] = useState<AdminView>('dashboard');
    const [navContext, setNavContext] = useState<any>(null);
    const [notificationCounts, setNotificationCounts] = useState<{ payouts: number; reports: number }>({ payouts: 0, reports: 0 });

    // ...

    const renderView = () => {
        return (
            <>
                <KeepAliveView active={view === 'dashboard'} index={0}>
                    <AdminDashboard setView={handleSetView} />
                </KeepAliveView>
                <KeepAliveView active={view === 'categories'} index={1}>
                    <AdminCategories />
                </KeepAliveView>
                <KeepAliveView active={view === 'photographers'} index={2}>
                    <AdminPhotographers onNavigate={onNavigate} />
                </KeepAliveView>
                <KeepAliveView active={view === 'customers'} index={3}>
                    <AdminCustomers />
                </KeepAliveView>
                <KeepAliveView active={view === 'photos'} index={4}>
                    <AdminPhotos context={navContext} setContext={setNavContext} />
                </KeepAliveView>
                <KeepAliveView active={view === 'sales'} index={5}>
                    <AdminSales />
                </KeepAliveView>
                <KeepAliveView active={view === 'payouts'} index={6}>
                    <AdminPayouts />
                </KeepAliveView>
                <KeepAliveView active={view === 'storage-requests'} index={7}>
                    <AdminStorageRequests />
                </KeepAliveView>
                <KeepAliveView active={view === 'settings'} index={8}>
                    <AdminSettings />
                </KeepAliveView>
                <KeepAliveView active={view === 'rekognition'} index={9}>
                    <AdminRekognitionStats />
                </KeepAliveView>
            </>
        );
    }

    const handleSetView = (newView: AdminView, context: any = null) => {
        setView(newView);
        setNavContext(context);
        window.scrollTo(0, 0);
    };

    // Update notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const [payoutsCount, reportsCount] = await Promise.all([
                    api.getPendingPayoutsCount(),
                    api.getPendingReportsCount(),
                ]);
                setNotificationCounts({ payouts: payoutsCount, reports: reportsCount });
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };
        fetchNotifications();
        // Update every minute or when view changes
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [view]);



    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row min-h-[calc(100vh-128px)]">
                    <AdminSidebar activeView={view} setView={handleSetView} notificationCounts={{ payouts: notificationCounts.payouts, photographers: notificationCounts.reports }} />
                    <main className="flex-1 p-8 bg-neutral-100 rounded-lg md:ml-4 mt-4 md:mt-0">
                        {renderView()}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;