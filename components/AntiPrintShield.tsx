import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CameraOff, Lock, X } from 'lucide-react';

interface AntiPrintShieldProps {
  /** Permite desativar temporariamente em certas rotas se necessário */
  enabled?: boolean;
}

const AntiPrintShield: React.FC<AntiPrintShieldProps> = ({ enabled = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerReason, setTriggerReason] = useState<'printscreen' | 'print' | 'shortcut'>('printscreen');
  const [cooldown, setCooldown] = useState(false);

  const triggerWarning = useCallback((reason: 'printscreen' | 'print' | 'shortcut' = 'printscreen') => {
    if (!enabled || cooldown) return;

    setTriggerReason(reason);
    setIsOpen(true);
    setCooldown(true);

    // Cooldown de 2.5 segundos para não spammar múltiplos popups se apertar várias vezes
    setTimeout(() => {
      setCooldown(false);
    }, 2500);
  }, [enabled, cooldown]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Tecla PrintScreen (Windows/Linux)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        triggerWarning('printscreen');
        return;
      }

      // 2. Atalho de Impressão (Ctrl+P / Cmd+P)
      if (cmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerWarning('print');
        return;
      }

      // 3. Atalho de Salvar Página (Ctrl+S / Cmd+S)
      if (cmdOrCtrl && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        triggerWarning('shortcut');
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        triggerWarning('printscreen');
      }
    };

    // Evento disparado quando o navegador inicia processo de impressão
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerWarning('print');
    };

    // Detecção quando a janela perde o foco (ex: abrindo ferramenta de captura Win+Shift+S ou atalhos Mac)
    const handleWindowBlur = () => {
      document.body.classList.add('screen-capture-blur');
    };

    const handleWindowFocus = () => {
      document.body.classList.remove('screen-capture-blur');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.body.classList.remove('screen-capture-blur');
    };
  }, [enabled, triggerWarning]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="anti-print-title"
    >
      <div
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Detalhe de fundo com brilho sutil */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Botão de Fechar */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Fechar aviso"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone e Cabeçalho */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            {triggerReason === 'print' ? (
              <CameraOff className="w-8 h-8" />
            ) : (
              <ShieldAlert className="w-8 h-8" />
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <Lock className="w-3.5 h-3.5" /> Proteção de Direitos Autorais
          </span>

          <h3 id="anti-print-title" className="text-xl sm:text-2xl font-display font-bold text-white mb-2">
            Captura de Tela Proibida
          </h3>

          <p className="text-sm text-neutral-300 leading-relaxed mb-6">
            O download não autorizado ou a captura de tela (<strong className="text-white">print</strong>) deste conteúdo é proibida conforme a Lei de Direitos Autorais (<strong className="text-amber-400">Lei nº 9.610/98</strong>).
          </p>

          <div className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-xs text-neutral-300 leading-relaxed">
                As fotos originais em <strong className="text-white">altíssima resolução e sem marca d&apos;água</strong> são liberadas imediatamente após a aquisição na galeria.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark active:scale-[0.99] transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            Entendi e Concordo
          </button>
        </div>
      </div>
    </div>
  );
};

export default AntiPrintShield;
