import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

function Toast({ message, type = 'success', onClose }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgs = {
    success: 'bg-green-500/10 border-green-500/20 text-green-100',
    error: 'bg-red-500/10 border-red-500/20 text-red-100',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-100'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[100]"
      role="status" 
      aria-live="polite"
    >
      <div className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl glass-panel",
        bgs[type]
      )}>
        <div className="shrink-0">{icons[type]}</div>
        <span className="text-sm font-medium mr-4">{message}</span>
        <button 
          onClick={onClose} 
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default Toast;
