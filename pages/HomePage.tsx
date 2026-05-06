
import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Photo, User, PhotographerWithStats, Category, PhotoEvent, Page } from '../types';
import { User as UserIcon, Camera } from 'lucide-react';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import WatermarkedImage from '../components/WatermarkedImage';
import SEO from '../components/SEO';

interface HomePageProps {
  onNavigate: (page: Page) => void;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

// ─── Carousel Hook ────────────────────────────────────────────────────────────
function useCarousel(ref: React.RefObject<HTMLDivElement>) {
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref, update]);

  const prev = () => ref.current?.scrollBy({ left: -ref.current.clientWidth, behavior: 'smooth' });
  const next = () => ref.current?.scrollBy({ left: ref.current.clientWidth, behavior: 'smooth' });

  return { canPrev, canNext, prev, next };
}

// ─── Carousel Nav Buttons ─────────────────────────────────────────────────────
const CarouselBtn: React.FC<{ onClick: () => void; dir: 'prev' | 'next'; disabled: boolean }> = ({ onClick, dir, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
      disabled
        ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed shadow-none'
        : 'bg-white text-neutral-700 hover:bg-primary hover:text-white hover:shadow-lg active:scale-95'
    }`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
    </svg>
  </button>
);

// ─── HomePage ─────────────────────────────────────────────────────────────────
const HomePage: React.FC<HomePageProps> = ({ onNavigate, onAddToCart, currentUser }) => {
  const [featuredPhotos, setFeaturedPhotos] = useState<Photo[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
  const [recentEvents, setRecentEvents] = useState<PhotoEvent[]>([]);
  const [photographers, setPhotographers] = useState<PhotographerWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [photographersMap, setPhotographersMap] = useState<Record<string, PhotographerWithStats>>({});

  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPhotogs, setLoadingPhotogs] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  // Carousel refs
  const catsRef = useRef<HTMLDivElement>(null);
  const photogsRef = useRef<HTMLDivElement>(null);
  const catsCarousel = useCarousel(catsRef);
  const photogsCarousel = useCarousel(photogsRef);

  useEffect(() => {
    api.getCategories().then(cats => {
      setCategories(cats);
      const map: Record<string, Category> = {};
      cats.forEach(c => { map[c.id] = c; });
      setCategoriesMap(map);
      setLoadingCats(false);
    }).catch(() => setLoadingCats(false));

    api.getFeaturedPhotos().then(f => {
      setFeaturedPhotos(f.slice(0, 5));
      setLoadingFeatured(false);
    }).catch(() => setLoadingFeatured(false));

    api.getRecentPhotos(8).then(r => {
      setRecentPhotos(r);
      setLoadingRecent(false);
    }).catch(() => setLoadingRecent(false));

    api.getActivePhotographersPreview().then(pops => {
      setPhotographers(pops);
      const map: Record<string, PhotographerWithStats> = {};
      pops.forEach(p => { map[p.id] = p; });
      setPhotographersMap(map);
      setLoadingPhotogs(false);
    }).catch(() => setLoadingPhotogs(false));

    api.getAllPublicEvents().then(events => {
      setRecentEvents(events);
      setLoadingEvents(false);
    }).catch(() => setLoadingEvents(false));
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) onNavigate({ name: 'find-photos', initialSearch: searchQuery });
  };

  const getPhotographer = (id: string) => photographersMap[id];

  // ─── Mosaic Card ────────────────────────────────────────────────────────────
  const MosaicCard = ({ photo, className = '' }: { photo: Photo; className?: string }) => {
    const photographer = getPhotographer(photo.photographer_id);
    return (
      <div
        onClick={() => onNavigate({ name: 'photo-detail', id: photo.id })}
        className={`group relative overflow-hidden rounded-2xl cursor-pointer ${className}`}
      >
        <div className="absolute inset-0 bg-neutral-900/20 group-hover:bg-neutral-900/0 transition-colors duration-500 z-10 pointer-events-none" />
        <WatermarkedImage
          src={photo.thumb_url || photo.preview_url}
          alt={photo.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500 z-20 flex flex-col justify-end p-6 pointer-events-none">
          <h3 className="text-white font-display font-bold text-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            {photo.title}
          </h3>
          <div className="flex items-center justify-between mt-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
            <div className="flex items-center text-white/80 text-sm">
              {photographer && (
                <>
                  <img src={photographer.avatar_url} className="w-5 h-5 rounded-full mr-2" alt="" />
                  <span>{photographer.name}</span>
                </>
              )}
            </div>
            <span className="text-white font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              R$ {photo.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
        <div className="absolute top-4 right-4 sm:hidden z-30">
          <span className="text-xs font-bold bg-white/90 text-neutral-900 px-2 py-1 rounded-md shadow-sm">
            R$ {photo.price.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  // ─── Skeleton helpers ───────────────────────────────────────────────────────
  const CardSkeleton = () => (
    <div className="flex-none w-1/2 md:w-1/3 lg:w-[calc(100%/6)] h-64 md:h-72 bg-neutral-200 animate-pulse rounded-2xl" />
  );

  const PhotogSkeleton = () => (
    <div className="flex-none w-4/5 sm:w-1/2 lg:w-1/4 h-80 bg-white border border-neutral-100 shadow-sm rounded-2xl p-6 flex flex-col animate-pulse">
      <div className="w-24 h-24 rounded-full bg-neutral-200 mx-auto mb-4" />
      <div className="h-5 bg-neutral-200 w-2/3 mx-auto rounded mb-2" />
      <div className="h-3 bg-neutral-200 w-1/2 mx-auto rounded" />
      <div className="mt-auto h-10 bg-neutral-200 rounded-full w-full" />
    </div>
  );

  return (
    <div>
      <SEO
        title="Home | FotoClic"
        description="Encontre e compre fotos esportivas profissionais de alta qualidade. Cobertura de eventos, maratonas, surf e muito mais."
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[70vh] md:h-[60vh] pt-20 md:pt-0 bg-cover bg-center text-white flex items-center justify-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1920&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px]" />
        <div className="relative z-10 text-center p-4 max-w-4xl mx-auto animate-fade-in-up">
          <h1 className="text-4xl md:text-7xl font-display font-bold mb-6 leading-tight">
            Encontre suas fotos.<br /><span className="text-primary">Reviva</span> seus melhores momentos.
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-neutral-200 font-light">
            Busque, encontre e compre as fotos dos eventos que você participou.
          </p>
          <div className="relative w-full max-w-xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-neutral-900 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000" />
            <div className="relative flex">
              <input
                type="text"
                placeholder="Pesquise por evento, esporte, fotógrafo..."
                className="w-full pl-6 pr-14 py-4 text-neutral-800 bg-white border-0 rounded-full focus:ring-0 shadow-2xl text-lg"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2 bottom-2 bg-primary w-12 rounded-full text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => onNavigate({ name: 'find-photos' })}
                className="w-full sm:w-auto flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-black/60 transition-all text-left"
              >
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                  <UserIcon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs text-neutral-300 font-medium">Sou atleta, quero</p>
                  <p className="text-sm font-bold">encontrar minhas fotos</p>
                </div>
              </button>

              <button 
                onClick={() => onNavigate({ name: 'register' })}
                className="w-full sm:w-auto flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-black/60 transition-all text-left"
              >
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                  <Camera size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs text-neutral-300 font-medium">Sou fotógrafo, quero</p>
                  <p className="text-sm font-bold">vender minhas fotos</p>
                </div>
              </button>
          </div>
        </div>
      </section>
      
      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-8 bg-neutral-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4 justify-center">
               <div className="p-3 bg-primary/10 rounded-xl text-primary">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
               </div>
               <div>
                 <p className="font-bold text-sm">Fotos profissionais</p>
                 <p className="text-xs text-neutral-400">de alta qualidade</p>
               </div>
            </div>
            <div className="flex items-center gap-4 justify-center">
               <div className="p-3 bg-primary/10 rounded-xl text-primary">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
               </div>
               <div>
                 <p className="font-bold text-sm">Encontre-se nas fotos</p>
                 <p className="text-xs text-neutral-400">dos eventos</p>
               </div>
            </div>
            <div className="flex items-center gap-4 justify-center">
               <div className="p-3 bg-primary/10 rounded-xl text-primary">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
               </div>
               <div>
                 <p className="font-bold text-sm">Compra segura e</p>
                 <p className="text-xs text-neutral-400">entrega imediata</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1. Categorias (Carousel) ──────────────────────────────────────── */}

      <section className="py-20 bg-neutral-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Navegue por Temas</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">Categorias</h2>
            </div>
            <div className="flex items-center gap-2">
              <CarouselBtn onClick={catsCarousel.prev} dir="prev" disabled={!catsCarousel.canPrev} />
              <CarouselBtn onClick={catsCarousel.next} dir="next" disabled={!catsCarousel.canNext} />
            </div>
          </div>

          {/* Carousel track */}
          <div
            ref={catsRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loadingCats
              ? [1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)
              : categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => onNavigate({ name: 'category', id: category.id })}
                  className="group relative flex-none w-1/2 md:w-1/3 lg:w-[calc(100%/6-14px)] h-64 md:h-72 overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 ease-out transform hover:-translate-y-1 snap-start"
                  style={{ transitionDelay: `${index * 40}ms` }}
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src={category.image_url || `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(category.name)}`}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4 text-left">
                    <div className="transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                      <span className="block w-6 h-0.5 bg-primary mb-2 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-75" />
                      <h3 className="font-display font-bold text-white text-base md:text-lg tracking-wide drop-shadow-lg">
                        {category.name}
                      </h3>
                      <div className="h-0 group-hover:h-5 overflow-hidden transition-[height] duration-500 opacity-0 group-hover:opacity-100">
                        <span className="text-xs text-neutral-300 font-medium uppercase tracking-wider mt-1 block">Explorar</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
      </section>

      {/* ── Photographer Banner ─────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-neutral-900 rounded-3xl overflow-hidden flex flex-col md:flex-row items-center">
            <div className="p-8 md:p-12 flex-1">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2 block">Para Fotógrafos</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Mostre seu talento.<br />
                <span className="text-primary">Venda suas fotos.</span>
              </h2>
              <p className="text-neutral-400 mb-8 max-w-md">
                Publique suas fotos dos eventos, alcance milhares de atletas e transforme seu trabalho em renda de forma simples e rápida.
              </p>
              <button 
                onClick={() => onNavigate({ name: 'register' })}
                className="bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-full transition-all flex items-center gap-2"
              >
                <Camera size={20} />
                Quero vender minhas fotos
              </button>
            </div>
            <div className="flex-1 h-64 md:h-full min-h-[300px] w-full">
               <img 
                 src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1000&auto=format&fit=crop" 
                 alt="Fotógrafo" 
                 className="w-full h-full object-cover"
               />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Fotos em Destaque ──────────────────────────────────────────── */}

      <section className="py-24 bg-[#0F0F0F] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">Fotos em Destaque</h2>
              <p className="text-neutral-400 text-lg font-light">
                Uma seleção das imagens mais impressionantes da nossa comunidade.
              </p>
            </div>
            <button
              onClick={() => onNavigate({ name: 'featured-photos' })}
              className="group flex items-center text-white font-medium hover:text-primary transition-colors px-6 py-3 rounded-full border border-neutral-700 hover:border-primary whitespace-nowrap"
            >
              Ver coleção completa
              <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
              <div className="md:col-span-2 md:row-span-2 h-[300px] md:h-auto bg-neutral-800 animate-pulse rounded-2xl" />
              {[1, 2, 3, 4].map(i => <div key={i} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto bg-neutral-800 animate-pulse rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
              {featuredPhotos[0] && <MosaicCard photo={featuredPhotos[0]} className="md:col-span-2 md:row-span-2 h-[300px] md:h-auto" />}
              {featuredPhotos[1] && <MosaicCard photo={featuredPhotos[1]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
              {featuredPhotos[2] && <MosaicCard photo={featuredPhotos[2]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
              {featuredPhotos[3] && <MosaicCard photo={featuredPhotos[3]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
              {featuredPhotos[4] && <MosaicCard photo={featuredPhotos[4]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Fotos Recentes ─────────────────────────────────────────────── */}
      <section className="py-24 bg-neutral-50 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center mb-12 text-center">
            <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2">O que há de novo</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">Fotos Recentes</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-neutral-900 rounded-full mt-4" />
          </div>

          {loadingRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-72 bg-white shadow-sm rounded-2xl animate-pulse flex flex-col overflow-hidden border border-neutral-100">
                  <div className="h-48 bg-neutral-200" />
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="h-4 bg-neutral-200 w-3/4 rounded mb-3" />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200" />
                      <div className="h-3 bg-neutral-200 w-1/2 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {recentPhotos.map(photo => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    photographer={getPhotographer(photo.photographer_id)}
                    onNavigate={onNavigate}
                    onAddToCart={onAddToCart}
                    currentUser={currentUser}
                    loading="lazy"
                  />
                ))}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => onNavigate({ name: 'discover' })}
                  className="group relative inline-flex items-center justify-start px-8 py-4 overflow-hidden font-bold rounded-full bg-white text-neutral-900 shadow-lg hover:shadow-xl border border-neutral-200 transition-all"
                >
                  <span className="w-0 h-0 rounded bg-primary absolute top-0 left-0 ease-out duration-500 transition-all group-hover:w-full group-hover:h-full -z-1" />
                  <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 group-hover:text-white">
                    Explorar Galeria Completa
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── 4. Eventos Recentes ───────────────────────────────────────────── */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center mb-12 text-center">
            <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2">Acontecendo agora</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">Eventos Recentes</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mt-4" />
          </div>

          {(loadingEvents || loadingPhotogs) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm animate-pulse">
                  <div className="h-44 bg-neutral-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-neutral-200 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 rounded w-1/2" />
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200" />
                      <div className="h-3 bg-neutral-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentEvents.filter(e => photographersMap[e.photographer_id] !== undefined).length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {recentEvents
                  .filter(e => photographersMap[e.photographer_id] !== undefined)
                  .slice(0, 8)
                  .map(event => {
                  const category = categoriesMap[event.category_id];
                  const photographer = photographersMap[event.photographer_id] || event.photographer;
                  const eventDate = event.event_date
                    ? new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : null;

                  return (
                    <div
                      key={event.id}
                      className="group rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white flex flex-col"
                      onClick={() => onNavigate({ name: 'event', id: event.id })}
                    >
                      <div className="relative h-44 bg-neutral-100 overflow-hidden">
                        {event.cover_photo_url ? (
                          <WatermarkedImage
                            src={event.cover_photo_url}
                            alt={event.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 gap-2">
                            <svg className="w-12 h-12 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-neutral-400">Fotos em breve</span>
                          </div>
                        )}
                        {category && (
                          <span className="absolute top-2 left-2 bg-black/50 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {category.name}
                          </span>
                        )}
                      </div>
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
              <div className="flex justify-center">
                <button
                  onClick={() => onNavigate({ name: 'find-photos' })}
                  className="group relative inline-flex items-center justify-start px-8 py-4 overflow-hidden font-bold rounded-full bg-white text-neutral-900 shadow-lg hover:shadow-xl border border-neutral-200 transition-all"
                >
                  <span className="w-0 h-0 rounded bg-primary absolute top-0 left-0 ease-out duration-500 transition-all group-hover:w-full group-hover:h-full -z-1" />
                  <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 group-hover:text-white">
                    Ver todos os Eventos
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-center text-neutral-400 py-12">Nenhum evento disponível no momento.</p>
          )}
        </div>
      </section>

      {/* ── 5. Talentos em Ascensão (Carousel) ───────────────────────────── */}
      <section className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">Talentos em Ascensão</h2>
              <p className="text-neutral-500 mt-1 text-sm">Conheça os criadores que estão definindo tendências visuais.</p>
            </div>
            <div className="flex items-center gap-2">
              <CarouselBtn onClick={photogsCarousel.prev} dir="prev" disabled={!photogsCarousel.canPrev} />
              <CarouselBtn onClick={photogsCarousel.next} dir="next" disabled={!photogsCarousel.canNext} />
            </div>
          </div>

          {/* Carousel track */}
          <div
            ref={photogsRef}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-10 pt-5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loadingPhotogs
              ? [1, 2, 3, 4].map(i => <PhotogSkeleton key={i} />)
              : photographers.map((p, index) => (
                <div
                  key={p.id}
                  className="group relative flex-none w-4/5 sm:w-1/2 lg:w-[calc(25%-18px)] rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 snap-start"
                  onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: p.id })}
                >
                  <div className="bg-white rounded-2xl overflow-hidden">
                  <div className={`h-24 w-full bg-gradient-to-r ${index % 2 === 0 ? 'from-neutral-900 to-neutral-800' : 'from-neutral-800 to-neutral-900'}`} />
                  <div className="px-6 pb-8 relative">
                    <div className="relative -mt-12 mb-4 flex justify-center">
                      <div className="p-1 bg-white rounded-full shadow-lg">
                        <img
                          src={p.avatar_url}
                          alt={p.name}
                          className="w-24 h-24 rounded-full object-cover border-2 border-white"
                        />
                      </div>
                      <div className="absolute bottom-1 right-[calc(50%-2.5rem)] bg-primary text-white p-1 rounded-full border-2 border-white" title="Fotógrafo Verificado">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-display font-bold text-xl text-neutral-900 mb-1 group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-center gap-1 text-sm text-neutral-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{p.location || 'Brasil'}</span>
                      </div>
                      <div className="flex justify-center gap-4 mb-6 text-xs text-neutral-400 font-medium">
                        <div className="flex flex-col items-center">
                          <span className="text-neutral-900 text-base font-bold">
                            {p.approvalPercentage ? Math.round(p.approvalPercentage) : 100}%
                          </span>
                          <span>Aprovações</span>
                        </div>
                        <div className="w-px h-8 bg-neutral-100" />
                        <div className="flex flex-col items-center">
                          <span className="text-neutral-900 text-base font-bold">
                            {p.avgRating ? p.avgRating.toFixed(1) : '5.0'}
                          </span>
                          <span>Avaliação</span>
                        </div>
                      </div>
                      <button className="w-full py-2.5 px-4 rounded-full border border-neutral-200 text-neutral-700 font-medium text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md">
                        Ver Portfólio
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Link to all photographers */}
          {photographers.length > 4 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => onNavigate({ name: 'photographers' })}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                Ver todos os fotógrafos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;


