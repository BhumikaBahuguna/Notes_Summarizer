import './Toast.css';

function Toast({ message, type = 'success', onClose }) {
  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <span className="toast-dot" />
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        x
      </button>
    </div>
  );
}

export default Toast;
