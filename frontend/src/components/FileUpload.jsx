import { useState } from 'react';
import { uploadFile } from '../services/api';
import LoadingState from './LoadingState';
import './FileUpload.css';

function FileUpload({ setUploadedData, onNotify }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summarizeLevel, setSummarizeLevel] = useState('balanced');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await uploadFile(file, summarizeLevel);
      setUploadedData(data);
      onNotify?.('Document processed successfully. You can now generate materials.', 'success');
    } catch (err) {
      setError(err.message || 'Failed to upload file');
      onNotify?.(err.message || 'File upload failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload">
      <div className="upload-box">
        <div className="upload-icon">📤</div>
        <h2>Upload Your Document</h2>
        <p>Supported formats: PDF, PNG, JPG, JPEG</p>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-wrapper">
            <input
              type="file"
              id="file-input"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
              disabled={loading}
            />
            <label htmlFor="file-input" className="file-label">
              {file ? file.name : 'Click to select file or drag & drop'}
            </label>
          </div>

          <div className="summarize-options">
            <label>Summarization Level:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="concise"
                  checked={summarizeLevel === 'concise'}
                  onChange={(e) => setSummarizeLevel(e.target.value)}
                  disabled={loading}
                />
                <span>Concise</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="balanced"
                  checked={summarizeLevel === 'balanced'}
                  onChange={(e) => setSummarizeLevel(e.target.value)}
                  disabled={loading}
                />
                <span>Balanced</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="detailed"
                  checked={summarizeLevel === 'detailed'}
                  onChange={(e) => setSummarizeLevel(e.target.value)}
                  disabled={loading}
                />
                <span>Detailed</span>
              </label>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && (
            <LoadingState
              title="Processing your document"
              subtitle="Extracting text and preparing study material..."
            />
          )}

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <span className="loading"></span>
                Processing...
              </>
            ) : (
              'Upload & Extract'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FileUpload;
