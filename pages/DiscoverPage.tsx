
import React, { useEffect, useState, useMemo } from 'react';
import { Photo, User, Category, Page } from '../types';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import Spinner from '../components/Spinner';

interface DiscoverPageProps {
  onNavigate: (page: Page) => void;
  initialSearch?: string;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

const DiscoverPage: React.FC<DiscoverPageProps> = ({ onNavigate, initialSearch, onAddToCart, currentUser }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [allPhotos, publicPhotographers, allCategories] = await Promise.all([
          api.getAllPhotos(true), // Enable shuffling
          api.getPublicPhotographers(),
          api.getCategories(),
        ]);
        
        const activePhotographerIds = publicPhotographers.filter(p => p.is_active).map(p => p.id);
        const validPhotos = allPhotos.filter(p => 
            activePhotographerIds.includes(p.photographer_id) && 
            p.is_public && 
            p.moderation_status === 'approved'
        );

        setPhotos(validPhotos);
        setPhotographers(publicPhotographers);
        setCategories(allCategories);
      } catch (error) {
        console.error("Failed to load discover data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getPhotographerForPhoto = (photographerId: string) => {
    return photographers.find(p => p.id === photographerId);
  };

  const filteredPhotos = useMemo(() => {
      return photos.filter(photo => {
          const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                photo.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesCategory = selectedCategory === 'all' || photo.category_id === selectedCategory;
          return matchesSearch && matchesCategory;
      });
  }, [photos, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);
  const paginatedPhotos = useMemo(() => {
    return filteredPhotos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPhotos, currentPage]);

  const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));

  if (loading) {
    return <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16"><Spinner /></div>;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section with Dark Theme */}
      <section className="bg-[#111111] text-white py-20 md:py-28 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight text-white drop-shadow-lg">
                Descobrir
            </h1>
            <p className="text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-10 font-light">
                Navegue por nossa coleção completa de imagens de alta resolução.
            </p>
            
            <div className="relative max-w-2xl mx-auto">
                <div className="relative group">
                     {/* Glow effect container */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full opacity-30 group-hover:opacity-100 transition duration-500 blur-md"></div>
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            placeholder="Buscar por título ou tag..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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

      {/* Sticky Category Navigation */}
      <section className="sticky top-16 bg-white/90 backdrop-blur-md z-40 border-b border-neutral-200 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar">
              <div className="flex space-x-8 py-4 min-w-max">
                  <button 
                    onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
                    className={`text-sm font-semibold transition-colors relative pb-2 ${selectedCategory === 'all' ? 'text-primary' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                      Todas
                      {selectedCategory === 'all' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>}
                  </button>
                  {categories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                        className={`text-sm font-semibold transition-colors relative pb-2 ${selectedCategory === cat.id ? 'text-primary' : 'text-neutral-500 hover:text-neutral-800'}`}
                      >
                          {cat.name}
                          {selectedCategory === cat.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>}
                      </button>
                  ))}
              </div>
          </div>
      </section>

      {/* Results Grid */}
      <section className="py-16 bg-neutral-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {paginatedPhotos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {paginatedPhotos.map(photo => (
                      <PhotoCard 
                        key={photo.id} 
                        photo={photo} 
                        photographer={getPhotographerForPhoto(photo.photographer_id)} 
                        onNavigate={onNavigate}
                        onAddToCart={onAddToCart}
                        currentUser={currentUser}
                      />
                  ))}
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-12">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="px-6 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors shadow-sm"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-neutral-500 font-medium">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="px-6 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors shadow-sm"
                        >
                            Próxima
                        </button>
                    </div>
                )}
              </>
            ) : (
                <div className="text-center py-20">
                    <div className="inline-block p-6 rounded-full bg-white shadow-sm mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900">Nenhuma foto encontrada</h3>
                    <p className="text-neutral-500 mt-2">Tente ajustar sua busca ou filtros.</p>
                    <button onClick={() => {setSearchTerm(''); setSelectedCategory('all');}} className="mt-6 text-primary font-medium hover:underline">Limpar todos os filtros</button>
                </div>
            )}
        </div>
      </section>
    </div>
  );
};

export default DiscoverPage;
