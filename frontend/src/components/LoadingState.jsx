import { motion } from 'framer-motion';

function LoadingState({ title = 'Working on it...', subtitle = 'Please wait a moment.' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" role="status" aria-live="polite">
      <div className="relative w-16 h-16 mb-6">
        <motion.div 
          className="absolute inset-0 border-4 border-white/5 rounded-full"
        />
        <motion.div 
          className="absolute inset-0 border-4 border-brand-orange rounded-full border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: "linear", repeat: Infinity }}
        />
        <motion.div 
          className="absolute inset-2 bg-gradient-to-tr from-brand-orange/20 to-brand-coral/20 rounded-full blur-[4px]"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        />
      </div>
      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-medium text-white mb-2"
      >
        {title}
      </motion.h3>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-text-secondary"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}

export default LoadingState;
