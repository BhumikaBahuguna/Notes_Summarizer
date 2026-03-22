import { useMemo, useState } from 'react';
import FeatureCard from './FeatureCard';
import { motion, AnimatePresence } from 'framer-motion';
import { AlignLeft, FileText, HelpCircle, Target, Youtube, GitBranch, Copy, Download, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

function ResultsView({ uploadedData, onNotify, onViewNotes }) {
  const [activeFeature, setActiveFeature] = useState('summary');
  const [featureStatus, setFeatureStatus] = useState({});
  
  const features = [
    { id: 'summary', title: 'Summary', icon: AlignLeft, content: uploadedData?.summary },
    { id: 'cheat-sheet', title: 'Cheat Sheet', icon: FileText, endpoint: '/cheat-sheet' },
    { id: 'questions', title: 'Questions', icon: HelpCircle, endpoint: '/questions' },
    { id: 'quiz', title: 'Quiz', icon: Target, endpoint: '/quiz' },
    { id: 'youtube', title: 'Videos', icon: Youtube, endpoint: '/youtube' },
    { id: 'diagram', title: 'Diagram', icon: GitBranch, endpoint: '/diagram' },
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
    <div className="flex flex-col lg:flex-row gap-8 mt-6">
      
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="glass-panel p-4 rounded-2xl sticky top-28">
          <div className="mb-6 px-2">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Modules</h3>
            <div className="w-full h-1.5 bg-dark rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-brand-orange to-brand-coral"
                initial={{ width: 0 }}
                animate={{ width: `${completion.percent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-text-secondary mt-2 text-right">{completion.readyCount}/{completion.totalCount} Generated</p>
          </div>

          <div className="space-y-1.5">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              const status = feature.id === 'summary' ? 'ready' : (featureStatus[feature.id] || 'idle');
              
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group relative",
                    isActive ? "text-white" : "text-text-secondary hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-module" 
                      className="absolute inset-0 bg-white/10 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-brand-orange" : "text-text-secondary group-hover:text-white/70")} />
                    {feature.title}
                  </div>
                  
                  {/* Status Indicator */}
                  {feature.id !== 'summary' && (
                    <div className="relative z-10 flex items-center justify-center w-5 h-5">
                      {status === 'idle' && <div className="w-2 h-2 rounded-full bg-white/20" />}
                      {status === 'loading' && <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-orange border-t-transparent animate-spin" />}
                      {status === 'ready' && <div className="w-2 h-2 rounded-full bg-brand-coral shadow-[0_0_8px_rgba(242,138,114,0.8)]" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 px-2">
           <button onClick={onViewNotes} className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl border border-white/10 text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
             <BookOpen className="w-4 h-4" /> View Original
           </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow min-w-0">
        <AnimatePresence mode="wait">
          {activeFeature === 'summary' ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="glass-panel p-8 md:p-10 rounded-3xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-white">Executive Summary</h2>
                  <p className="text-sm text-text-secondary mt-1">High-level overview of the original text</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={copySummary} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark/50 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button onClick={downloadSummary} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-orange text-white text-sm font-medium hover:bg-brand-coral transition-colors">
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
              </div>

              <div className="prose prose-invert prose-brand max-w-none">
                {uploadedData?.summary ? (
                  <div className="text-white/90 leading-relaxed font-serif text-lg">
                    {uploadedData.summary}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                    <AlignLeft className="w-12 h-12 mb-4 opacity-20" />
                    <p>No summary generated yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FeatureCard
                feature={features.find(f => f.id === activeFeature)}
                extractedText={uploadedData?.extracted_text}
                onNotify={onNotify}
                onFeatureComplete={handleFeatureComplete}
                onFeatureLoading={handleFeatureLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default ResultsView;
