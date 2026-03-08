
import React, { useEffect, useState } from 'react';
import { Photo, User, Category, Page } from '../types';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import Spinner from '../components/Spinner';
import SEO from '../components/SEO';

interface CategoryPageProps {
  categoryId: string;
  onNavigate: (page: Page) => void;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ categoryId, onNavigate, onAddToCart, currentUser }) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Fetch category specifically to show header fast
      api.getCategoryById(categoryId).then((categoryData) => {
        setCategory(categoryData || null);
        setLoadingCategory(false);
      }).catch((e) => {
        console.error("Failed to load category metadata", e);
        setLoadingCategory(false);
      });

      // Fetch photos and photographers concurrently but separately from category header
      Promise.all([
        api.getPhotosByCategoryId(categoryId, true), // Enable shuffling
        api.getPhotographers(),
      ]).then(([categoryPhotos, allPhotographers]) => {
        // Filter photographers to only include active ones for display
        const activePhotographers = allPhotographers.filter(p => p.is_active);
        const activeIds = activePhotographers.map(p => p.id);

        // Ensure photos belong to active photographers
        const validPhotos = categoryPhotos.filter(p => activeIds.includes(p.photographer_id));

        setPhotos(validPhotos);
        setPhotographers(activePhotographers);
        setLoadingPhotos(false);
      }).catch(e => {
        console.error(`Failed to load photos for category ${categoryId}`, e);
        setLoadingPhotos(false);
      });
    };
    loadData();
  }, [categoryId]);

  const getPhotographerForPhoto = (photographerId: string) => {
    return photographers.find(p => p.id === photographerId);
  };

  if (loadingCategory) {
    return (
      <div className="bg-white min-h-screen">
        <section className="py-12 bg-neutral-100 animate-pulse">
          <div className="container mx-auto px-4 text-center">
            <div className="h-10 bg-neutral-200 w-1/3 mx-auto rounded mb-4"></div>
            <div className="h-4 bg-neutral-200 w-1/2 mx-auto rounded"></div>
          </div>
        </section>
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-72 bg-white shadow-sm rounded-2xl animate-pulse flex flex-col overflow-hidden border border-neutral-100 w-full">
                <div className="h-48 bg-neutral-200"></div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div className="h-5 bg-neutral-200 w-3/4 rounded mb-4"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-200"></div>
                    <div className="h-3 bg-neutral-200 w-1/2 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-display font-bold text-primary-dark">Categoria não encontrada.</h2>
        <button onClick={() => onNavigate({ name: 'home' })} className="mt-4 px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
          Voltar para a Home
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <section className="py-12 bg-neutral-100">
        <SEO
          title={category.name}
          description={`Explore as melhores fotos de ${category.name}. Encontre imagens profissionais de alta qualidade no FotoClic.`}
          image={category.image_url || undefined}
          url={`https://fotoclic.com.br/categoria/${category.id}`}
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-dark">
            Categoria: <span className="text-primary">{category.name}</span>
          </h1>
          <p className="mt-2 text-lg text-neutral-600">Explore todas as fotos na categoria {category.name}.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {loadingPhotos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-72 bg-white shadow-sm rounded-2xl animate-pulse flex flex-col overflow-hidden border border-neutral-100 w-full">
                  <div className="h-48 bg-neutral-200"></div>
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="h-5 bg-neutral-200 w-3/4 rounded mb-4"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200"></div>
                      <div className="h-3 bg-neutral-200 w-1/2 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {photos.map(photo => (
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
          ) : (
            <p className="text-center text-neutral-500">Nenhuma foto encontrada nesta categoria ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;
