import { useMemo, useState } from 'react';
import FeatureCard from './FeatureCard';
import './ResultsView.css';

function ResultsView({ uploadedData, onNotify, onViewNotes }) {
  const [activeFeature, setActiveFeature] = useState('summary');
  const [featureStatus, setFeatureStatus] = useState({});
  
  const features = [
    {
      id: 'summary',
      title: 'Summary',
      icon: '📋',
      content: uploadedData?.summary,
    },
    {
      id: 'cheat-sheet',
      title: 'Cheat Sheet',
      icon: '📝',
      endpoint: '/cheat-sheet',
    },
    {
      id: 'questions',
      title: 'Questions',
      icon: '❓',
      endpoint: '/questions',
    },
    {
      id: 'quiz',
      title: 'Quiz',
      icon: '🎯',
      endpoint: '/quiz',
    },
    {
      id: 'youtube',
      title: 'Videos',
      icon: '📺',
      endpoint: '/youtube',
    },
    {
      id: 'diagram',
      title: 'Diagram',
      icon: '🎨',
      endpoint: '/diagram',
    },
  ];

  const completion = useMemo(() => {
    const readyCount = Object.values(featureStatus).filter((state) => state === 'ready').length;
    const totalCount = features.length - 1;
    return {
      readyCount,
      totalCount,
      percent: Math.round((readyCount / totalCount) * 100),
    };
  }, [featureStatus, features.length]);

  const handleFeatureComplete = (featureId) => {
    setFeatureStatus((prev) => ({ ...prev, [featureId]: 'ready' }));
  };

  const handleFeatureLoading = (featureId) => {
    setFeatureStatus((prev) => ({ ...prev, [featureId]: 'loading' }));
  };

  const copySummary = async () => {
    if (!uploadedData?.summary) return;
    await navigator.clipboard.writeText(uploadedData.summary);
    onNotify?.('Summary copied to clipboard.', 'success');
  };

  const downloadSummary = () => {
    if (!uploadedData?.summary) return;
    const blob = new Blob([uploadedData.summary], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'summary.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    onNotify?.('Summary exported as text file.', 'success');
  };

  return (
    <div className="results-view">
      <div className="features-navbar">
        {features.map((feature) => (
          <button
            key={feature.id}
            className={`feature-btn ${activeFeature === feature.id ? 'active' : ''}`}
            onClick={() => setActiveFeature(feature.id)}
            title={feature.title}
          >
            <span className="feature-btn-icon">{feature.icon}</span>
            <span className="feature-btn-text">{feature.title}</span>
            {feature.id !== 'summary' && (
              <span className={`feature-status-dot ${featureStatus[feature.id] || 'idle'}`} />
            )}
          </button>
        ))}
      </div>

      <div className="generation-progress">
        <div className="progress-head">
          <span>Material Progress</span>
          <strong>{completion.readyCount}/{completion.totalCount} ready</strong>
          <button className="btn btn-outline btn-small view-notes-btn" onClick={onViewNotes}>
            📄 View Original Notes
          </button>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${completion.percent}%` }} />
        </div>
      </div>

      <div className="features-content">
        {activeFeature === 'summary' && (
          <div className="feature-view">
            <div className="feature-view-head">
              <h2>Summary</h2>
              <div className="summary-actions">
                <button className="btn btn-outline btn-small" onClick={copySummary}>📋 Copy</button>
                <button className="btn btn-secondary btn-small" onClick={downloadSummary}>⬇ Download</button>
              </div>
            </div>
            <div className="summary-content">
              {uploadedData?.summary ? (
                <div>{uploadedData.summary}</div>
              ) : (
                <p>No summary available</p>
              )}
            </div>
          </div>
        )}

        {features.find(f => f.id === activeFeature)?.endpoint && (
          <FeatureCard
            key={activeFeature}
            feature={features.find(f => f.id === activeFeature)}
            extractedText={uploadedData?.extracted_text}
            onNotify={onNotify}
            onFeatureComplete={handleFeatureComplete}
            onFeatureLoading={handleFeatureLoading}
          />
        )}
      </div>
    </div>
  );
}

export default ResultsView;
