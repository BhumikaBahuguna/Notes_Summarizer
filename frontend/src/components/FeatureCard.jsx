import { useEffect, useState } from 'react';
import {
  generateCheatSheet,
  generateQuestions,
  generateQuiz,
  getYouTubeSuggestions,
  generateDiagram,
} from '../services/api';
import MermaidDiagram from './MermaidDiagram';
import LoadingState from './LoadingState';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Download, ShieldAlert, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

function FeatureCard({ feature, extractedText, onNotify, onFeatureComplete, onFeatureLoading }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [quizDifficulty, setQuizDifficulty] = useState('beginner');
  const [selectedAnswers, setSelectedAnswers] = useState({});

  useEffect(() => {
    setLoading(false);
    setError(null);
    setResult(null);
    setSelectedAnswers({});
  }, [feature.id]);

  const getAnswerToken = (value) => {
    if (!value) return '';
    const text = String(value).trim();
    const match = text.match(/^\(?\s*([A-D])\s*[\).:-]?/i);
    return match ? match[1].toUpperCase() : text.charAt(0).toUpperCase();
  };

  const hasRenderableResult = (featureId, payload) => {
    if (!payload) return false;
    switch (featureId) {
      case 'cheat-sheet': return Array.isArray(payload.bullets) && payload.bullets.length > 0;
      case 'questions': return Array.isArray(payload.questions) && payload.questions.length > 0;
      case 'quiz': return Array.isArray(payload.quiz) && payload.quiz.length > 0;
      case 'youtube': return Array.isArray(payload.videos) && payload.videos.length > 0;
      case 'diagram': return typeof payload.code === 'string' && payload.code.trim().length > 0;
      default: return false;
    }
  };

  const isGenerated = hasRenderableResult(feature.id, result);

  const getExportText = () => {
    if (!result) return '';
    switch (feature.id) {
      case 'cheat-sheet':
        return (result.bullets || [])
          .map((section) => `${section.section || 'Section'}\n${(section.bullets || []).map(p => `- ${p}`).join('\n')}`)
          .join('\n\n');
      case 'questions':
        return (result.questions || []).map((q, idx) => `Q${idx + 1}: ${q.question}\nA: ${q.answer}`).join('\n\n');
      case 'quiz':
        return (result.quiz || []).map((q, idx) => `Q${idx + 1}: ${q.question}\n${(q.options || []).join('\n')}\nCorrect: ${q.correct_answer}\nExplanation: ${q.explanation || ''}`).join('\n\n');
      case 'youtube':
        return (result.videos || []).map((v, idx) => `${idx + 1}. ${v.title}\n${v.description || ''}\n${v.youtube_url || v.url || ''}`).join('\n\n');
      case 'diagram':
        return result.code || '';
      default:
        return JSON.stringify(result, null, 2);
    }
  };

  const copyResult = async () => {
    const text = getExportText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    onNotify?.(`${feature.title} copied to clipboard.`, 'success');
  };

  const exportResult = () => {
    const text = getExportText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${feature.id}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    onNotify?.(`${feature.title} exported as text file.`, 'success');
  };

  const handleGenerateFeature = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedAnswers({});
    onFeatureLoading?.(feature.id);

    try {
      let data;
      switch (feature.id) {
        case 'cheat-sheet': data = await generateCheatSheet(extractedText); break;
        case 'questions': data = await generateQuestions(extractedText); break;
        case 'quiz': data = await generateQuiz(extractedText, quizDifficulty); break;
        case 'youtube': data = await getYouTubeSuggestions(extractedText); break;
        case 'diagram': data = await generateDiagram(extractedText); break;
        default: break;
      }
      setResult(data);
      onFeatureComplete?.(feature.id, data);
      onNotify?.(`${feature.title} generated successfully.`, 'success');
    } catch (err) {
      setError(err.message);
      onNotify?.(err.message || `Failed to generate ${feature.title}.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!result) return null;

    switch (feature.id) {
      case 'cheat-sheet':
        return (
          <div className="space-y-6">
            {Array.isArray(result.bullets) && result.bullets.length > 0 ? (
              result.bullets.map((sectionData, idx) => (
                <div key={idx} className="bg-dark/50 border border-white/5 p-6 rounded-2xl">
                  <h3 className="text-xl font-semibold text-brand-orange mb-4 pb-2 border-b border-white/10">{sectionData.section || `Section ${idx + 1}`}</h3>
                  <ul className="space-y-3">
                    {Array.isArray(sectionData.bullets) ? sectionData.bullets.map((item, i) => (
                      <li key={i} className="flex gap-3 text-text-secondary">
                        <span className="text-brand-orange mt-1.5 text-xs">▹</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    )) : <li className="text-white/50">No points available.</li>}
                  </ul>
                </div>
              ))
            ) : <p className="text-white/50">No cheat sheet content was generated. Please try again.</p>}
          </div>
        );

      case 'questions':
        return (
          <div className="space-y-6">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-white mb-2">⭐ Expected Questions</h3>
              <p className="text-text-secondary">Based on your document content, these are the most likely questions.</p>
            </div>
            {result.questions && result.questions.length > 0 ? (
              result.questions.map((q, idx) => (
                <div key={idx} className="bg-dark-surface/50 border border-white/10 p-6 rounded-2xl">
                  <div className="flex gap-4 mb-4">
                    <span className="font-bold text-brand-orange">Q{idx + 1}:</span>
                    <p className="text-lg text-white">{q.question}</p>
                  </div>
                  <div className="flex gap-4 p-4 rounded-xl bg-dark border border-white/5">
                    <span className="font-bold text-brand-orange/70">A:</span>
                    <p className="text-text-secondary leading-relaxed">{q.answer}</p>
                  </div>
                </div>
              ))
            ) : <p className="text-white/50">No questions returned.</p>}
          </div>
        );

      case 'quiz': {
        const totalQ = Array.isArray(result.quiz) ? result.quiz.length : 0;
        const answeredCount = Object.keys(selectedAnswers).length;
        const allAnswered = totalQ > 0 && answeredCount === totalQ;
        const correctCount = allAnswered ? result.quiz.filter((q, i) => selectedAnswers[i] === getAnswerToken(q.correct_answer)).length : 0;
        const scorePercent = allAnswered ? Math.round((correctCount / totalQ) * 100) : 0;
        
        return (
          <div className="space-y-8">
            {result.quiz && result.quiz.length > 0 ? (
              <>
                {result.quiz.map((mcq, idx) => {
                  const answered = selectedAnswers[idx] !== undefined;
                  const userToken = selectedAnswers[idx];
                  const correctToken = getAnswerToken(mcq.correct_answer);
                  const isCorrect = answered && userToken === correctToken;
                  
                  return (
                    <div key={idx} className={cn("p-6 md:p-8 rounded-3xl transition-all duration-300 border", answered ? (isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5") : "bg-dark/50 border-white/5")}>
                      <div className="flex gap-4 mb-6">
                        <span className="w-8 h-8 shrink-0 rounded-full bg-dark flex items-center justify-center font-bold text-brand-orange border border-white/10">{idx + 1}</span>
                        <p className="text-xl text-white pt-0.5">{mcq.question}</p>
                      </div>
                      <div className="space-y-3 pl-12">
                        {mcq.options.map((option, i) => {
                          const optToken = getAnswerToken(option);
                          const isThisCorrect = optToken === correctToken;
                          const isThisSelected = userToken === optToken;
                          let optClass = "px-5 py-4 rounded-xl cursor-pointer transition-colors border";
                          if (answered) {
                            optClass += isThisCorrect ? " border-green-500 bg-green-500/10 text-white" : isThisSelected ? " border-red-500 bg-red-500/10 text-white" : " border-white/5 opacity-50";
                          } else {
                            optClass += isThisSelected ? " border-brand-orange bg-brand-orange/10 text-white" : " border-white/5 bg-dark hover:bg-white/5 text-text-secondary hover:text-white";
                          }
                          return (
                            <label key={i} className={optClass + " flex items-center justify-between"}>
                              <div className="flex items-center gap-3">
                                <input type="radio" checked={isThisSelected} disabled={answered} onChange={() => { if (!answered) setSelectedAnswers(p => ({ ...p, [idx]: optToken })) }} className="text-brand-orange bg-dark border-white/20" />
                                <span>{option}</span>
                              </div>
                              {answered && isThisCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                              {answered && isThisSelected && !isThisCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                            </label>
                          );
                        })}
                      </div>
                      {answered && (
                         <div className={cn("mt-6 p-5 rounded-xl flex gap-4 ml-12 border", isCorrect ? "bg-green-500/10 border-green-500/20 text-green-200" : "bg-red-500/10 border-red-500/20 text-red-200")}>
                           <div className="shrink-0 mt-0.5">{isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}</div>
                           <div>
                             <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : `Incorrect. The answer is ${mcq.correct_answer}`}</p>
                             {mcq.explanation && <p className="text-sm opacity-90 leading-relaxed">{mcq.explanation}</p>}
                           </div>
                         </div>
                      )}
                    </div>
                  );
                })}
                {allAnswered && (
                  <div className="bg-dark/50 border border-white/10 p-8 rounded-3xl text-center">
                    <div className="text-4xl mb-4">{scorePercent >= 80 ? '🏆' : scorePercent >= 60 ? '👍' : '📚'}</div>
                    <h3 className="text-3xl font-semibold text-white mb-2">{scorePercent}% Score</h3>
                    <p className="text-text-secondary mb-6">You got {correctCount} out of {totalQ} questions correct.</p>
                    <button className="px-6 py-3 rounded-full bg-brand-orange text-white hover:bg-brand-coral transition-colors" onClick={() => setSelectedAnswers({})}>Retake Quiz</button>
                  </div>
                )}
              </>
            ) : <p className="text-white/50">No quiz generated.</p>}
          </div>
        );
      }

      case 'youtube':
        return (
          <div className="grid grid-cols-1 gap-6">
            {result.videos && result.videos.length > 0 ? result.videos.map((v, idx) => (
              <div key={idx} className="flex gap-6 bg-dark-surface/50 border border-white/5 p-6 rounded-2xl group">
                <div className="w-32 h-24 shrink-0 bg-dark rounded-xl flex items-center justify-center border border-white/10 group-hover:border-brand-orange/30 transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white/30 group-hover:text-brand-orange/60 transition-colors"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-lg font-medium text-white mb-2 truncate">{v.title}</h4>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">{v.description || v.reason}</p>
                  {(v.youtube_url || v.url) && (
                    <a href={v.youtube_url || v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-brand-orange hover:text-brand-coral font-medium text-sm transition-colors">
                      Watch Video <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )) : <p className="text-white/50">No videos found.</p>}
          </div>
        );

      case 'diagram':
        return (
          <div className="bg-white p-8 rounded-2xl overflow-x-auto text-dark border border-white/5">
            {result.code ? <MermaidDiagram code={result.code} /> : <p className="text-dark/50">No diagram generated.</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-panel p-8 md:p-10 rounded-3xl relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-display font-semibold text-white">{feature.title}</h2>
          <p className="text-sm text-text-secondary mt-1">Generated specifically for your document</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {feature.id === 'quiz' && (
            <select
              value={quizDifficulty}
              onChange={(e) => setQuizDifficulty(e.target.value)}
              disabled={loading}
              className="bg-dark/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-brand-orange/50 outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="full_prepared">Advanced</option>
            </select>
          )}
          
          <button
            onClick={handleGenerateFeature}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg",
              isGenerated ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" : "bg-gradient-to-r from-brand-orange to-brand-coral text-white hover:shadow-[0_0_20px_rgba(217,90,64,0.4)]"
            )}
          >
            {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : isGenerated ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="py-12">
            <LoadingState title={`Generating ${feature.title}`} subtitle="Please wait while AI processes your document..." />
          </motion.div>
        )}

        {!loading && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={copyResult} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark/50 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button onClick={exportResult} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 text-sm font-medium hover:bg-brand-orange/20 transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            {renderContent()}
          </motion.div>
        )}

        {!loading && !result && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center text-white/40">
            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
            <p>Click Generate to create {feature.title.toLowerCase()}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FeatureCard;
