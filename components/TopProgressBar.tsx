import React, { useEffect, useState } from 'react';

interface TopProgressBarProps {
  isAnimating: boolean;
}

const TopProgressBar: React.FC<TopProgressBarProps> = ({ isAnimating }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isAnimating) {
      setVisible(true);
      setProgress(10);

      // Simulate network progress
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Random increment between 5 and 15
          return prev + Math.random() * 10 + 5;
        });
      }, 300);
    } else {
      // Finish progress
      setProgress(100);
      
      // Hide after a short delay
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);

      return () => clearTimeout(timeout);
    }

    return () => clearInterval(interval);
  }, [isAnimating]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[100] h-1 pointer-events-none">
      <div 
        className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--color-primary),0.8)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default TopProgressBar;
