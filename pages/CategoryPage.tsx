
import React, { useEffect, useState } from 'react';
import { User, Category, PhotoEvent, Page } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import SEO from '../components/SEO';

interface CategoryPageProps {
  categoryId: string;
  onNavigate: (page: Page) => void;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ categoryId, onNavigate }) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [events, setEvents] = useState<PhotoEvent[]>([]);
  const [photographers, setPhotographers] = useState<Record<string, User>>({});
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    api.getCategoryById(categoryId).then((categoryData) => {
      setCategory(categoryData || null);
      setLoadingCategory(false);
    }).catch(() => setLoadingCategory(false));

    Promise.all([
      api.getEventsByCategoryId(categoryId),
      api.getPhotographers(),
    ]).then(([categoryEvents, allPhotographers]) => {
      const activePhotographers = allPhotographers.filter(p => p.is_active);
      const photographerMap: Record<string, User> = {};
      activePhotographers.forEach(p => { photographerMap[p.id] = p; });

      // Only show events from active photographers
      const validEvents = categoryEvents.filter(e => photographerMap[e.photographer_id]);
      setEvents(validEvents);
      setPhotographers(photographerMap);
      setLoadingEvents(false);
    }).catch(() => setLoadingEvents(false));
  }, [categoryId]);

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
          description={`Explore os eventos de ${category.name}. Encontre fotos profissionais de alta qualidade no FotoClic.`}
          image={category.image_url || undefined}
          url={`https://fotoclic.com.br/categoria/${category.id}`}
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-dark">
            Categoria: <span className="text-primary">{category.name}</span>
          </h1>
          <p className="mt-2 text-lg text-neutral-600">Explore os eventos na categoria {category.name}.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {loadingEvents ? (
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
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {events.map(event => {
                const photographer = photographers[event.photographer_id];
                const eventDate = event.event_date
                  ? new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : null;

                return (
                  <div
                    key={event.id}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                    onClick={() => onNavigate({ name: 'event', id: event.id })}
                  >
                    {/* Cover Image */}
                    <div className="relative h-48 bg-neutral-200 overflow-hidden">
                      {event.cover_photo_url ? (
                        <img
                          src={event.cover_photo_url}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                          <svg className="w-16 h-16 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <span className="text-white text-xs font-medium">Ver fotos</span>
                      </div>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-neutral-800 text-sm leading-snug line-clamp-2 mb-1">{event.name}</h3>
                        {eventDate && (
                          <p className="text-xs text-neutral-500 mb-1">{eventDate}</p>
                        )}
                        {event.location && (
                          <p className="text-xs text-neutral-400 line-clamp-1">{event.location}</p>
                        )}
                      </div>
                      {photographer && (
                        <div className="flex items-center gap-2 mt-3">
                          <img
                            src={photographer.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(photographer.name)}&size=24`}
                            alt={photographer.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-xs text-neutral-500 truncate">{photographer.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-neutral-500">Nenhum evento encontrado nesta categoria ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;
