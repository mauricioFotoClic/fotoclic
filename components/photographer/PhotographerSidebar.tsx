
import React from 'react';
import { User } from '../../types';

type PhotographerView = 'dashboard' | 'photos' | 'sales' | 'payouts' | 'profile' | 'portfolio-preview' | 'coupons' | 'abandoned-carts' | 'discounts';

interface PhotographerSidebarProps {
  user: User;
  activeView: PhotographerView;
  setView: (view: PhotographerView) => void;
  onLogout: () => void;
}

const NavLink: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    badge?: string;
}> = ({ label, isActive, onClick, icon, badge }) => {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-center w-full px-4 py-3 mb-1 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                ? 'bg-[#F3E8FF] text-[#8A2BE2]' 
                : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#8A2BE2] rounded-r-md"></div>
            )}
            
            <span className={`mr-3 transition-colors duration-200 ${isActive ? 'text-[#8A2BE2]' : 'text-neutral-400 group-hover:text-neutral-600'}`}>
                {icon}
            </span>
            
            <span>{label}</span>

            {badge && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-[#8A2BE2] rounded shadow-sm">
                    {badge}
                </span>
            )}
        </button>
    );
};

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <p className="px-4 mt-6 mb-2 text-xs font-bold text-neutral-400 uppercase tracking-widest font-display">
        {label}
    </p>
);

// Icons
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const TicketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2V5z"></path><path d="M3 12h18"></path><path d="M12 3v18"></path></svg>;
const LogOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const PercentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>;

const PhotographerSidebar: React.FC<PhotographerSidebarProps> = ({ user, activeView, setView, onLogout }) => {
  return (
    <aside className="w-full md:w-64 bg-white text-neutral-800 p-4 md:rounded-2xl shadow-lg md:min-h-[600px] flex flex-col border border-neutral-100">
        {/* Profile Section */}
        <div className="flex flex-col items-center py-8">
            <div className="relative mb-4">
                <div className="relative p-1 bg-white rounded-full border border-neutral-100 shadow-sm">
                    <img 
                        src={user.avatar_url} 
                        alt={user.name} 
                        className="w-20 h-20 rounded-full object-cover" 
                    />
                </div>
                <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            
            <h3 className="text-lg font-display font-bold text-neutral-900 text-center">
                {user.name}
            </h3>
            
            <div className="mt-2 bg-neutral-100 px-3 py-1 rounded-full">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Fotógrafo Pro
                </span>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2">
            <SectionLabel label="Principal" />
            <NavLink label="Visão Geral" isActive={activeView === 'dashboard'} onClick={() => setView('dashboard')} icon={<HomeIcon />} />
            <NavLink label="Portfólio" isActive={activeView === 'photos'} onClick={() => setView('photos')} icon={<ImageIcon />} badge="NOVO" />
            <NavLink label="Ver Meu Portfólio" isActive={activeView === 'portfolio-preview'} onClick={() => setView('portfolio-preview')} icon={<EyeIcon />} />

            <SectionLabel label="Financeiro" />
            <NavLink label="Vendas Realizadas" isActive={activeView === 'sales'} onClick={() => setView('sales')} icon={<DollarSignIcon />} />
            <NavLink label="Carrinhos Abandonados" isActive={activeView === 'abandoned-carts'} onClick={() => setView('abandoned-carts')} icon={<CartIcon />} badge="NEW" />
            <NavLink label="Central Financeira" isActive={activeView === 'payouts'} onClick={() => setView('payouts')} icon={<ChartIcon />} />
            
            <SectionLabel label="Marketing" />
            <NavLink label="Cupons" isActive={activeView === 'coupons'} onClick={() => setView('coupons')} icon={<TicketIcon />} />
            <NavLink label="Descontos Progressivos" isActive={activeView === 'discounts'} onClick={() => setView('discounts')} icon={<PercentIcon />} />

            <SectionLabel label="Conta" />
            <NavLink label="Meu Perfil" isActive={activeView === 'profile'} onClick={() => setView('profile')} icon={<UserIcon />} />
        </nav>

        {/* Logout */}
        <div className="pt-4 mt-4 border-t border-neutral-100 px-2 pb-4">
            <button 
                onClick={onLogout} 
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
                <span className="mr-3"><LogOutIcon /></span>
                <span>Sair</span>
            </button>
        </div>
    </aside>
  );
};

export default PhotographerSidebar;
