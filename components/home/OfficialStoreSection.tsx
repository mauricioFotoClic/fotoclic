import React, { useState } from 'react';
import { ShoppingBag, Sparkles, QrCode, ShieldCheck, Truck, ExternalLink, ArrowRight, CheckCircle2, Flame } from 'lucide-react';

interface OfficialStoreSectionProps {
  storeUrl?: string;
}

const OfficialStoreSection: React.FC<OfficialStoreSectionProps> = ({
  storeUrl = 'https://fotoclic.lojaintegrada.com.br/'
}) => {
  const [selectedView, setSelectedView] = useState<'frente' | 'costas'>('costas');

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Card Container */}
        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {/* Subtle top badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 shadow-[0_0_15px_rgba(32,201,51,0.2)]">
              <Sparkles size={14} />
              Loja Oficial FotoClic
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Flame size={13} className="text-amber-400" />
              Lançamento Exclusivo
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Copywriting & Value Propositions (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white leading-tight tracking-tight">
                  Vista a Camisa Oficial da <span className="text-primary">FotoClic</span>
                </h2>
                <p className="mt-4 text-neutral-300 text-base sm:text-lg font-light leading-relaxed">
                  Eleve sua presença profissional com a camisa oficial da FotoClic. Desenvolvida para fotógrafos que buscam <strong>alta performance</strong>, <strong>conforto térmico</strong> e <strong>autoridade visual</strong> em coberturas esportivas, sociais, corporativas e eventos em geral.
                </p>
              </div>

              {/* Differentials Bullet Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
                  <div className="p-2 bg-primary/20 text-primary rounded-xl shrink-0 mt-0.5">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">QR Code Inteligente</h3>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                      Clientes escaneiam suas costas no evento e encontram as fotos na hora!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-800/60 border border-neutral-700/50">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 mt-0.5">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Tecido Dry Fit UV50+</h3>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                      Proteção solar e transpiração ativa para longas jornadas de trabalho.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Features Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-400 pt-1">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <CheckCircle2 size={16} className="text-primary" />
                  Garantia de Qualidade
                </span>
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Truck size={16} className="text-primary" />
                  Entrega para Todo o Brasil
                </span>
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <ShieldCheck size={16} className="text-primary" />
                  Compra 100% Segura
                </span>
              </div>

              {/* Primary Call To Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-neutral-950 bg-primary hover:bg-primary-light transition-all duration-300 shadow-[0_0_25px_rgba(32,201,51,0.35)] hover:shadow-[0_0_35px_rgba(32,201,51,0.5)] transform hover:-translate-y-0.5"
                >
                  <ShoppingBag size={18} />
                  <span>Acessar Loja Oficial FotoClic</span>
                  <ExternalLink size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                </a>

                <span className="text-xs text-neutral-400 text-center sm:text-left">
                  Modelos masculinos e femininos em todos os tamanhos (P ao XG).
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Product Showcase (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 shadow-2xl relative">
                
                {/* View Switcher Tabs */}
                <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedView('costas')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedView === 'costas'
                        ? 'bg-primary text-neutral-950 shadow-md font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <QrCode size={14} />
                    Costas (com QR Code)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedView('frente')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedView === 'frente'
                        ? 'bg-primary text-neutral-950 shadow-md font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Frente Oficial
                  </button>
                </div>

                {/* Product Image Frame */}
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 aspect-[4/5] group cursor-pointer"
                >
                  <img
                    src={selectedView === 'costas' ? '/images/store/camisa-fotoclic-costas.png' : '/images/store/camisa-fotoclic-frente.png'}
                    alt={selectedView === 'costas' ? 'Camisa FotoClic Costas QR Code' : 'Camisa FotoClic Frente'}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                    <span className="px-5 py-2.5 rounded-full bg-primary text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl">
                      <ShoppingBag size={16} />
                      Ver na Loja Oficial
                    </span>
                  </div>

                  {/* Floating Price Tag / Stamp */}
                  <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase">Vestuário Oficial</p>
                      <p className="text-xs font-black text-white">Camisa Oficial FotoClic</p>
                    </div>
                    <span className="text-primary font-bold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Comprar <ArrowRight size={14} />
                    </span>
                  </div>
                </a>

                {/* Thumbnail Switcher preview */}
                <div className="flex gap-3 mt-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedView('costas')}
                    className={`w-14 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedView === 'costas' ? 'border-primary scale-105 shadow-md shadow-primary/20' : 'border-neutral-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src="/images/store/camisa-fotoclic-costas.png" alt="Costas" className="w-full h-full object-cover object-top" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedView('frente')}
                    className={`w-14 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedView === 'frente' ? 'border-primary scale-105 shadow-md shadow-primary/20' : 'border-neutral-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src="/images/store/camisa-fotoclic-frente.png" alt="Frente" className="w-full h-full object-cover object-top" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default OfficialStoreSection;
