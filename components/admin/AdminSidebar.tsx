
import React from 'react';

type AdminView = 'dashboard' | 'photos' | 'photographers' | 'customers' | 'categories' | 'sales' | 'payouts' | 'settings';

interface AdminSidebarProps {
  activeView: AdminView;
  setView: (view: AdminView, context?: any) => void;
  notificationCounts?: {
      payouts?: number;
  };
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
            className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-md transition-colors text-sm font-medium ${
                isActive
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
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;


const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeView, setView, notificationCounts }) => {
  return (
    <aside className="md:w-64 bg-white p-4 rounded-lg shadow-md md:self-start sticky top-20">
      <h2 className="text-xl font-display font-bold text-primary-dark mb-6">Painel Admin</h2>
      <nav className="space-y-2">
        <NavLink label="Dashboard" isActive={activeView === 'dashboard'} onClick={() => setView('dashboard')} icon={<HomeIcon />} />
        <NavLink label="Categorias" isActive={activeView === 'categories'} onClick={() => setView('categories')} icon={<TagIcon />} />
        <NavLink label="Fotógrafos" isActive={activeView === 'photographers'} onClick={() => setView('photographers')} icon={<UsersIcon />} />
        <NavLink label="Clientes" isActive={activeView === 'customers'} onClick={() => setView('customers')} icon={<UserGroupIcon />} />
        <NavLink label="Fotos" isActive={activeView === 'photos'} onClick={() => setView('photos')} icon={<ImageIcon />} />
        <NavLink label="Vendas" isActive={activeView === 'sales'} onClick={() => setView('sales')} icon={<DollarSignIcon />} />
        <NavLink 
            label="Pagamentos" 
            isActive={activeView === 'payouts'} 
            onClick={() => setView('payouts')} 
            icon={<CreditCardIcon />} 
            notificationCount={notificationCounts?.payouts}
        />
        <div className="pt-2 my-2 border-t"></div>
        <NavLink label="Configurações" isActive={activeView === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon />} />
      </nav>
    </aside>
  );
};

export default AdminSidebar;
