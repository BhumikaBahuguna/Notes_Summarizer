import { useNavigate, useParams } from 'react-router-dom';
import { modes } from './StudyMode';
import './StudyMode.css';

function ModeFeatures({ uploadedData, onNotify }) {
  const { modeId } = useParams();
  const navigate = useNavigate();

  const mode = modes.find((m) => m.id === modeId);
  const hasNotes = !!uploadedData?.extracted_text;

  if (!mode) {
    return (
      <div className="study-mode-page">
        <div className="study-mode-container">
          <div className="study-mode-hero">
            <h1>Mode not found</h1>
            <button className="btn btn-primary" onClick={() => navigate('/study-mode')}>
              Back to Study Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFeatureClick = (featureId) => {
    if (!hasNotes) {
      onNotify?.('Please upload a document in the Workspace first.', 'error');
      return;
    }
    navigate(`/study-mode/${mode.id}/${featureId}`);
  };

  return (
    <div className="study-mode-page">
      <div className="study-mode-container">
        <div className="study-mode-hero">
          <h1>{mode.icon} {mode.title}</h1>
          <p className="study-mode-subtitle">{mode.description}</p>
          <button className="link-btn" onClick={() => navigate('/study-mode')}>
            ← Back to all modes
          </button>

          {!hasNotes && (
            <div className="study-mode-warning">
              <span>⚠️</span>
              <p>
                You haven't uploaded a document yet.{' '}
                <button className="link-btn" onClick={() => navigate('/workspace')}>
                  Go to Workspace
                </button>{' '}
                to upload your notes first.
              </p>
            </div>
          )}
        </div>

        <div className="mode-features-grid">
          <h3 className="mode-features-heading">Available Features in {mode.title}</h3>
          {mode.features.map((feat) => (
            <button
              key={feat.id}
              className="mode-feature-item"
              onClick={() => handleFeatureClick(feat.id)}
              disabled={!hasNotes}
            >
              <span className="mf-icon">{feat.icon}</span>
              <div className="mf-info">
                <strong>{feat.title}</strong>
                <span>{feat.desc}</span>
              </div>
              <span className="mf-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModeFeatures;
