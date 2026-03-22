import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, List, MessageSquare, Target, Youtube, Network, Sparkles, ArrowRight, Zap, RefreshCw, BookOpen, ChevronRight } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

function Home() {
  const features = [
    { icon: FileText, title: 'Smart Summarization 📝', description: <>Extract and summarize <strong className="text-brand-coral">key points</strong> from your documents using <span className="text-brand-orange font-medium">advanced AI</span>.</> },
    { icon: List, title: 'Cheat Sheets ⚡', description: <>Generate <strong className="text-brand-coral">quick reference guides</strong> organized organically by core topics.</> },
    { icon: MessageSquare, title: 'Auto Q&A 🤔', description: <>Create rich, interactive <strong className="text-brand-coral">exam-style questions</strong> from your study materials.</> },
    { icon: Target, title: 'MCQ Quizzes 🎯', description: <>Test your knowledge with multiple choice questions at <span className="text-brand-orange font-medium">dynamic difficulty levels</span>.</> },
    { icon: Youtube, title: 'Video Suggestions 📺', description: <>Find highly relevant, <strong className="text-brand-coral">curated YouTube videos</strong> to supplement your learning.</> },
    { icon: Network, title: 'Visual Diagrams 🕸️', description: <>Generate intelligent mind maps and flowcharts to <span className="text-brand-orange font-medium">visualize complex concepts</span>.</> },
  ];

  const steps = [
    { number: '01', title: 'Upload Content 📂', description: <>Drop your <strong className="text-white">PDF, images, or raw text</strong> into your secure workspace.</> },
    { number: '02', title: 'AI Extraction 🧠', description: <>Our custom OCR pipeline extracts and <strong className="text-white">meticulously cleans</strong> the original text.</> },
    { number: '03', title: 'Generate Materials ✨', description: <>Instantly create <strong className="text-white">beautiful summaries, quizzes, and diagrams</strong>.</> },
    { number: '04', title: 'Master & Excel 🎓', description: <>Utilize the generated insights to master the content <span className="text-brand-coral font-medium">incredibly fast</span>.</> },
  ];

  return (
    <div className="flex flex-col gap-32 pb-32 overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-32 lg:pt-48 pb-20 px-4">
        <div className="absolute inset-0 z-0 bg-gradient-radial from-brand-orange/10 via-dark-surface to-dark opacity-70" />
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center">
            
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-brand-orange/20 text-brand-orange text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Learning Platform</span>
            </motion.div>
            
            <motion.h2 variants={fadeIn} className="text-lg md:text-xl text-brand-coral font-medium tracking-wider uppercase mb-3">
              Master Complex Topics 🚀 in Record Time
            </motion.h2>

            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-display font-semibold mb-6 leading-[1.1]">
              Realtime Notes<br className="hidden md:block"/>
              <span className="text-gradient">Summarizer</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Elevate your academic workflow. Transform <strong className="text-white/90">chaotic notes and dense PDFs</strong> into <span className="text-brand-coral font-medium">elegant study materials</span>, adaptive quizzes, and visual maps instantly.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/workspace" className="group relative inline-flex items-center justify-center px-8 py-4 rounded-full bg-brand-orange text-white font-medium text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(217,90,64,0.4)]">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="relative flex items-center gap-2">
                  Start Summarizing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              
              <Link to="/study-mode" className="inline-flex items-center justify-center px-8 py-4 rounded-full glass-panel hover:bg-white/5 text-white font-medium text-lg transition-all hover:border-white/10">
                Explore Study Modes
              </Link>
            </motion.div>
            
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 w-full">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">A Suite of Intelligent Tools</h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">Everything you need to deconstruct, comprehend, and retain knowledge beautifully.</p>
        </motion.div>
        
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div key={i} variants={fadeIn} className="glass-panel p-8 rounded-2xl group glass-panel-hover">
                <div className="w-12 h-12 rounded-xl bg-dark border border-white/5 flex items-center justify-center mb-6 text-brand-orange group-hover:text-brand-coral group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-white">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* How It Works Timeline */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 w-full">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">Streamlined Workflow</h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">From upload to complete comprehension in four definitive steps.</p>
        </motion.div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2 hidden md:block" />
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeIn} className="relative flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center mb-6 relative z-10 border-brand-orange/20 shadow-[0_0_20px_rgba(217,90,64,0.1)] group-hover:border-brand-orange transition-colors duration-500">
                  <span className="font-display text-xl font-bold text-gradient">{step.number}</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary max-w-[200px]">{step.description}</p>
                {i !== steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-white/20 absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-5xl mx-auto w-full px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="relative rounded-3xl overflow-hidden glass-panel border-brand-orange/20 p-12 md:p-20 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-deep-red/20 to-transparent opacity-50" />
          
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-display font-semibold mb-6">Ready to Elevate Your Mind? 🧠✨</h2>
            <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">Experience the future of <strong className="text-brand-orange">organic learning</strong>. Start curating your personal knowledge base today. 🚀</p>
            
            <Link to="/workspace" className="group relative inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-dark font-medium text-lg overflow-hidden transition-transform hover:scale-105">
              <span className="relative flex items-center gap-2">
                Initialize Workspace <Zap className="w-5 h-5 text-brand-orange" />
              </span>
            </Link>
          </div>
        </motion.div>
      </section>
      
    </div>
  );
}

export default Home;
