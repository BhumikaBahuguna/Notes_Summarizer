import { useState, useCallback } from 'react';
import { uploadFile } from '../services/api';
import LoadingState from './LoadingState';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';

function FileUpload({ setUploadedData, onNotify }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summarizeLevel, setSummarizeLevel] = useState('balanced');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (validTypes.includes(droppedFile.type)) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Invalid file format. Please upload PDF, PNG, or JPG.');
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const clearFile = () => {
    setFile(null);
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
    <div className="w-full max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 md:p-10 rounded-3xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-semibold mb-2">Upload Content</h2>
          <p className="text-text-secondary">Drop your study material here to magically transform it.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          {/* Drag & Drop Zone */}
          <div 
            className={cn(
              "relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-300",
              isDragging 
                ? "border-brand-orange bg-brand-orange/5 shadow-[0_0_30px_rgba(217,90,64,0.15)]" 
                : "border-white/20 bg-dark-surface/30 hover:bg-dark-surface/60 hover:border-brand-orange/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-input"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
              disabled={loading}
            />
            
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div 
                  key="upload-prompt"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center text-center p-6 pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-full bg-dark flex items-center justify-center mb-4 text-brand-orange group-hover:scale-110 group-hover:bg-brand-orange group-hover:text-white transition-all duration-300 shadow-xl">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium text-white mb-2">Click to browse or drag file here</p>
                  <p className="text-sm text-text-secondary">Supported formats: PDF, PNG, JPG (Max 10MB)</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center p-6 z-20"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange/20 to-brand-coral/10 border border-brand-orange/30 flex items-center justify-center mb-4 text-brand-orange relative">
                    <File className="w-8 h-8" />
                    {!loading && (
                      <button 
                        type="button" 
                        onClick={clearFile}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-dark border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:bg-brand-deep-red transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-lg font-medium text-white max-w-[200px] truncate">{file.name}</p>
                  <p className="text-sm text-brand-orange mt-1">Ready to process</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Level Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-secondary">Summarization Depth</label>
            <div className="grid grid-cols-3 gap-3">
              {['concise', 'balanced', 'detailed'].map((level) => (
                <label 
                  key={level}
                  className={cn(
                    "relative flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-200",
                    summarizeLevel === level 
                      ? "bg-brand-orange/10 border-brand-orange text-brand-orange" 
                      : "bg-dark shadow-inner border-white/5 text-text-secondary hover:border-white/20 hover:text-white"
                  )}
                >
                  <input
                    type="radio"
                    name="summarizeLevel"
                    value={level}
                    checked={summarizeLevel === level}
                    onChange={(e) => setSummarizeLevel(e.target.value)}
                    className="sr-only"
                    disabled={loading}
                  />
                  <span className="capitalize text-sm font-medium relative z-10">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-deep-red/10 border border-brand-deep-red/30 text-brand-coral">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Action */}
          <div className="pt-2">
            {!loading ? (
              <button
                type="submit"
                disabled={!file}
                className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-brand-orange to-brand-coral p-px transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(217,90,64,0.3)] hover:shadow-[0_8px_30px_rgba(217,90,64,0.4)]"
              >
                <div className="relative bg-transparent group-hover:bg-white/10 transition-colors px-6 py-4 rounded-xl flex items-center justify-center gap-2">
                  <span className="text-white font-medium text-lg">Process Document</span>
                </div>
              </button>
            ) : (
               <div className="w-full rounded-xl glass-panel p-6">
                 <LoadingState title="Extracting Knowledge..." subtitle="Our AI is carefully reading your document." />
               </div>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default FileUpload;
