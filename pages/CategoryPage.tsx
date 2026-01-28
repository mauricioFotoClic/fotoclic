
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categoryData, categoryPhotos, allPhotographers] = await Promise.all([
          api.getCategoryById(categoryId),
          api.getPhotosByCategoryId(categoryId, true), // Enable shuffling
          api.getPhotographers(),
        ]);

        setCategory(categoryData || null);

        // Filter photographers to only include active ones for display
        const activePhotographers = allPhotographers.filter(p => p.is_active);
        const activeIds = activePhotographers.map(p => p.id);

        // Ensure photos belong to active photographers
        const validPhotos = categoryPhotos.filter(p => activeIds.includes(p.photographer_id));

        setPhotos(validPhotos);
        setPhotographers(activePhotographers);
      } catch (error) {
        console.error(`Failed to load data for category ${categoryId}`, error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [categoryId]);

  const getPhotographerForPhoto = (photographerId: string) => {
    return photographers.find(p => p.id === photographerId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Spinner />
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
          image={category.image_url}
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
          {photos.length > 0 ? (
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
