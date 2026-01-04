
import React, { useEffect, useState } from 'react';
import { Photo, User, PhotographerWithStats, Category, Page } from '../types';
import api from '../services/api';
import PhotoCard from '../components/PhotoCard';
import Spinner from '../components/Spinner';
import WatermarkedImage from '../components/WatermarkedImage';
import SEO from '../components/SEO';

interface HomePageProps {
  onNavigate: (page: Page) => void;
  onAddToCart: (photoId: string, imgElement?: HTMLImageElement) => void;
  currentUser?: User | null;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate, onAddToCart, currentUser }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
  const [photographers, setPhotographers] = useState<PhotographerWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Use optimized API calls to avoid downloading entire database tables
        const [featuredPhotos, popularPhotographers, mainCategories, recent] = await Promise.all([
          api.getFeaturedPhotos(),
          api.getActivePhotographersPreview(), // Lighter query
          api.getCategories(),
          api.getRecentPhotos(8), // Limit DB query to 8
        ]);


        // No fallback - strictly show only admin-featured photos
        const finalFeatured = featuredPhotos;

        // Randomize the featured photos for hero section variety
        const shuffledFeatured = [...finalFeatured].sort(() => 0.5 - Math.random());

        setPhotos(shuffledFeatured.slice(0, 5));
        setRecentPhotos(recent);
        setPhotographers(popularPhotographers);
        setCategories(mainCategories);
      } catch (error) {
        console.error("Falha ao carregar os dados da página inicial", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onNavigate({ name: 'discover', initialSearch: searchQuery });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getPhotographerForPhoto = (photographerId: string) => {
    return photographers.find(p => p.id === photographerId);
  };

  // Componente interno para o Card Elegante do Mosaico
  const MosaicCard = ({ photo, className = "" }: { photo: Photo, className?: string }) => {
    const photographer = getPhotographerForPhoto(photo.photographer_id);

    return (
      <div
        onClick={() => onNavigate({ name: 'photo-detail', id: photo.id })}
        className={`group relative overflow-hidden rounded-2xl cursor-pointer ${className}`}
      >
        <div className="absolute inset-0 bg-neutral-900/20 group-hover:bg-neutral-900/0 transition-colors duration-500 z-10 pointer-events-none"></div>
        <WatermarkedImage
          src={photo.preview_url}
          alt={photo.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        {/* Gradient Overlay */}
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
        {/* Mobile visible price badge if not hovering */}
        <div className="absolute top-4 right-4 sm:hidden z-30">
          <span className="text-xs font-bold bg-white/90 text-neutral-900 px-2 py-1 rounded-md shadow-sm">
            R$ {photo.price.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SEO
        title="Home | FotoClic"
        description="Encontre e compre fotos esportivas profissionais de alta qualidade. Cobertura de eventos, maratonas, surf e muito mais."
      />
      {/* Hero Section */}
      <section className="relative h-[60vh] bg-cover bg-center text-white flex items-center justify-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1920&auto=format&fit=crop')" }}>
        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px]"></div>
        <div className="relative z-10 text-center p-4 max-w-4xl mx-auto animate-fade-in-up">
          <h1 className="text-4xl md:text-7xl font-display font-bold mb-6 leading-tight">
            Descubra a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-secondary-light">Foto Perfeita</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-neutral-200 font-light">
            Imagens de alta qualidade e livres de royalties dos fotógrafos mais talentosos do mundo.
          </p>
          <div className="relative w-full max-w-xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex">
              <input
                type="text"
                placeholder="Pesquise milhões de fotosssss..."
                className="w-full pl-6 pr-14 py-4 text-neutral-800 bg-white border-0 rounded-full focus:ring-0 shadow-2xl text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2 bottom-2 bg-primary w-12 rounded-full text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {/* Categories Section - Redesigned */}
      <section className="py-24 bg-neutral-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center justify-center mb-16 text-center">
            <span className="text-primary font-bold text-sm uppercase tracking-widest mb-2">Navegue por Temas</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-900">Categorias</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mt-6"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => onNavigate({ name: 'category', id: category.id })}
                className="group relative h-64 md:h-80 w-full overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 ease-out transform hover:-translate-y-2"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                {/* Image with zoom effect */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

                {/* Border effect */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/20 rounded-2xl transition-colors duration-300 pointer-events-none"></div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-left">
                  <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="block w-8 h-1 bg-primary mb-3 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-100"></span>
                    <h3 className="font-display font-bold text-white text-xl md:text-2xl tracking-wide drop-shadow-lg">
                      {category.name}
                    </h3>
                    <div className="h-0 group-hover:h-6 overflow-hidden transition-[height] duration-500 ease-in-out opacity-0 group-hover:opacity-100">
                      <span className="text-xs text-neutral-300 font-medium uppercase tracking-wider mt-2 block">
                        Explorar coleção
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Featured Photos Section - Mosaic Layout */}
      <section className="py-24 bg-[#0F0F0F] relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                Fotos em Destaque
              </h2>
              <p className="text-neutral-400 text-lg font-light">
                Uma seleção semanal das imagens mais impressionantes e técnicas da nossa comunidade de elite.
              </p>
            </div>
            <button
              onClick={() => onNavigate({ name: 'featured-photos' })}
              className="group flex items-center text-white font-medium hover:text-primary transition-colors px-6 py-3 rounded-full border border-neutral-700 hover:border-primary"
            >
              Ver coleção completa
              <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </button>
          </div>

          {loading ? <Spinner /> : (
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
              {/* Hero Item - Big Left */}
              {photos.length > 0 && (
                <MosaicCard photo={photos[0]} className="md:col-span-2 md:row-span-2 h-[300px] md:h-auto" />
              )}

              {/* Right Side Grid */}
              {photos.length > 1 && <MosaicCard photo={photos[1]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
              {photos.length > 2 && <MosaicCard photo={photos[2]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
              {photos.length > 3 && <MosaicCard photo={photos[3]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
              {photos.length > 4 && <MosaicCard photo={photos[4]} className="md:col-span-1 md:row-span-1 h-[200px] md:h-auto" />}
            </div>
          )}
        </div>
      </section>

      {/* Popular Photographers Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">Talentos em Ascensão</h2>
            <p className="text-neutral-500">Conheça os criadores que estão definindo tendências visuais.</p>
          </div>

          {loading ? <Spinner /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {photographers.slice(0, 4).map((p, index) => (
                <div
                  key={p.id}
                  className="group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer transform hover:-translate-y-2"
                  onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: p.id })}
                >
                  {/* Decorative Header Background */}
                  <div className={`h-24 w-full bg-gradient-to-r ${index % 2 === 0 ? 'from-neutral-900 to-neutral-800' : 'from-neutral-800 to-neutral-900'}`}></div>

                  <div className="px-6 pb-8 relative">
                    {/* Avatar with Ring */}
                    <div className="relative -mt-12 mb-4 flex justify-center">
                      <div className="p-1 bg-white rounded-full shadow-lg">
                        <img
                          src={p.avatar_url}
                          alt={p.name}
                          className="w-24 h-24 rounded-full object-cover border-2 border-white"
                        />
                      </div>
                      {/* Verified Badge */}
                      <div className="absolute bottom-1 right-[calc(50%-2.5rem)] bg-blue-500 text-white p-1 rounded-full border-2 border-white" title="Fotógrafo Verificado">
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

                      {/* Mini Stats or Tags could go here */}
                      <div className="flex justify-center gap-4 mb-6 text-xs text-neutral-400 font-medium">
                        <div className="flex flex-col items-center">
                          <span className="text-neutral-900 text-base font-bold">
                            {p.approvalPercentage ? Math.round(p.approvalPercentage) : 100}%
                          </span>
                          <span>Aprovações</span>
                        </div>
                        <div className="w-px h-8 bg-neutral-100"></div>
                        <div className="flex flex-col items-center">
                          <span className="text-neutral-900 text-base font-bold">
                            {p.avgRating ? p.avgRating.toFixed(1) : '5.0'}
                          </span>
                          <span>Avaliação</span>
                        </div>
                      </div>

                      <button
                        className="w-full py-2.5 px-4 rounded-full border border-neutral-200 text-neutral-700 font-medium text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md"
                      >
                        Ver Portfólio
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Photos Preview Section */}
      <section className="py-24 bg-neutral-50 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center mb-16 text-center">
            <span className="text-primary font-bold text-sm uppercase tracking-widest mb-2">O que há de novo</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-900">Fotos Recentes</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mt-6"></div>
          </div>

          {loading ? <Spinner /> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {recentPhotos.map(photo => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    photographer={getPhotographerForPhoto(photo.photographer_id)}
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
                  className="group relative inline-flex items-center justify-start px-8 py-4 overflow-hidden font-bold rounded-full bg-white text-neutral-900 shadow-lg transition-all hover:bg-white hover:shadow-xl border border-neutral-200"
                >
                  <span className="w-0 h-0 rounded bg-primary absolute top-0 left-0 ease-out duration-500 transition-all group-hover:w-full group-hover:h-full -z-1"></span>
                  <span className="w-full text-neutral-900 transition-colors duration-300 ease-in-out group-hover:text-white z-10 flex items-center gap-2">
                    Explorar Galeria Completa
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
