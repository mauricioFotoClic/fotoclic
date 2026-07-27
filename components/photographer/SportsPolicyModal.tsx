import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Trophy } from 'lucide-react';

interface SportsPolicyModalProps {
  isOpen: boolean;
  onAccept: () => void;
  isSubmitting?: boolean;
}

const SportsPolicyModal: React.FC<SportsPolicyModalProps> = ({
  isOpen,
  onAccept,
  isSubmitting = false,
}) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      return;
    }

    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white flex items-center gap-4 border-b border-neutral-700">
          <div className="p-3 bg-primary/20 rounded-2xl text-primary shrink-0 border border-primary/30">
            <Trophy size={32} />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-primary font-bold">Aviso aos Fotógrafos</span>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white">
              Diretrizes e Termos de Uso da FotoClic
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-4 text-neutral-700 text-sm md:text-base leading-relaxed flex-1">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3 text-orange-900">
            <ShieldAlert size={22} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm font-medium">
              A FotoClic é uma plataforma focada na qualidade e finalidade comercial do mercado esportivo. Por favor, leia atentamente as regras abaixo.
            </p>
          </div>

          <p>
            A <strong>FotoClic</strong> é uma plataforma destinada exclusivamente a fotógrafos e empresas de fotografia que comercializam imagens de eventos esportivos e demais eventos autorizados. Não é permitida a utilização da plataforma como rede social, portfólio pessoal ou para publicação de conteúdos sem relação com sua finalidade.
          </p>

          <p className="font-semibold text-neutral-900">
            A FotoClic reserva-se o direito de remover conteúdos, suspender ou excluir contas que:
          </p>

          <ul className="list-disc pl-5 space-y-2 text-neutral-800">
            <li>Violem estes Termos de Uso;</li>
            <li>Sejam incompatíveis com a finalidade da plataforma;</li>
            <li>Publiquem conteúdo inadequado ou sem relação com os serviços oferecidos;</li>
            <li>Permaneçam inativas por mais de 120 (cento e vinte) dias, sem publicar fotografias para comercialização ou sem utilização efetiva da plataforma;</li>
            <li>Sejam utilizadas de forma que prejudiquem a organização, a qualidade ou o funcionamento da FotoClic.</li>
          </ul>

          <p className="text-xs md:text-sm text-neutral-600 bg-neutral-50 p-4 rounded-xl border border-neutral-100 italic">
            A administração da FotoClic poderá remover conteúdos, suspender ou excluir essas contas, independentemente de aviso prévio, sempre com o objetivo de preservar a qualidade, a organização e a finalidade da plataforma, garantindo a melhor experiência para fotógrafos, atletas e demais usuários.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-neutral-500 flex items-center gap-2">
            {countdown > 0 ? (
              <span className="font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                ⏱️ Por favor, leia o aviso ({countdown}s restantes)
              </span>
            ) : (
              <span className="font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle size={14} /> Leitura concluída
              </span>
            )}
          </div>

          <button
            onClick={onAccept}
            disabled={countdown > 0 || isSubmitting}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
              countdown > 0 || isSubmitting
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                : 'bg-primary text-white hover:bg-orange-600 active:scale-95 hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <span>Salvando confirmação...</span>
            ) : countdown > 0 ? (
              <span>Aguarde {countdown}s para aceitar</span>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Li e Aceito os Termos da FotoClic</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SportsPolicyModal;
