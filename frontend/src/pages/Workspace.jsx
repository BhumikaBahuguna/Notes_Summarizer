import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import ResultsView from '../components/ResultsView';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Cpu, AlignLeft, RotateCcw, LayoutTemplate } from 'lucide-react';
import { cn } from '../lib/utils';

function Workspace({ uploadedData, setUploadedData, onNotify }) {
  const [activeTab, setActiveTab] = useState(uploadedData ? 'results' : 'upload');
  const extractedWordCount = uploadedData?.extracted_text
    ? uploadedData.extracted_text.trim().split(/\s+/).length
    : 0;

  const resetWorkspace = () => {
    setUploadedData(null);
    setActiveTab('upload');
    onNotify?.('Workspace reset. Upload a new document to continue.', 'info');
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-24">
      {/* Workspace Header */}
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-semibold mb-4"
        >
          Your Workspace
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-text-secondary"
        >
          Initialize your intelligence base
        </motion.p>
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {!uploadedData ? (
            <motion.div
              key="upload-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <FileUpload setUploadedData={setUploadedData} onNotify={onNotify} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Metadata Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark border border-white/5 flex items-center justify-center text-brand-orange">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Source File</p>
                    <p className="font-medium text-white truncate max-w-[150px]">{uploadedData.filename || 'Document'}</p>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark border border-white/5 flex items-center justify-center text-brand-coral">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">OCR Engine</p>
                    <p className="font-medium text-white">{uploadedData.engine_used || 'Standard OCR'}</p>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-dark border border-white/5 flex items-center justify-center text-brand-gold">
                      <AlignLeft className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary mb-1">Words Extracted</p>
                      <p className="font-medium text-white">{extractedWordCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex bg-dark-surface p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setActiveTab('extracted')}
                    className={cn(
                      "px-6 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                      activeTab === 'extracted' ? "text-white" : "text-text-secondary hover:text-white"
                    )}
                  >
                    {activeTab === 'extracted' && (
                      <motion.div layoutId="tab-indicator" className="absolute inset-0 bg-white/10 rounded-lg shadow-sm" />
                    )}
                    <span className="relative z-10 flex items-center gap-2"><FileText className="w-4 h-4"/> Original Notes</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className={cn(
                      "px-6 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                      activeTab === 'results' ? "text-brand-orange" : "text-text-secondary hover:text-white"
                    )}
                  >
                    {activeTab === 'results' && (
                      <motion.div layoutId="tab-indicator" className="absolute inset-0 bg-brand-orange/10 rounded-lg shadow-sm" />
                    )}
                    <span className="relative z-10 flex items-center gap-2"><LayoutTemplate className="w-4 h-4"/> Study Materials</span>
                  </button>
                </div>
                
                <button
                  onClick={resetWorkspace}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-brand-orange transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Workspace
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'extracted' && (
                  <motion.div
                    key="extracted-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-panel p-8 rounded-3xl"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-display font-medium text-white">Extracted Text</h3>
                    </div>
                    <div className="bg-dark/50 border border-white/5 rounded-2xl p-6 h-[500px] overflow-y-auto text-text-secondary leading-relaxed font-mono text-sm whitespace-pre-wrap">
                      {uploadedData.extracted_text}
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button
                        onClick={() => setActiveTab('results')}
                        className="px-6 py-3 rounded-full bg-white text-dark font-medium hover:bg-brand-beige transition-colors flex items-center gap-2"
                      >
                        Generate Study Materials <LayoutTemplate className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'results' && (
                  <motion.div
                    key="results-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ResultsView uploadedData={uploadedData} onNotify={onNotify} onViewNotes={() => setActiveTab('extracted')} />
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Workspace;
