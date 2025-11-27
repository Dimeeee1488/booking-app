import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import './AttractionResultsLoadingAnimation.css';

interface AttractionResultsLoadingAnimationProps {
  locationName: string;
  date?: string;
  onBack: () => void;
}

const AttractionResultsLoadingAnimation: React.FC<AttractionResultsLoadingAnimationProps> = ({ 
  locationName, 
  date, 
  onBack 
}) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Searching attractions...');

  useEffect(() => {
    // Smooth progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Stop at 95% until real data loads
        return prev + Math.random() * 8;
      });
    }, 300);

    // Change loading text with attraction-specific stages
    const textTimer1 = setTimeout(() => setLoadingText('Finding experiences...'), 1000);
    const textTimer2 = setTimeout(() => setLoadingText('Checking availability...'), 2000);
    const textTimer3 = setTimeout(() => setLoadingText('Discovering hidden gems...'), 3000);
    const textTimer4 = setTimeout(() => setLoadingText('Comparing prices...'), 4000);
    const textTimer5 = setTimeout(() => setLoadingText('Curating recommendations...'), 5000);
    const textTimer6 = setTimeout(() => setLoadingText('Loading attractions...'), 6000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(textTimer3);
      clearTimeout(textTimer4);
      clearTimeout(textTimer5);
      clearTimeout(textTimer6);
    };
  }, []);

  return (
    <div className="attraction-results-loading">
      <div className="loading-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to search">
          ←
        </button>
        <div className="header-info">
          <h1 className="loading-title">{t('attractionsIn')} {locationName}</h1>
          {date && <p className="loading-date">{date}</p>}
        </div>
        <div className="header-spacer"></div>
      </div>

      <div className="loading-body">
        <div className="loading-card">
          <div className="loading-card-header">
            <p className="loading-card-label">Searching</p>
            <p className="loading-card-status">{loadingText}</p>
          </div>

          <div className="progress-shell">
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-glow" />
          </div>

          <p className="loading-subtext">This usually takes just a few seconds.</p>
        </div>
      </div>
    </div>
  );
};

export default AttractionResultsLoadingAnimation;
