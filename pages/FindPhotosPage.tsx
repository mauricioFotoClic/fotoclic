
import React, { useEffect, useState, useMemo } from 'react';
import { PhotoEvent, User, Category, Page } from '../types';
import api from '../services/api';
import SEO from '../components/SEO';
import WatermarkedImage from '../components/WatermarkedImage';

interface FindPhotosPageProps {
  onNavigate: (page: Page) => void;
}

const FindPhotosPage: React.FC<FindPhotosPageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<PhotoEvent[]>([]);
  const [photographers, setPhotographers] = useState<Record<string, User>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    Promise.all([
      api.getAllPublicEvents(),
      api.getPhotographers(),
      api.getCategories(),
    ]).then(([allEvents, allPhotographers, allCategories]) => {
      const activePhotographers = allPhotographers.filter(p => p.is_active);
      const activeIds = new Set(activePhotographers.map(p => p.id));

      const photographerMap: Record<string, User> = {};
      activePhotographers.forEach(p => { photographerMap[p.id] = p; });

      const categoryMap: Record<string, Category> = {};
      allCategories.forEach(c => { categoryMap[c.id] = c; });

      // Only show events from active photographers
      const validEvents = allEvents.filter(e => activeIds.has(e.photographer_id));

      setEvents(validEvents);
      setPhotographers(photographerMap);
      setCategories(categoryMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Unique cities for filter dropdown
  const cities = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (e.location) {
        // Extract city (last part after comma or the full string)
        const parts = e.location.split(',');
        const city = parts[parts.length - 1].trim();
        if (city) set.add(city);
      }
    });
    return Array.from(set).sort();
  }, [events]);

  // Unique categories that have events
  const activeCategories = useMemo(() => {
    const ids = new Set(events.map(e => e.category_id));
    return Object.values(categories).filter(c => ids.has(c.id));
  }, [events, categories]);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(lower) ||
        (e.location && e.location.toLowerCase().includes(lower)) ||
        (e.description && e.description.toLowerCase().includes(lower))
      );
    }

    if (filterCategory) {
      result = result.filter(e => e.category_id === filterCategory);
    }

    if (filterCity) {
      result = result.filter(e =>
        e.location && e.location.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    if (filterDate) {
      const now = new Date();
      if (filterDate === 'recent') {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 30);
        result = result.filter(e => new Date(e.event_date) >= cutoff);
      } else if (filterDate === 'month') {
        result = result.filter(e => {
          const d = new Date(e.event_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      } else if (filterDate === 'year') {
        result = result.filter(e => new Date(e.event_date).getFullYear() === now.getFullYear());
      }
    }

    return result;
  }, [events, searchTerm, filterCategory, filterCity, filterDate]);

  const hasFilters = searchTerm || filterCategory || filterCity || filterDate;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterCity('');
    setFilterDate('');
  };

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title="Encontrar Fotos"
        description="Encontre fotos do seu evento. Busque por nome, cidade ou categoria."
        url="https://fotoclic.com.br/encontrar-fotos"
      />

      {/* Hero / Search Section */}
      <section className="bg-primary py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-3">
            Encontre suas fotos
          </h1>
          <p className="text-primary-100 text-lg mb-8 opacity-90">
            Procure pelo evento em que você participou
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <input
              type="text"
              placeholder="Procure pelo evento em que participou..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-5 pr-14 py-4 rounded-xl text-neutral-800 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
          </div>
        </div>
      </section>

      {/* Filters + Results */}
      <section className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-sm font-medium text-neutral-500">
              {loading ? 'Carregando...' : `${filteredEvents.length} evento${filteredEvents.length !== 1 ? 's' : ''}`}
            </span>

            <div className="flex flex-wrap gap-2 ml-auto">
              {/* Date filter */}
              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="text-sm border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              >
                <option value="">Data: Todos</option>
                <option value="month">Este mês</option>
                <option value="recent">Últimos 30 dias</option>
                <option value="year">Este ano</option>
              </select>

              {/* City filter */}
              {cities.length > 0 && (
                <select
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  className="text-sm border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  <option value="">Cidade: Todas</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              )}

              {/* Category filter */}
              {activeCategories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="text-sm border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  <option value="">Categoria: Todas</option>
                  {activeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline font-medium px-2"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm animate-pulse">
                  <div className="h-44 bg-neutral-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-neutral-200 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 rounded w-1/2" />
                    <div className="h-3 bg-neutral-200 rounded w-2/3" />
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200" />
                      <div className="h-3 bg-neutral-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredEvents.map(event => {
                const photographer = photographers[event.photographer_id];
                const category = categories[event.category_id];
                const eventDate = event.event_date
                  ? new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : null;

                return (
                  <div
                    key={event.id}
                    className="group rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white flex flex-col"
                    onClick={() => onNavigate({ name: 'event', id: event.id })}
                  >
                    {/* Cover */}
                    <div className="relative h-44 bg-neutral-100 overflow-hidden">
                      {event.cover_photo_url ? (
                        <WatermarkedImage
                          src={event.cover_photo_url}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                          <svg className="w-14 h-14 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="absolute bottom-3 text-xs text-neutral-400 font-medium">Fotos em breve</span>
                        </div>
                      )}
                      {category && (
                        <span className="absolute top-2 left-2 bg-black/50 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {category.name}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-neutral-800 text-sm leading-snug line-clamp-2 mb-2">{event.name}</h3>
                      <div className="space-y-1 text-xs text-neutral-500 flex-1">
                        {event.location && (
                          <p className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{event.location}</span>
                          </p>
                        )}
                        {eventDate && (
                          <p className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {eventDate}
                          </p>
                        )}
                      </div>
                      {photographer && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
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
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-neutral-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-neutral-500 font-medium">Nenhum evento encontrado</p>
              <p className="text-neutral-400 text-sm mt-1">Tente outros termos ou remova os filtros.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 text-primary font-medium hover:underline text-sm">
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FindPhotosPage;
