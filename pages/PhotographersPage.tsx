
import React, { useEffect, useState, useMemo } from 'react';
import { User, Page } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';

interface PhotographersPageProps {
  onNavigate: (page: Page) => void;
}

const PhotographersPage: React.FC<PhotographersPageProps> = ({ onNavigate }) => {
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await api.getPublicPhotographers();
        // Strict filtering for active photographers
        const activePhotographers = data.filter(p => p.is_active);
        setPhotographers(activePhotographers);
      } catch (error) {
        console.error("Failed to load photographers", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredPhotographers = useMemo(() => {
    if (!searchTerm) return photographers;
    const lowerTerm = searchTerm.toLowerCase();
    return photographers.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) ||
        (p.location && p.location.toLowerCase().includes(lowerTerm)) ||
        (p.bio && p.bio.toLowerCase().includes(lowerTerm))
    );
  }, [photographers, searchTerm]);

  if (loading) {
    return <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16"><Spinner /></div>;
  }

  return (
    <div className="bg-white min-h-screen">
       {/* Dark Theme Hero Section */}
       <section className="bg-[#111111] text-white py-20 md:py-28 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight text-white drop-shadow-lg">
                Nossos Fotógrafos
            </h1>
            <p className="text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-10 font-light">
                Conheça os artistas talentosos por trás das lentes.
            </p>
            
            <div className="relative max-w-2xl mx-auto">
                <div className="relative group">
                     {/* Glow effect container */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full opacity-30 group-hover:opacity-100 transition duration-500 blur-md"></div>
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            placeholder="Buscar por nome, local ou bio..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 rounded-full bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:bg-[#222] focus:border-neutral-600 transition-all shadow-2xl text-lg"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-5 h-6 w-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {filteredPhotographers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {filteredPhotographers.map(p => (
                        <div 
                            key={p.id} 
                            className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
                            onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: p.id })}
                        >
                            <div className="relative mb-4">
                                <img 
                                    src={p.avatar_url} 
                                    alt={p.name} 
                                    className="w-32 h-32 rounded-full object-cover border-4 border-neutral-100 group-hover:border-secondary transition-all duration-300" 
                                />
                            </div>
                            <h3 className="font-display font-bold text-xl text-neutral-900 mb-1">{p.name}</h3>
                            <p className="text-sm text-neutral-500 mb-3 flex items-center gap-1">
                                {p.location ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                        {p.location}
                                    </>
                                ) : 'Fotógrafo'}
                            </p>
                            
                            <p className="text-sm text-neutral-600 line-clamp-2 mb-6 px-2">
                                {p.bio || "Sem biografia disponível."}
                            </p>
                            
                            <button 
                                className="mt-auto px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-all w-full"
                            >
                                Ver Portfólio
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="inline-block p-6 rounded-full bg-neutral-50 shadow-sm mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-neutral-900 font-medium text-lg">Nenhum fotógrafo encontrado</p>
                    <p className="text-neutral-500 mt-1">Tente buscar por outro nome ou localidade.</p>
                    {searchTerm && (
                         <button onClick={() => setSearchTerm('')} className="mt-4 text-primary font-medium hover:underline">
                             Limpar busca
                         </button>
                    )}
                </div>
            )}
        </div>
      </section>
    </div>
  );
};

export default PhotographersPage;
