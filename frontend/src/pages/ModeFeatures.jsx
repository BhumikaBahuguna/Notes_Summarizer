import { useNavigate, useParams } from 'react-router-dom';
import { modes } from './StudyMode';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, ArrowLeft } from 'lucide-react';

function ModeFeatures({ uploadedData, onNotify }) {
  const { modeId } = useParams();
  const navigate = useNavigate();

  const mode = modes.find((m) => m.id === modeId);
  const hasNotes = !!uploadedData?.extracted_text;

  if (!mode) {
    return (
      <div className="max-w-7xl mx-auto px-4 text-center pt-20">
        <h1 className="text-3xl text-white mb-6">Mode not found</h1>
        <button className="px-6 py-3 rounded-full bg-brand-orange text-white" onClick={() => navigate('/study-mode')}>
          Return to Study Modes
        </button>
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

  const Icon = mode.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      <button 
        onClick={() => navigate('/study-mode')}
        className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Modes
      </button>

      <div className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden mb-12">
        <div className={`absolute top-0 right-0 w-96 h-96 ${mode.bgLight} rounded-full blur-[100px] -z-10 translate-x-1/3 -translate-y-1/3`} />
        
        <div className="flex items-start gap-6">
          <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center ${mode.bgLight} ${mode.color}`}>
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold text-white mb-3">{mode.title}</h1>
            <p className="text-lg text-text-secondary max-w-2xl">{mode.description}</p>
          </div>
        </div>

        {!hasNotes && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 flex items-start gap-3 p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              You haven't initialized your intelligence base. <button className="font-semibold underline hover:text-white" onClick={() => navigate('/workspace')}>Got to Workspace</button> to upload notes.
            </p>
          </motion.div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-medium text-white mb-6">Available Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mode.features.map((feat, i) => (
            <motion.button
              key={feat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleFeatureClick(feat.id)}
              disabled={!hasNotes}
              className="text-left group relative glass-panel p-6 rounded-2xl transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed border hover:border-white/20"
            >
              <div className="flex justify-between items-center mb-2">
                <strong className="text-white text-lg font-medium">{feat.title}</strong>
                <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-brand-orange group-hover:translate-x-1 transition-all" />
              </div>
              <span className="text-text-secondary text-sm">{feat.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModeFeatures;
