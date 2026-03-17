import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import ResultsView from '../components/ResultsView';
import './Workspace.css';

function Workspace({ uploadedData, setUploadedData, onNotify }) {
  const [activeTab, setActiveTab] = useState('upload');
  const extractedWordCount = uploadedData?.extracted_text
    ? uploadedData.extracted_text.trim().split(/\s+/).length
    : 0;

  const resetWorkspace = () => {
    setUploadedData(null);
    setActiveTab('upload');
    onNotify?.('Workspace reset. Upload a new document to continue.', 'info');
  };

  return (
    <div className="workspace">
      <div className="workspace-container">
        <div className="workspace-header">
          <h1>Study Workspace</h1>
          <p>Upload documents and generate comprehensive study materials</p>
        </div>

        <div className="workspace-content">
          {!uploadedData ? (
            <FileUpload setUploadedData={setUploadedData} onNotify={onNotify} />
          ) : (
            <>
              <div className="workspace-meta">
                <div className="meta-card">
                  <span className="meta-label">Source File</span>
                  <strong>{uploadedData.filename || 'Uploaded Document'}</strong>
                </div>
                <div className="meta-card">
                  <span className="meta-label">OCR Engine</span>
                  <strong>{uploadedData.engine_used || 'N/A'}</strong>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Words Extracted</span>
                  <strong>{extractedWordCount}</strong>
                </div>
                <button className="btn btn-outline btn-small" onClick={resetWorkspace}>
                  Upload Another File
                </button>
              </div>

              <div className="workspace-tabs">
                <button
                  className={`tab-button ${activeTab === 'extracted' ? 'active' : ''}`}
                  onClick={() => setActiveTab('extracted')}
                >
                  � Original Notes
                </button>
                <button
                  className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
                  onClick={() => setActiveTab('results')}
                >
                  ✨ Study Materials
                </button>
              </div>

              {activeTab === 'extracted' && (
                <div className="tab-content">
                  <div className="extracted-text-box">
                    <h3>Original Notes</h3>
                    <div className="text-content">
                      {uploadedData.extracted_text}
                    </div>
                    <button
                      className="btn btn-primary mt-4"
                      onClick={() => setActiveTab('results')}
                    >
                      Generate Study Materials →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'results' && (
                <ResultsView uploadedData={uploadedData} onNotify={onNotify} onViewNotes={() => setActiveTab('extracted')} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Workspace;
