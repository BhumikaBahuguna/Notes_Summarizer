import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, BookOpen, Target, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const modes = [
  {
    id: 'quick-revision',
    title: 'Quick Revision',
    icon: Zap,
    color: 'text-brand-orange',
    bgLight: 'bg-brand-orange/10',
    border: 'border-brand-orange/30',
    gradient: 'from-brand-orange to-brand-coral',
    time: '5–10 min',
    tagline: 'Revise fast before your exam',
    description: 'Get a rapid overview of your notes with ultra-brief summaries, key terms, a mini concept tree, and a 3-question quiz.',
    features: [
      { id: 'ultra-summary', title: 'Ultra Brief Summary', desc: '5–7 bullet points' },
      { id: 'key-concepts', title: 'Key Concepts', desc: 'Most important terms' },
      { id: 'mini-quiz', title: 'Mini Quiz', desc: '3 quick MCQs' },
    ],
  },
  {
    id: 'deep-study',
    title: 'Deep Study',
    icon: BookOpen,
    color: 'text-blue-400',
    bgLight: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    gradient: 'from-blue-400 to-blue-600',
    time: '30–60 min',
    tagline: 'Truly understand every concept',
    description: 'Dive deep with detailed summaries, an AI tutor, auto-generated flashcards, concept maps, and video recommendations.',
    features: [
      { id: 'detailed-summary', title: 'Detailed Summary', desc: 'In-depth explanation' },
      { id: 'ai-tutor', title: 'AI Tutor', desc: 'Simplifications & examples' },
      { id: 'concept-map', title: 'Concept Map', desc: 'Visual network' },
    ],
  },
  {
    id: 'exam-prep',
    title: 'Exam Preparation',
    icon: Target,
    color: 'text-brand-deep-red',
    bgLight: 'bg-brand-deep-red/10',
    border: 'border-brand-deep-red/30',
    gradient: 'from-brand-deep-red to-red-600',
    time: '45–90 min',
    tagline: 'Ace your exam with confidence',
    description: 'Full exam-mode practice with expected questions, 3-level quizzes, weak-topic detection, and last-minute sheets.',
    features: [
      { id: 'expected-questions', title: 'Expected Questions', desc: 'Likely exam Qs' },
      { id: 'three-level-quiz', title: '3-Level Quiz', desc: 'Adaptive MCQs' },
      { id: 'weak-topics', title: 'Weak Topic Detection', desc: 'Find gaps' },
    ],
  },
];

function StudyMode({ uploadedData, onNotify }) {
  const navigate = useNavigate();
  const hasNotes = !!uploadedData?.extracted_text;

  const handleModeClick = (modeId) => {
    navigate(`/study-mode/${modeId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 w-full pb-24">
      <div className="text-center mb-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-orange/5 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-semibold mb-6 relative z-10"
        >
          Advanced Study Modes
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-text-secondary max-w-2xl mx-auto relative z-10"
        >
          Select your learning trajectory. From lightning-fast revisions to comprehensive deep dives, tailor the AI engine to your immediate goals.
        </motion.p>
        
        {!hasNotes && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 inline-flex items-center gap-3 p-4 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange max-w-md mx-auto relative z-10"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm text-left">
              Initialization required. <button className="font-semibold underline hover:text-white transition-colors" onClick={() => navigate('/workspace')}>Access Workspace</button> to upload source material first.
            </p>
          </motion.div>
        )}
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10"
      >
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <motion.div
              key={mode.id}
              variants={itemVariants}
              onClick={() => handleModeClick(mode.id)}
              className={cn(
                "group cursor-pointer rounded-3xl p-8 glass-panel border border-white/5 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden",
                `hover:border-t hover:border-l hover:${mode.border} hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]`
              )}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", mode.bgLight, mode.color)}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-dark border border-white/5 text-xs font-semibold text-text-secondary tracking-wider uppercase">
                    {mode.time}
                  </div>
                </div>

                <h2 className="text-2xl font-display font-semibold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all">
                  {mode.title}
                </h2>
                <p className={cn("text-sm font-medium mb-4", mode.color)}>{mode.tagline}</p>
                <p className="text-text-secondary leading-relaxed mb-8 flex-grow">
                  {mode.description}
                </p>

                <div className="space-y-3 mb-8">
                  {mode.features.map(feat => (
                    <div key={feat.id} className="flex items-start gap-3">
                      <div className={cn("mt-1 w-1.5 h-1.5 rounded-full shrink-0", mode.bgLight.replace('/10', ''))} />
                      <div>
                        <p className="text-sm font-medium text-white/90">{feat.title}</p>
                        <p className="text-xs text-text-secondary">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-white/5 mt-auto flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">Initialize Mode</span>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-r transform group-hover:translate-x-1 transition-all", mode.gradient)}>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

export { modes };
export default StudyMode;
