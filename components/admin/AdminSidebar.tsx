
import React from 'react';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../LanguageSelector';

type AdminView = 'dashboard' | 'photos' | 'photographers' | 'producers' | 'customers' | 'categories' | 'sales' | 'payouts' | 'settings' | 'storage-requests' | 'rekognition' | 'appmax' | 'remarketing';

interface AdminSidebarProps {
    activeView: AdminView;
    setView: (view: AdminView, context?: any) => void;
    notificationCounts?: {
        payouts?: number;
        photographers?: number;
    };
    isOpen: boolean;
    onClose: () => void;
}

const NavLink: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    notificationCount?: number;
}> = ({ label, isActive, onClick, icon, notificationCount }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-md transition-colors text-sm font-medium ${isActive
                ? 'bg-primary text-white'
                : 'text-neutral-700 hover:bg-neutral-200'
                }`}
        >
            <div className="flex items-center">
                <span className="mr-3">{icon}</span>
                {label}
            </div>
            {notificationCount && notificationCount > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {notificationCount}
                </span>
            ) : null}
        </button>
    );
};

const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12v7a6 6 0 0 1-12 0V4z"></path></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const MegaphoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
);
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const ScanFaceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><circle cx="12" cy="12" r="3"></circle><path d="M12 5v2"></path><path d="M12 17v2"></path><path d="M5 12h2"></path><path d="M17 12h2"></path></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeView, setView, notificationCounts, isOpen, onClose }) => {
    const { t } = useLanguage();

    const nav = (view: AdminView) => {
        setView(view);
        onClose();
    };

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 backdrop-blur-sm ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:sticky top-0 md:top-20 left-0 z-50
                    h-full md:h-auto w-72 md:w-64
                    bg-white p-4 rounded-lg shadow-2xl md:shadow-md
                    md:self-start
                    overflow-y-auto
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Mobile header with close button */}
                <div className="md:hidden flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                    <Logo size={20} useImage={true} />
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <XIcon />
                    </button>
                </div>

                <div className="hidden md:flex justify-between items-center mb-6 px-2">
                    <div className="transition-transform hover:scale-105 active:scale-95 cursor-pointer" onClick={() => nav('dashboard')}>
                        <Logo size={24} useImage={true} />
                    </div>
                </div>
                <nav className="space-y-2">
                    <NavLink label={t('admin.sidebar_dashboard')} isActive={activeView === 'dashboard'} onClick={() => nav('dashboard')} icon={<HomeIcon />} />
                    <NavLink label={t('admin.sidebar_categories')} isActive={activeView === 'categories'} onClick={() => nav('categories')} icon={<TagIcon />} />
                    <NavLink label={t('admin.sidebar_photographers')} isActive={activeView === 'photographers'} onClick={() => nav('photographers')} icon={<UsersIcon />} notificationCount={notificationCounts?.photographers} />
                    <NavLink label="Produtores" isActive={activeView === 'producers'} onClick={() => nav('producers')} icon={<TrophyIcon />} />
                    <NavLink label={t('admin.sidebar_customers')} isActive={activeView === 'customers'} onClick={() => nav('customers')} icon={<UserGroupIcon />} />
                    <NavLink label={t('admin.sidebar_remarketing')} isActive={activeView === 'remarketing'} onClick={() => nav('remarketing')} icon={<MegaphoneIcon />} />
                    <NavLink label={t('admin.sidebar_photos')} isActive={activeView === 'photos'} onClick={() => nav('photos')} icon={<ImageIcon />} />
                    <NavLink label={t('admin.sidebar_sales')} isActive={activeView === 'sales'} onClick={() => nav('sales')} icon={<DollarSignIcon />} />
                    <NavLink
                        label={t('admin.sidebar_payouts')}
                        isActive={activeView === 'payouts'}
                        onClick={() => nav('payouts')}
                        icon={<CreditCardIcon />}
                        notificationCount={notificationCounts?.payouts}
                    />

                    <NavLink label="Appmax Gateway" isActive={activeView === 'appmax'} onClick={() => nav('appmax')} icon={<CreditCardIcon />} />
                    <NavLink label={t('admin.sidebar_rekognition')} isActive={activeView === 'rekognition'} onClick={() => nav('rekognition')} icon={<ScanFaceIcon />} />
                    <div className="pt-2 my-2 border-t"></div>
                    <NavLink label={t('admin.sidebar_settings')} isActive={activeView === 'settings'} onClick={() => nav('settings')} icon={<SettingsIcon />} />
                </nav>
            </aside>
        </>
    );
};

export default AdminSidebar;


