
import React, { useEffect, useState, useMemo } from 'react';
import { Photo, User, Page } from '../types';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import Spinner from '../components/Spinner';

interface FeaturedPhotosPageProps {
    onNavigate: (page: Page) => void;
    onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
    currentUser?: User | null;
}

const FeaturedPhotosPage: React.FC<FeaturedPhotosPageProps> = ({ onNavigate, onAddToCart, currentUser }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [featuredPhotos, publicPhotographers] = await Promise.all([
          api.getFeaturedPhotos(),
          api.getPublicPhotographers(),
        ]);
        
        // Double check: Ensure only photos from active photographers are shown
        const activePhotographerIds = publicPhotographers.filter(p => p.is_active).map(p => p.id);
        const validPhotos = featuredPhotos.filter(p => activePhotographerIds.includes(p.photographer_id));
        
        setPhotos(validPhotos);
        setPhotographers(publicPhotographers);
      } catch (error) {
        console.error("Failed to load featured photos data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getPhotographerForPhoto = (photographerId: string) => {
    return photographers.find(p => p.id === photographerId);
  };

  const totalPages = Math.ceil(photos.length / itemsPerPage);
  const paginatedPhotos = useMemo(() => {
    return photos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [photos, currentPage]);

  const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));
  
  if (loading) {
    return <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16"><Spinner /></div>;
  }

  return (
    <div className="bg-white min-h-screen">
      <section className="py-12 bg-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-dark">
                Fotos em Destaque
            </h1>
            <p className="mt-2 text-lg text-neutral-600">Explore nossa galeria com as melhores fotos da comunidade.</p>
        </div>
      </section>

      <section className="py-16">
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
                            className="px-6 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-neutral-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="px-6 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                        >
                            Próxima
                        </button>
                    </div>
                )}
              </>
            ) : (
                <p className="text-center text-neutral-500">Nenhuma foto em destaque encontrada no momento.</p>
            )}
        </div>
      </section>
    </div>
  );
};

export default FeaturedPhotosPage;
