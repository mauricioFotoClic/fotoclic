import React from 'react';
import { X, Users, Check, ShieldAlert, Trophy, UserPlus, Award } from 'lucide-react';
import { Page } from '../types';

interface FounderProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

const FounderProgramModal: React.FC<FounderProgramModalProps> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  const handleRegisterRedirect = () => {
    onClose();
    onNavigate({ name: 'register' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors z-10"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-10 flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8 pb-6 border-b border-neutral-100">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex-shrink-0 text-primary">
              <Award size={48} strokeWidth={1.5} />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">
                Programa Fotógrafo Fundador
              </h2>
              <p className="text-neutral-500 text-sm md:text-base mt-1">
                Uma recompensa para quem faz o FotoClic crescer.
              </p>
              <p className="text-neutral-700 text-sm md:text-base mt-3 leading-relaxed">
                Ao se cadastrar no FotoClic e <span className="text-primary font-semibold">publicar</span> suas fotos para venda,
                você garante <span className="text-primary font-semibold">1 ano de comissão de apenas 6%</span>, independente de futuros reajustes da plataforma.
              </p>
            </div>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-primary shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-lg mb-2">Quer continuar pagando apenas 6%?</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                    Os 100 primeiros fotógrafos que alcançarem <span className="text-primary font-bold">R$ 3.000 em vendas mensais</span> conquistarão um benefício exclusivo.
                  </p>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                    Mesmo que, no futuro, o FotoClic aumente sua comissão, esses fotógrafos continuarão pagando apenas 6%, desde que:
                  </p>
                  <ul className="flex flex-col gap-3">
                    <li className="flex gap-3 text-sm text-neutral-600 items-start">
                      <div className="p-0.5 rounded-full bg-orange-50 border border-orange-100 text-primary shrink-0 mt-0.5">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span>mantenham vendas ativas e constantesde;</span>
                    </li>
                    <li className="flex gap-3 text-sm text-neutral-600 items-start">
                      <div className="p-0.5 rounded-full bg-orange-50 border border-orange-100 text-primary shrink-0 mt-0.5">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span>não permaneçam mais de 3 meses consecutivos sem atividade na plataforma.</span>
                    </li>
                  </ul>
                  <p className="text-neutral-600 text-sm leading-relaxed mt-4">
                    Enquanto essas condições forem cumpridas, a comissão continuará sendo de apenas 6%.
                  </p>
                </div>
              </div>

              {/* Note card */}
              <div className="bg-orange-50/50 border border-orange-100/50 rounded-2xl p-4 flex gap-3.5 items-start">
                <div className="p-2 bg-orange-100 rounded-xl text-primary shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div className="text-xs leading-relaxed text-neutral-700">
                  <span className="font-bold text-neutral-900 block mb-0.5">Importante:</span>
                  fotógrafos que já estão cadastrados também participam. O benefício será conquistado pelos 100 primeiros que atingirem esse resultado.
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col justify-between gap-8">
              {/* Practical Example Box */}
              <div className="border border-neutral-100 bg-neutral-50/60 rounded-2xl p-5 flex flex-col gap-5">
                <h4 className="font-bold text-neutral-900 text-sm uppercase tracking-wider">Exemplo na prática</h4>

                {/* Scenario 1 */}
                <div className="flex flex-col gap-3">
                  <h5 className="font-bold text-neutral-900 text-xs">Comissão da plataforma aumenta para 8%</h5>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Fotógrafo Fundador <span className="text-neutral-400 font-light text-[10px]">(vende R$ 3.000 ou mais)</span></span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200/50">Paga 6%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Demais fotógrafos</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/50">Pagam 8%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200/50"></div>

                {/* Scenario 2 */}
                <div className="flex flex-col gap-3">
                  <h5 className="font-bold text-neutral-900 text-xs">Comissão da plataforma aumenta para 10%</h5>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Fotógrafo Fundador <span className="text-neutral-400 font-light text-[10px]">(vende R$ 3.000 ou mais)</span></span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200/50">Paga 6%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Demais fotógrafos</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/50">Pagam 10%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to action section */}
              <div className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-primary shrink-0">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm mb-1">Faça parte dos 100 Fotógrafos Fundadores.</h3>
                    <p className="text-neutral-600 text-xs leading-relaxed">
                      Venda mais, mantenha sua atividade e garanta uma comissão diferenciada enquanto continuar crescendo junto com o FotoClic.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRegisterRedirect}
                  className="w-full bg-primary hover:bg-primary-dark text-white rounded-2xl py-3.5 px-6 flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg transition-all text-sm"
                >
                  <UserPlus size={18} />
                  Quero me cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default FounderProgramModal;
