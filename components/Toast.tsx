
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Trigger exit
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to finish before unmounting
    }, duration);

    return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
    };
  }, [onClose, duration]);

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    ),
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[6000] flex items-center w-full max-w-xs p-4 text-white rounded-lg shadow-2xl ${bgColors[type]} transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-white bg-white/20 rounded-lg backdrop-blur-sm">
        {icons[type]}
      </div>
      <div className="ml-3 text-sm font-medium">{message}</div>
      <button 
        onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} 
        type="button" 
        className="ml-auto -mx-1.5 -my-1.5 bg-white/20 text-white rounded-lg p-1.5 hover:bg-white/30 inline-flex h-8 w-8 items-center justify-center transition-colors"
      >
        <span className="sr-only">Fechar</span>
        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  );
};

export default Toast;
