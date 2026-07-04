
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Photo, User, PhotoEvent, Page } from '../types';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import SEO from '../components/SEO';
import FloatingShareButton from '../components/FloatingShareButton';
import { getAvatarFallbackUrl } from '../utils/stringUtils';

import FaceSearchModal from '../components/FaceSearchModal';
import { useToast } from '../contexts/ToastContext';

// Helper to safely format event dates in local timezone without UTC shift or Invalid Date bugs
const formatEventDate = (dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateStr) return '';
    try {
        const cleanDate = dateStr.substring(0, 10).replace(/-/g, '/');
        const d = new Date(cleanDate);
        if (isNaN(d.getTime())) {
            const d2 = new Date(dateStr);
            return isNaN(d2.getTime()) ? '' : d2.toLocaleDateString('pt-BR', options);
        }
        return d.toLocaleDateString('pt-BR', options);
    } catch (e) {
        return '';
    }
};

interface EventPageProps {
  eventId: string;
  onNavigate: (page: Page) => void;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

const EventPage: React.FC<EventPageProps> = ({ eventId, onNavigate, onAddToCart, currentUser }) => {
  const { showToast } = useToast();
  const [event, setEvent] = useState<PhotoEvent | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photographer, setPhotographer] = useState<User | null>(null);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  // Extrair pastas/dias únicos das fotos do evento
  const folders = useMemo(() => {
    const list = photos.map(p => p.sub_group).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [photos]);

  // Filtrar fotos com base na pasta selecionada
  const filteredPhotos = useMemo(() => {
    if (!selectedFolder || selectedFolder === 'all') return photos;
    return photos.filter(p => p.sub_group === selectedFolder);
  }, [photos, selectedFolder]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/evento/${eventId}` : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(eventUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  };

  const socialLinks = [
    {
      label: 'WhatsApp',
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(eventUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
    {
      label: 'Facebook',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      label: 'X',
      color: '#000000',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(event?.name || '')}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: 'LinkedIn',
      color: '#0A66C2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      label: 'Threads',
      color: '#000000',
      url: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${event?.name || ''} ${eventUrl}`)}`,
      icon: (
        <svg viewBox="0 0 192 192" fill="currentColor" className="w-6 h-6">
          <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.452-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.741C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.436 74.206 17.12 97.015 16.951c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 9.98 15.934 12.737 26.488l16.221-4.333c-3.333-12.373-8.596-23.084-15.803-31.958C147.947 10.751 127.157 1.252 97.054 1.007h-.059c-30.043.243-50.575 9.801-65.13 29.04C19.525 44.527 13.021 65.3 12.795 96l.003.04-.003.04c.226 30.699 6.73 51.472 19.07 65.952 14.555 19.24 35.088 28.797 65.13 29.04h.056c26.776-.21 45.788-7.18 61.305-22.687 20.315-20.3 19.701-45.13 13.023-60.55-4.741-11.056-14.315-19.857-29.844-25.848z"/>
        </svg>
      ),
    },
    {
      label: 'Messenger',
      color: '#0084FF',
      url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(eventUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(eventUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.953 8l3.13 3.259L19.948 8l-6.755 6.963z"/>
        </svg>
      ),
    },
  ];

  useEffect(() => {
    setSelectedFolder('all');
    api.getEventById(eventId).then(setEvent).catch(() => null).finally(() => setLoadingEvent(false));

    Promise.all([
      api.getPhotosByEventId(eventId),
      api.getPhotographers(),
    ]).then(([eventPhotos, allPhotographers]) => {
      const active = allPhotographers.filter(p => p.is_active);
      const activeIds = new Set(active.map(p => p.id));
      setPhotos(eventPhotos.filter(p => activeIds.has(p.photographer_id)));
      setPhotographers(active);
      setLoadingPhotos(false);
    }).catch(() => setLoadingPhotos(false));
  }, [eventId]);

  // Find photographer once event and photographers are loaded
  useEffect(() => {
    if (event && photographers.length > 0) {
      const p = photographers.find(p => p.id === event.photographer_id) || null;
      setPhotographer(p);
    }
  }, [event, photographers]);

  const getPhotographerForPhoto = (photographerId: string) =>
    photographers.find(p => p.id === photographerId);

  if (loadingEvent) {
    return (
      <div className="bg-white min-h-screen">
        <section className="py-12 bg-neutral-100 animate-pulse">
          <div className="container mx-auto px-4 text-center">
            <div className="h-10 bg-neutral-200 w-1/2 mx-auto rounded mb-4" />
            <div className="h-4 bg-neutral-200 w-1/3 mx-auto rounded" />
          </div>
        </section>
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-72 bg-white shadow-sm rounded-2xl animate-pulse flex flex-col overflow-hidden border border-neutral-100">
                <div className="h-48 bg-neutral-200" />
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div className="h-5 bg-neutral-200 w-3/4 rounded mb-4" />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-200" />
                    <div className="h-3 bg-neutral-200 w-1/2 rounded" />
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
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-display font-bold text-primary-dark">Evento não encontrado.</h2>
        <button onClick={() => onNavigate({ name: 'home' })} className="mt-4 px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
          Voltar para a Home
        </button>
      </div>
    );
  }

  const eventDate = formatEventDate(event.event_date, { day: '2-digit', month: 'short', year: 'numeric' }) || null;

  return (
    <div className="bg-white">
      <SEO
        title={event.name}
        description={`Fotos do evento ${event.name}. Encontre imagens profissionais de alta qualidade no FotoClic.`}
        image={event.cover_photo_url || undefined}
        url={`https://fotoclic.com.br/evento/${event.id}`}
      />

      {/* ── Header do Evento ──────────────────────────────────────────────── */}
      <section className="py-10 bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">

          {/* Botão voltar */}
          <button
            onClick={() => onNavigate({ name: 'category', id: event.category_id })}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-primary transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para os eventos
          </button>

          {/* Título centralizado + botões */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 text-center">
              {event.name}
            </h1>

            {/* Three-dots menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {showMenu && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 w-40 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => { setShowMenu(false); setShowShareModal(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Compartilhar
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    Reportar
                  </button>
                </div>
              )}
            </div>

            {/* Share icon */}
            <button
              onClick={() => setShowShareModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {/* Meta info centralizada */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-neutral-500 mb-3">
            {eventDate && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {eventDate}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </span>
            )}
            {/* Fotógrafo inline */}
            {photographer && (
              <button
                onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: photographer.slug || photographer.id })}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <img
                  src={photographer.avatar_url || getAvatarFallbackUrl(photographer.name, 32)}
                  alt={photographer.name}
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => { e.currentTarget.src = getAvatarFallbackUrl(photographer.name, 32); }}
                />
                <span className="font-medium text-neutral-600 hover:text-primary transition-colors">
                  {photographer.name}
                </span>
              </button>
            )}
          </div>

          {/* Contagem de fotos centralizada */}
          {!loadingPhotos && (
            <div className="flex justify-center mb-2">
              <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {photos.length} foto{photos.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {event.description && (
            <p className="text-center text-neutral-500 text-sm max-w-lg mx-auto mt-2">{event.description}</p>
          )}

          {/* Banner de Reconhecimento Facial — full width, centralizado */}
          {!loadingPhotos && photos.length > 0 && (
            <div
              onClick={() => setIsFaceSearchOpen(true)}
              className="mt-6 group cursor-pointer"
            >
              <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 flex items-center gap-4 hover:border-neutral-300 hover:shadow-sm transition-all duration-200">

                {/* Scan icon */}
                <div className="flex-none w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center group-hover:border-neutral-200 transition-colors">
                  <svg className="w-5 h-5 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                    <circle cx="10.5" cy="11.2" r="0.5" fill="currentColor" stroke="none" />
                    <circle cx="13.5" cy="11.2" r="0.5" fill="currentColor" stroke="none" />
                    <path d="M10.5 13.5a2 2 0 0 0 3 0" strokeWidth="1.3" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-800 leading-tight">
                    Encontre suas fotos por reconhecimento facial
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Tire uma selfie ou envie uma foto do seu rosto
                  </p>
                </div>

                {/* CTA */}
                <span className="flex-none text-xs font-bold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap shadow-sm">
                  Buscar
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Galeria de Fotos ──────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Seletor de Pastas/Dias (Dropdown) */}
          {!loadingPhotos && folders.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-semibold text-neutral-800">Filtrar por pasta / dia</h3>
                <p className="text-xs text-neutral-500">Selecione uma pasta para ver as fotos correspondentes</p>
              </div>
              <div className="relative w-full sm:w-64">
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Todas as fotos ({photos.length})</option>
                  {folders.map(folder => {
                    const count = photos.filter(p => p.sub_group === folder).length;
                    return (
                      <option key={folder} value={folder}>
                        {folder} ({count})
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {loadingPhotos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-72 bg-white shadow-sm rounded-2xl animate-pulse flex flex-col overflow-hidden border border-neutral-100">
                  <div className="h-48 bg-neutral-200" />
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="h-5 bg-neutral-200 w-3/4 rounded mb-4" />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200" />
                      <div className="h-3 bg-neutral-200 w-1/2 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredPhotos.map(photo => (
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
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-neutral-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-neutral-500">Nenhuma foto encontrada com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Modal de Compartilhamento ─────────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900">Compartilhar</h2>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* URL */}
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">URL do Evento</p>
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-6">
              <span className="flex-1 text-sm text-neutral-700 truncate">{eventUrl}</span>
              <button
                onClick={copyUrl}
                className="flex-none text-neutral-500 hover:text-primary transition-colors"
                title="Copiar link"
              >
                {urlCopied ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>

            {/* Social media */}
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Redes Sociais</p>
            <div className="flex items-center gap-3 flex-wrap">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white hover:opacity-90 hover:scale-105 transition-all duration-150 shadow-sm"
                  style={{ backgroundColor: s.color }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Report ───────────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setShowReportModal(false); setReportSent(false); setReportReason(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-neutral-900">Reportar Evento</h2>
              <button onClick={() => { setShowReportModal(false); setReportSent(false); setReportReason(''); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {reportSent ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-neutral-800">Report enviado!</p>
                <p className="text-sm text-neutral-500 mt-1">Nossa equipe irá analisar em breve.</p>
                <button onClick={() => { setShowReportModal(false); setReportSent(false); setReportReason(''); }} className="mt-4 px-6 py-2 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-700 transition-colors">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-4">Descreva o motivo do report. Nossa equipe irá analisar.</p>
                <div className="space-y-2 mb-4">
                  {['Conteúdo inapropriado', 'Evento duplicado', 'Informações incorretas', 'Outro motivo'].map(reason => (
                    <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors">
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason}
                        checked={reportReason === reason}
                        onChange={() => setReportReason(reason)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-neutral-700">{reason}</span>
                    </label>
                  ))}
                </div>
                <button
                  disabled={!reportReason}
                  onClick={() => {
                    showToast('Report enviado com sucesso!', 'success');
                    setReportSent(true);
                  }}
                  className="w-full py-3 rounded-xl bg-neutral-900 text-white font-semibold text-sm hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enviar Report
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de Reconhecimento Facial ────────────────────────────────── */}
      {isFaceSearchOpen && (
        <FaceSearchModal
          isOpen={isFaceSearchOpen}
          onClose={() => setIsFaceSearchOpen(false)}
          onNavigate={onNavigate}
          onAddToCart={onAddToCart}
          onShowToast={showToast}
          eventId={event.id}
          eventName={event.name}
        />
      )}
      
      {!loadingEvent && event && (
        <FloatingShareButton 
            title={event.name}
            text={`Confira as fotos do evento ${event.name} no FotoClic`}
            url={window.location.href}
        />
      )}
    </div>
  );
};

export default EventPage;


