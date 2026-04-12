
import React, { useEffect, useState } from 'react';
import { Photo, User, PhotoEvent, Page } from '../types';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import SEO from '../components/SEO';

interface EventPageProps {
  eventId: string;
  onNavigate: (page: Page) => void;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

const EventPage: React.FC<EventPageProps> = ({ eventId, onNavigate, onAddToCart, currentUser }) => {
  const [event, setEvent] = useState<PhotoEvent | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  useEffect(() => {
    api.getEventById(eventId).then((eventData) => {
      setEvent(eventData);
      setLoadingEvent(false);
    }).catch(() => setLoadingEvent(false));

    Promise.all([
      api.getPhotosByEventId(eventId),
      api.getPhotographers(),
    ]).then(([eventPhotos, allPhotographers]) => {
      const activePhotographers = allPhotographers.filter(p => p.is_active);
      const activeIds = activePhotographers.map(p => p.id);
      setPhotos(eventPhotos.filter(p => activeIds.includes(p.photographer_id)));
      setPhotographers(activePhotographers);
      setLoadingPhotos(false);
    }).catch(() => setLoadingPhotos(false));
  }, [eventId]);

  const getPhotographerForPhoto = (photographerId: string) => {
    return photographers.find(p => p.id === photographerId);
  };

  if (loadingEvent) {
    return (
      <div className="bg-white min-h-screen">
        <section className="py-12 bg-neutral-100 animate-pulse">
          <div className="container mx-auto px-4 text-center">
            <div className="h-10 bg-neutral-200 w-1/2 mx-auto rounded mb-4"></div>
            <div className="h-4 bg-neutral-200 w-1/3 mx-auto rounded"></div>
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

  if (!event) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-display font-bold text-primary-dark">Evento não encontrado.</h2>
        <button onClick={() => onNavigate({ name: 'home' })} className="mt-4 px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
          Voltar para a Home
        </button>
      </div>
    );
  }

  const eventDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-white">
      <section className="py-12 bg-neutral-100">
        <SEO
          title={event.name}
          description={`Fotos do evento ${event.name}. Encontre imagens profissionais de alta qualidade no FotoClic.`}
          image={event.cover_photo_url || undefined}
          url={`https://fotoclic.com.br/evento/${event.id}`}
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-dark">
            <span className="text-primary">{event.name}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-neutral-500">
            {eventDate && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {eventDate}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="mt-2 text-neutral-600 max-w-2xl mx-auto">{event.description}</p>
          )}
          <button
            onClick={() => onNavigate({ name: 'category', id: event.category_id })}
            className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para os eventos
          </button>
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
            <p className="text-center text-neutral-500">Nenhuma foto encontrada neste evento ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default EventPage;
