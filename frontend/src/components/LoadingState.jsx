import './LoadingState.css';

function LoadingState({ title = 'Working on it...', subtitle = 'Please wait a moment.' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-ring" />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}

export default LoadingState;
