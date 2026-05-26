import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullHeight?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label, fullHeight = false }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const containerClass = fullHeight 
    ? "min-h-[60vh] flex flex-col justify-center items-center gap-4" 
    : `flex ${label ? 'flex-col' : ''} justify-center items-center ${size === 'sm' ? 'p-0' : 'p-4'}`;

  return (
    <div className={containerClass}>
      <div className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}></div>
      {label && (
        <p className="text-neutral-500 font-medium animate-pulse text-sm mt-2">
          {label}
        </p>
      )}
    </div>
  );
};

export default Spinner;


