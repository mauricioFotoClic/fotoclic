
import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
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

import AdminAbacatePay from '../components/admin/AdminAbacatePay';
import AdminRemarketing from '../components/admin/AdminRemarketing';
import { Page, User } from '../types';
import api from '../services/api';

type AdminView = 'dashboard' | 'photos' | 'photographers' | 'customers' | 'categories' | 'sales' | 'payouts' | 'settings' | 'storage-requests' | 'rekognition' | 'abacate' | 'remarketing';

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
    onImpersonate: (user: User) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onNavigate, onImpersonate }) => {
    const getInitialView = (): AdminView => {
        const hash = window.location.hash.replace('#', '');
        return (hash as AdminView) || 'dashboard';
    };

    const [view, setView] = useState<AdminView>(getInitialView);
    const [navContext, setNavContext] = useState<any>(null);
    const [notificationCounts, setNotificationCounts] = useState<{ payouts: number; reports: number }>({ payouts: 0, reports: 0 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [visitedViews, setVisitedViews] = useState<AdminView[]>([getInitialView()]);

    useEffect(() => {
        if (isTransitioning) {
            const timer = setTimeout(() => {
                setIsTransitioning(false);
            }, 450);
            return () => clearTimeout(timer);
        }
    }, [isTransitioning]);

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
                    <AdminPhotographers onNavigate={onNavigate} onImpersonate={onImpersonate} />
                </KeepAliveView>
                <KeepAliveView active={view === 'customers'} index={3}>
                    <AdminCustomers onImpersonate={onImpersonate} />
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
                <KeepAliveView active={view === 'remarketing'} index={10}>
                    <AdminRemarketing />
                </KeepAliveView>

                <KeepAliveView active={view === 'abacate'} index={11}>
                    <AdminAbacatePay />
                </KeepAliveView>
            </>
        );
    }

    const handleSetView = (newView: AdminView, context: any = null) => {
        if (window.location.hash.replace('#', '') !== newView) {
            window.location.hash = newView;
        }
        
        const isAlreadyVisited = visitedViews.includes(newView);
        setView(newView);
        setNavContext(context);
        window.scrollTo(0, 0);

        if (!isAlreadyVisited) {
            setVisitedViews(prev => [...prev, newView]);
            setIsTransitioning(true);
        } else {
            setIsTransitioning(false);
        }
    };

    useEffect(() => {
        const handleHashChange = () => {
            const newView = getInitialView();
            setView(newView);
            
            setVisitedViews(prev => {
                const isAlreadyVisited = prev.includes(newView);
                if (!isAlreadyVisited) {
                    setIsTransitioning(true);
                    return [...prev, newView];
                } else {
                    setIsTransitioning(false);
                    return prev;
                }
            });
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

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
                {/* Mobile header toggle */}
                <div className="md:hidden flex items-center justify-between py-4 mb-2">
                    <h1 className="text-xl font-display font-bold text-neutral-900">Painel Admin</h1>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -mr-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row min-h-[calc(100vh-128px)]">
                    <AdminSidebar
                        activeView={view}
                        setView={handleSetView}
                        notificationCounts={{ payouts: notificationCounts.payouts, photographers: notificationCounts.reports }}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-neutral-100 rounded-lg md:ml-4 mt-0 min-w-0 overflow-x-hidden relative">
                        {isTransitioning && (
                            <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center z-40 rounded-lg">
                                <Spinner size="lg" fullHeight={true} label="Carregando..." />
                            </div>
                        )}
                        {renderView()}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;

