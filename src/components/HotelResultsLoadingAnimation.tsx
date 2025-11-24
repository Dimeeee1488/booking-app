import { useEffect, useState } from 'react';
import './HotelResultsLoadingAnimation.css';

const HotelResultsLoadingAnimation: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Searching for hotels...');

  useEffect(() => {
    // Smooth progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 10;
      });
    }, 300);

    // Change loading text
    const textTimer1 = setTimeout(() => setLoadingText('Checking availability...'), 1000);
    const textTimer2 = setTimeout(() => setLoadingText('Comparing prices...'), 2000);
    const textTimer3 = setTimeout(() => setLoadingText('Finding best deals...'), 3000);
    const textTimer4 = setTimeout(() => setLoadingText('Loading results...'), 4000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(textTimer3);
      clearTimeout(textTimer4);
    };
  }, []);

  return (
    <div className="hotel-results-loading">
      <div className="loading-content">
        {/* Hotel Building Animation */}
        <div className="hotel-building-wrapper">
          <svg viewBox="0 0 100 100" className="hotel-building-svg">
            {/* Building */}
            <rect x="25" y="30" width="50" height="60" fill="none" stroke="#0071c2" strokeWidth="2" className="building-outline" />
            
            {/* Windows - 3 rows of 3 */}
            {[0, 1, 2].map(row => (
              [0, 1, 2].map(col => (
                <rect
                  key={`${row}-${col}`}
                  x={32 + col * 14}
                  y={35 + row * 15}
                  width="8"
                  height="10"
                  fill="#0071c2"
                  className="window"
                  style={{ animationDelay: `${(row * 3 + col) * 0.1}s` }}
                />
              ))
            ))}
            
            {/* Door */}
            <rect x="42" y="75" width="16" height="15" fill="#0071c2" className="door" />
            
            {/* Roof */}
            <path d="M 20 30 L 50 15 L 80 30 Z" fill="none" stroke="#0071c2" strokeWidth="2" className="roof" />
          </svg>
          
          {/* Pulsing rings */}
          <div className="pulse-ring" style={{ animationDelay: '0s' }}></div>
          <div className="pulse-ring" style={{ animationDelay: '0.5s' }}></div>
          <div className="pulse-ring" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Loading Text */}
        <p className="loading-text">{loadingText}</p>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Loading Dots */}
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

export default HotelResultsLoadingAnimation;

