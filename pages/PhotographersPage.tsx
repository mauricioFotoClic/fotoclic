
import React, { useEffect, useState, useMemo } from 'react';
import { User, Page } from '../types';
import api from '../services/api';
import SEO from '../components/SEO';
import { includesNormalized, getAvatarFallbackUrl } from '../utils/stringUtils';

interface PhotographersPageProps {
  onNavigate: (page: Page) => void;
}

const PhotographersPage: React.FC<PhotographersPageProps> = ({ onNavigate }) => {
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    api.getPhotographers().then(data => {
      setPhotographers(data.filter(p => p.is_active && p.approvedCount > 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredPhotographers = useMemo(() => {
    let result = photographers;
    if (searchName.trim()) {
      result = result.filter(p =>
        includesNormalized(p.name, searchName) ||
        (p.bio && includesNormalized(p.bio, searchName))
      );
    }
    if (searchCity.trim()) {
      result = result.filter(p =>
        p.location && includesNormalized(p.location, searchCity)
      );
    }
    return result;
  }, [photographers, searchName, searchCity]);

  const hasFilters = searchName || searchCity;

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title="Encontrar Profissional"
        description="Encontre o fotógrafo perfeito para o seu evento. Busque por nome ou cidade."
        url="https://fotoclic.com.br/fotografos"
      />

      {/* Hero Section */}
      <section className="bg-primary py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-3">
            Encontre o fotógrafo <strong>perfeito</strong> para seu evento
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Busque por nome, especialidade ou cidade
          </p>

          {/* Two search fields */}
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nome do fotógrafo"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                className="w-full pl-5 pr-5 py-4 rounded-xl text-neutral-800 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por cidade"
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                className="w-full pl-11 pr-5 py-4 rounded-xl text-neutral-800 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <button className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-colors flex items-center gap-2 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* Count + clear */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-neutral-500">
              {loading ? 'Carregando...' : `${filteredPhotographers.length} fotógrafo${filteredPhotographers.length !== 1 ? 's' : ''} encontrado${filteredPhotographers.length !== 1 ? 's' : ''}`}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearchName(''); setSearchCity(''); }}
                className="text-sm text-primary hover:underline font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-neutral-100 p-6 animate-pulse flex flex-col items-center">
                  <div className="w-28 h-28 rounded-full bg-neutral-200 mb-4" />
                  <div className="h-5 bg-neutral-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-neutral-200 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-neutral-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredPhotographers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredPhotographers.map(p => (
                <div
                  key={p.id}
                  className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
                  onClick={() => onNavigate({ name: 'photographer-portfolio', photographerId: p.id })}
                >
                  <div className="relative mb-4">
                    <img
                      src={p.avatar_url || getAvatarFallbackUrl(p.name, 128)}
                      alt={p.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-neutral-100 group-hover:border-primary transition-all duration-300"
                      onError={(e) => { e.currentTarget.src = getAvatarFallbackUrl(p.name, 128); }}
                    />
                  </div>
                  <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">{p.name}</h3>
                  {p.location && (
                    <p className="text-sm text-neutral-500 mb-3 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {p.location}
                    </p>
                  )}
                  {p.bio && (
                    <p className="text-sm text-neutral-600 line-clamp-2 mb-5">{p.bio}</p>
                  )}
                  <button className="mt-auto px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-all w-full">
                    Ver Portfólio
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-neutral-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-neutral-500 font-medium text-lg">Nenhum fotógrafo encontrado</p>
              <p className="text-neutral-400 text-sm mt-1">Tente outro nome ou cidade.</p>
              {hasFilters && (
                <button onClick={() => { setSearchName(''); setSearchCity(''); }} className="mt-4 text-primary font-medium hover:underline">
                  Limpar busca
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PhotographersPage;


