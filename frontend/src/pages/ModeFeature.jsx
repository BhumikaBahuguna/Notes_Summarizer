import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { modes } from './StudyMode';
import MermaidDiagram from '../components/MermaidDiagram';
import LoadingState from '../components/LoadingState';
import { generateStudyFeature, generateAiTutorResponse } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Copy, Download, MessageSquare, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

function ModeFeature({ uploadedData, onNotify }) {
  const { modeId, featureId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState({});

  // AI Tutor state
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorHistory, setTutorHistory] = useState([]);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Flashcard state
  const [flippedCards, setFlippedCards] = useState({});

  const mode = modes.find((m) => m.id === modeId);
  const feature = mode?.features.find((f) => f.id === featureId);
  const extractedText = uploadedData?.extracted_text || '';

  useEffect(() => {
    setResult(null);
    setError(null);
    setSelectedAnswers({});
    setTutorHistory([]);
    setFlippedCards({});
  }, [featureId, modeId]);

  const handleGenerate = async () => {
    if (!extractedText) {
      onNotify?.('No notes available. Upload a document first.', 'error');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedAnswers({});
    try {
      const data = await generateStudyFeature(modeId, featureId, extractedText);
      setResult(data);
      onNotify?.(`${feature?.title} generated successfully.`, 'success');
    } catch (err) {
      setError(err.message);
      onNotify?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTutorAsk = async () => {
    if (!tutorQuery.trim()) return;
    const question = tutorQuery.trim();
    setTutorQuery('');
    setTutorLoading(true);
    setTutorHistory((prev) => [...prev, { role: 'user', text: question }]);
    try {
      const data = await generateAiTutorResponse(extractedText, question);
      setTutorHistory((prev) => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setTutorHistory((prev) => [...prev, { role: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setTutorLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    onNotify?.('Copied to clipboard.', 'success');
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    onNotify?.('Downloaded.', 'success');
  };

  const getAnswerToken = (value) => {
    if (!value) return '';
    const text = String(value).trim();
    const match = text.match(/^\(?\s*([A-D])\s*[\).:-]?/i);
    return match ? match[1].toUpperCase() : text.charAt(0).toUpperCase();
  };

  const exportableText = useMemo(() => {
    if (!result) return '';
    if (result.summary) return result.summary;
    if (result.bullets) return result.bullets.map((s) => `${s.section}\n${(s.bullets || []).join('\n')}`).join('\n\n');
    if (result.concepts) return result.concepts.map((c) => `${c.term}: ${c.definition}`).join('\n');
    if (result.questions) return result.questions.map((q, i) => `Q${i + 1}: ${q.question}\nA: ${q.answer}`).join('\n\n');
    if (result.flashcards) return result.flashcards.map((f, i) => `Card ${i + 1}\nQ: ${f.front}\nA: ${f.back}`).join('\n\n');
    if (result.topics) return result.topics.map((t) => `${t.title}: ${t.description}`).join('\n');
    if (result.examples) return result.examples.map((e, i) => `Example ${i + 1}: ${e.concept}\n${e.example}`).join('\n\n');
    if (result.code) return result.code;
    if (result.definitions) return result.definitions.map((d) => `${d.term}: ${d.definition}`).join('\n');
    if (result.sheet) return result.sheet;
    if (result.formulas) return result.formulas.map((f) => `${f.name}: ${f.formula || f.definition}`).join('\n');
    if (result.quiz) return result.quiz.map((q, i) => `Q${i + 1}: ${q.question}\nCorrect: ${q.correct_answer}`).join('\n\n');
    if (result.videos) return result.videos.map((v) => `${v.title}\n${v.youtube_url || v.url || ''}`).join('\n\n');
    if (result.response) return result.response;
    return JSON.stringify(result, null, 2);
  }, [result]);

  // ── Renderers ──
  const renderBulletSummary = () => (
    <div className="space-y-8">
      {result.summary && <p className="text-lg text-white/90 leading-relaxed font-serif">{result.summary}</p>}
      <div className="space-y-6">
        {result.bullets?.map((section, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-2xl">
            <h4 className="text-lg font-semibold text-brand-orange mb-4">{section.section}</h4>
            <ul className="space-y-3">
              {(section.bullets || []).map((b, i) => (
                <li key={i} className="flex gap-3 text-white/80">
                  <span className="text-brand-orange/50 mt-1.5 text-[10px]">■</span>
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {result.estimated_time && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-brand-gold/20 text-brand-gold text-sm font-medium">
          ⏱️ Estimated revision time: <strong>{result.estimated_time}</strong>
        </div>
      )}
    </div>
  );

  const renderConcepts = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(result.concepts || []).map((c, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors">
          <h4 className="text-brand-orange font-semibold text-lg mb-2">{c.term}</h4>
          <p className="text-text-secondary leading-relaxed">{c.definition}</p>
        </div>
      ))}
    </div>
  );

  const renderDefinitions = () => (
    <div className="space-y-4">
      {(result.definitions || []).map((d, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-4 md:items-start group">
          <strong className="text-brand-orange text-lg min-w-[200px] group-hover:text-brand-coral transition-colors">{d.term}</strong>
          <p className="text-text-secondary leading-relaxed flex-grow">{d.definition}</p>
        </div>
      ))}
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      {(result.questions || []).map((q, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          {q.importance && (
            <div className="absolute top-4 right-4 text-xs font-semibold px-2 py-1 bg-brand-deep-red/20 text-brand-coral rounded-md border border-brand-coral/20">
              🔥 {q.importance}
            </div>
          )}
          <div className="flex gap-4 mb-4">
            <span className="w-8 h-8 shrink-0 rounded-full bg-dark flex items-center justify-center font-bold text-brand-orange border border-white/10">Q{idx + 1}</span>
            <p className="text-lg text-white pt-1">{q.question}</p>
          </div>
          <div className="flex gap-4 p-4 rounded-xl bg-dark/50 border border-white/5">
            <span className="w-8 h-8 shrink-0 rounded-full bg-brand-orange/10 flex items-center justify-center font-bold text-brand-orange border border-brand-orange/20">A</span>
            <p className="text-text-secondary leading-relaxed pt-1">{q.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderQuiz = () => {
    const quizItems = result.quiz || [];
    const totalQ = quizItems.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const allAnswered = totalQ > 0 && answeredCount === totalQ;
    const correctCount = allAnswered
      ? quizItems.filter((q, i) => selectedAnswers[i] === getAnswerToken(q.correct_answer)).length
      : 0;
    const scorePercent = allAnswered ? Math.round((correctCount / totalQ) * 100) : 0;

    const weakTopics = allAnswered
      ? quizItems.map((q, i) => (selectedAnswers[i] !== getAnswerToken(q.correct_answer) ? q.topic || q.question : null)).filter(Boolean)
      : [];

    return (
      <div className="space-y-8">
        {result.levels && (
          <div className="flex flex-wrap gap-2 p-1 bg-dark-surface rounded-xl border border-white/5">
            {result.levels.map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => {
                  setResult((prev) => ({ ...prev, quiz: lvl.questions, _activeLevel: lvl.level }));
                  setSelectedAnswers({});
                }}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                  result._activeLevel === lvl.level 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-text-secondary hover:bg-white/5 hover:text-white"
                )}
              >
                {lvl.level === 'beginner' && '🟢'} {lvl.level === 'intermediate' && '🟡'} {lvl.level === 'full_prepared' && '🔴'} {lvl.label || lvl.level}
              </button>
            ))}
          </div>
        )}

        {quizItems.map((mcq, idx) => {
          const answered = selectedAnswers[idx] !== undefined;
          const userToken = selectedAnswers[idx];
          const correctToken = getAnswerToken(mcq.correct_answer);
          const isCorrect = answered && userToken === correctToken;
          
          return (
            <div key={idx} className={cn(
              "glass-panel p-6 md:p-8 rounded-3xl transition-all duration-300",
              answered ? (isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5") : ""
            )}>
              <div className="flex gap-4 mb-6">
                <span className="w-8 h-8 shrink-0 rounded-full bg-dark flex items-center justify-center font-bold text-brand-orange border border-white/10">{idx + 1}</span>
                <p className="text-xl text-white pt-0.5">{mcq.question}</p>
              </div>

              <div className="space-y-3 pl-12">
                {(mcq.options || []).map((option, i) => {
                  const optT = getAnswerToken(option);
                  const isThisCorrect = optT === correctToken;
                  const isThisPicked = userToken === optT;
                  
                  let optClass = "glass-panel px-5 py-4 rounded-xl cursor-pointer hover:bg-white/5 transition-colors border border-transparent";
                  if (answered) {
                    optClass = "glass-panel px-5 py-4 rounded-xl border opacity-75";
                    if (isThisCorrect) optClass += " border-green-500 bg-green-500/10 opacity-100 text-white";
                    else if (isThisPicked) optClass += " border-red-500 bg-red-500/10 opacity-100 text-white";
                  } else if (isThisPicked) {
                     optClass += " border-brand-orange bg-brand-orange/10 text-white";
                  }

                  return (
                    <label key={i} className={optClass + " flex items-center justify-between"}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`mf-q${idx}`}
                          checked={isThisPicked}
                          disabled={answered}
                          onChange={() => {
                            if (!answered) setSelectedAnswers((p) => ({ ...p, [idx]: optT }));
                          }}
                          className="mr-2 text-brand-orange focus:ring-brand-orange bg-dark border-white/20"
                        />
                        <span className={isThisPicked || (answered && isThisCorrect) ? "font-medium" : "text-white/80"}>{option}</span>
                      </div>
                      {answered && isThisCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {answered && isThisPicked && !isThisCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                    </label>
                  );
                })}
              </div>

              {answered && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className={cn(
                    "mt-6 p-5 rounded-xl flex gap-4 ml-12 border",
                    isCorrect ? "bg-green-500/10 border-green-500/20 text-green-200" : "bg-red-500/10 border-red-500/20 text-red-200"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : `Incorrect. The answer is ${mcq.correct_answer}`}</p>
                    {mcq.explanation && <p className="text-sm opacity-90 leading-relaxed">{mcq.explanation}</p>}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}

        {allAnswered && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-3xl text-center">
             <div className="w-24 h-24 mx-auto rounded-full bg-dark flex items-center justify-center text-4xl mb-4 border border-white/10 shadow-xl">
               {scorePercent >= 80 ? '🏆' : scorePercent >= 60 ? '👍' : '📚'}
             </div>
             <h3 className="text-3xl font-display font-semibold text-white mb-2">
               {scorePercent}% Score
             </h3>
             <p className="text-text-secondary mb-6">You got {correctCount} out of {totalQ} questions correct.</p>
             <button className="px-6 py-3 rounded-full bg-brand-orange text-white font-medium hover:bg-brand-coral transition-colors" onClick={() => setSelectedAnswers({})}>
               Retake Quiz
             </button>

             {weakTopics.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10 text-left">
                <h4 className="text-lg font-medium text-white mb-4">Focus Areas</h4>
                <ul className="space-y-2">
                  {weakTopics.map((t, i) => (
                    <li key={i} className="flex gap-2 text-text-secondary"><span className="text-brand-orange">▹</span> {t}</li>
                  ))}
                </ul>
              </div>
             )}
          </motion.div>
        )}
      </div>
    );
  };

  const renderFlashcards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-1000">
      {(result.flashcards || []).map((card, idx) => (
        <div 
          key={idx} 
          onClick={() => setFlippedCards((p) => ({ ...p, [idx]: !p[idx] }))}
          className="relative h-64 w-full cursor-pointer group"
          style={{ perspective: "1000px" }}
        >
          <motion.div
            className="w-full h-full relative preserve-3d transition-all duration-500"
            initial={false}
            animate={{ rotateY: flippedCards[idx] ? 180 : 0 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center group-hover:border-white/20 transition-colors">
              <span className="absolute top-4 left-4 text-xs font-semibold text-text-secondary uppercase tracking-widest">Question</span>
              <p className="text-lg font-medium text-white">{card.front}</p>
              <span className="absolute bottom-4 opacity-0 group-hover:opacity-100 text-xs text-brand-orange transition-opacity">Click to flip</span>
            </div>
            
            {/* Back */}
            <div 
              className="absolute inset-0 backface-hidden glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center bg-dark-surface/90 border-brand-orange/30 shadow-[0_0_30px_rgba(217,90,64,0.1)]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <span className="absolute top-4 left-4 text-xs font-semibold text-brand-orange/80 uppercase tracking-widest">Answer</span>
              <p className="text-lg text-white font-serif">{card.back}</p>
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );

  const renderAiTutor = () => (
    <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-[700px] border-white/5">
      <div className="bg-dark/50 p-4 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
        {['Explain this topic again', 'Simplify this concept', 'Give examples'].map((q) => (
          <button
            key={q}
            disabled={tutorLoading}
            onClick={() => {
              setTutorQuery(q);
              setTimeout(() => {
                setTutorQuery('');
                setTutorLoading(true);
                setTutorHistory((prev) => [...prev, { role: 'user', text: q }]);
                generateAiTutorResponse(extractedText, q)
                  .then((d) => setTutorHistory((prev) => [...prev, { role: 'ai', text: d.response }]))
                  .catch((e) => setTutorHistory((prev) => [...prev, { role: 'ai', text: `Error: ${e.message}` }]))
                  .finally(() => setTutorLoading(false));
              }, 0);
            }}
            className="shrink-0 px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>
      
      <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin scrollbar-thumb-white/10">
        {tutorHistory.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-50">
            <MessageSquare className="w-16 h-16 mb-4" />
            <p>Ask anything about your notes</p>
          </div>
        )}
        {tutorHistory.map((msg, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4 max-w-[85%]", 
              msg.role === 'user' ? "self-end flex-row-reverse" : "self-start"
            )}
          >
            <div className={cn(
              "w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm border",
              msg.role === 'user' ? "bg-brand-orange/20 border-brand-orange/30 text-brand-orange" : "bg-dark border-white/10 text-white"
            )}>
              {msg.role === 'user' ? '🙋' : '🧑‍🏫'}
            </div>
            <div className={cn(
              "p-4 rounded-2xl leading-relaxed text-sm shadow-sm",
              msg.role === 'user' ? "bg-brand-orange text-white rounded-tr-sm" : "bg-dark-surface/80 border border-white/5 text-white/90 rounded-tl-sm"
            )}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {tutorLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[85%] self-start">
            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm border bg-dark border-white/10 text-white">🧑‍🏫</div>
            <div className="p-4 rounded-2xl bg-dark-surface/80 border border-white/5 text-text-secondary rounded-tl-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange/80 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-brand-orange/80 animate-bounce" style={{ animationDelay: "0.2s" }}/>
              <div className="w-2 h-2 rounded-full bg-brand-orange/80 animate-bounce" style={{ animationDelay: "0.4s" }}/>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-dark/50 border-t border-white/5">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleTutorAsk(); }}
          className="flex items-center gap-2 p-2 rounded-full bg-dark border border-white/10 focus-within:border-brand-orange/50 transition-colors"
        >
          <input
            type="text"
            placeholder="Ask a question..."
            value={tutorQuery}
            onChange={(e) => setTutorQuery(e.target.value)}
            disabled={tutorLoading}
            className="flex-grow bg-transparent border-none outline-none focus:ring-0 px-4 text-white text-sm placeholder-white/30"
          />
          <button 
            type="submit" 
            disabled={tutorLoading || !tutorQuery.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderVideos = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(result.videos || []).map((v, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-3xl flex flex-col h-full group">
          <div className="w-full aspect-video bg-dark/50 rounded-2xl border border-white/5 mb-6 flex items-center justify-center group-hover:bg-brand-orange/10 transition-colors group-hover:border-brand-orange/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white/20 group-hover:text-brand-orange/60 transition-colors">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h4 className="text-xl font-medium text-white mb-2 leading-tight">{v.title}</h4>
          <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-grow">{v.description || v.reason}</p>
          {(v.youtube_url || v.url) && (
            <a href={v.youtube_url || v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 w-full rounded-xl bg-gradient-to-r from-brand-orange to-brand-coral text-white font-medium hover:shadow-[0_0_20px_rgba(217,90,64,0.3)] transition-all">
              Watch Video <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );

  const renderRelatedTopics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(result.topics || []).map((t, idx) => (
        <div key={idx} className="glass-panel p-8 rounded-3xl">
          <h4 className="text-xl font-semibold text-white mb-3 flex items-center gap-3">
            <span className="text-brand-orange opacity-70">🔗</span> {t.title}
          </h4>
          <p className="text-text-secondary leading-relaxed mb-4">{t.description}</p>
          {t.why && <div className="p-3 rounded-xl bg-dark border border-white/5 text-sm text-white/70 border-l-2 border-l-brand-orange"><strong>Why:</strong> {t.why}</div>}
        </div>
      ))}
    </div>
  );

  const renderExamples = () => (
    <div className="space-y-6">
      {(result.examples || []).map((ex, idx) => (
        <div key={idx} className="glass-panel p-8 rounded-3xl">
          <h4 className="text-xl font-semibold text-brand-orange mb-4 flex items-center gap-2">
            💡 {ex.concept}
          </h4>
          <p className="text-white/90 leading-relaxed font-serif text-lg">{ex.example}</p>
        </div>
      ))}
    </div>
  );

  const renderFormulas = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(result.formulas || result.definitions || []).map((f, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl flex flex-col font-mono">
          <strong className="text-brand-coral mb-2 text-lg">{f.name || f.term}</strong>
          <p className="text-brand-orange/80 bg-dark p-3 rounded-xl break-all">
            {f.formula || f.definition}
          </p>
        </div>
      ))}
    </div>
  );

  const renderLastMinuteSheet = () => (
    <div className="space-y-8 glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-deep-red/20 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />
      
      {result.sheet && <div className="text-lg text-white/90 font-serif leading-relaxed whitespace-pre-wrap">{result.sheet}</div>}
      {result.bullets?.map((section, idx) => (
        <div key={idx} className="bg-dark/50 border border-white/5 p-6 rounded-2xl">
          <h4 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2">{section.section}</h4>
          <ul className="space-y-3">
            {(section.bullets || []).map((b, i) => (
              <li key={i} className="flex gap-3 text-text-secondary">
                <span className="text-brand-orange mt-1.5 text-xs">▹</span>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  const renderRevisionTime = () => (
    <div className="glass-panel p-10 rounded-3xl max-w-2xl mx-auto text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-brand-orange/10 to-transparent opacity-50 pointer-events-none" />
      <div className="w-20 h-20 mx-auto rounded-full bg-dark border border-white/10 flex items-center justify-center text-3xl mb-6 relative z-10 shadow-lg shadow-brand-orange/5 text-brand-orange">
        ⏱️
      </div>
      <h3 className="text-2xl font-display font-semibold text-white mb-2 relative z-10">Estimated Revision Time</h3>
      <p className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-brand-coral mb-8 relative z-10">
        {result.estimated_time || 'Unknown'}
      </p>
      
      {result.breakdown && (
        <div className="space-y-3 max-w-md mx-auto relative z-10 text-left">
          {result.breakdown.map((b, i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-dark/50 border border-white/5">
              <span className="text-white/80">{b.activity}</span>
              <strong className="text-brand-orange font-mono">{b.time}</strong>
            </div>
          ))}
        </div>
      )}
      {result.tip && (
        <p className="mt-8 text-sm text-text-secondary italic inline-flex items-center gap-2 justify-center relative z-10 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          💡 <span className="opacity-90">{result.tip}</span>
        </p>
      )}
    </div>
  );

  const renderDiagram = () => (
    <div className="glass-panel p-8 rounded-3xl overflow-hidden bg-white">
      {/* We use a white background for mermaid diagram readability unless we have a dark mode mermaid theme. In modern setups we can use a white panel with dark text */}
      <div className="text-dark max-w-full overflow-x-auto">
        {result.code ? <MermaidDiagram code={result.code} /> : <p className="text-dark/50">No diagram generated.</p>}
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;
    switch (featureId) {
      case 'ultra-summary':
      case 'detailed-summary':
      case 'last-minute':
        return result.sheet || result.summary ? renderBulletSummary() : renderLastMinuteSheet();
      case 'cheat-sheet': return renderBulletSummary();
      case 'key-concepts': return renderConcepts();
      case 'definitions':
      case 'formulas': return result.formulas ? renderFormulas() : renderDefinitions();
      case 'concept-tree':
      case 'concept-map':
      case 'diagram': return renderDiagram();
      case 'mini-quiz':
      case 'three-level-quiz': return renderQuiz();
      case 'revision-time': return renderRevisionTime();
      case 'ai-tutor': return renderAiTutor();
      case 'flashcards': return renderFlashcards();
      case 'youtube': return renderVideos();
      case 'related-topics': return renderRelatedTopics();
      case 'examples': return renderExamples();
      case 'expected-questions':
      case 'high-prob-questions': return renderQuestions();
      case 'weak-topics': return renderQuiz();
      default: return <pre className="p-4 rounded-2xl bg-dark font-mono text-xs text-brand-orange overflow-x-auto border border-white/5">{JSON.stringify(result, null, 2)}</pre>;
    }
  };

  if (!mode || !feature) {
    return (
      <div className="max-w-7xl mx-auto px-4 text-center pt-20">
        <p className="text-xl text-white mb-6">Mode or feature not found.</p>
        <button className="px-6 py-3 rounded-full bg-brand-orange text-white hover:bg-brand-coral" onClick={() => navigate('/study-mode')}>Back to Study Mode</button>
      </div>
    );
  }

  const isTutor = featureId === 'ai-tutor';

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-12">
        <button className="text-text-secondary hover:text-white transition-colors flex items-center gap-2 group" onClick={() => navigate('/study-mode')}>
           <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Modes
        </button>
        <span className="text-white/20">/</span>
        <button className="text-text-secondary hover:text-white transition-colors" onClick={() => navigate(`/study-mode/${modeId}`)}>{mode.title}</button>
        <span className="text-white/20">/</span>
        <span className="text-brand-orange">{feature.title}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-white/10">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${mode.gradient}`}>
            <span className="text-2xl">{feature.icon}</span>
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-white mb-2">{feature.title}</h1>
            <p className="text-text-secondary max-w-xl">{feature.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isTutor && (
            <button 
              className={cn(
                "px-6 py-3 rounded-full font-medium transition-all shadow-lg flex items-center gap-2",
                result ? "bg-white text-dark hover:bg-brand-beige" : "bg-brand-orange text-white hover:bg-brand-coral shadow-brand-orange/20 hover:shadow-[0_0_20px_rgba(217,90,64,0.4)]"
              )}
              onClick={handleGenerate} 
              disabled={loading}
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Analyzing...' : result ? 'Regenerate' : 'Generate Now'}
            </button>
          )}
          {result && !isTutor && (
            <>
              <button className="w-12 h-12 rounded-full flex items-center justify-center glass-panel border border-white/5 text-text-secondary hover:text-white hover:bg-white/5 transition-colors" title="Copy Text" onClick={() => copyToClipboard(exportableText)}><Copy className="w-4 h-4" /></button>
              <button className="w-12 h-12 rounded-full flex items-center justify-center glass-panel border border-white/5 text-text-secondary hover:text-white hover:bg-white/5 transition-colors" title="Download Text" onClick={() => downloadText(exportableText, `${featureId}.txt`)}><Download className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-panel p-12 rounded-3xl">
            <LoadingState title={`Generating ${feature.title}`} subtitle="The engine is synthesizing your intelligence modules..." />
          </motion.div>
        )}

        {isTutor && !loading && (
          <motion.div key="tutor" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{renderAiTutor()}</motion.div>
        )}

        {!isTutor && result && !loading && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {renderResult()}
          </motion.div>
        )}

        {!isTutor && !result && !loading && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 rounded-full bg-dark border border-white/5 flex items-center justify-center text-4xl mb-6 shadow-xl opacity-50">
              {feature.icon}
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Ready to compile</h3>
            <p className="text-text-secondary max-w-sm mb-8">Click generate to let the AI process your document and create the {feature.title.toLowerCase()} module.</p>
            <button className="px-8 py-4 rounded-full bg-brand-orange text-white font-medium hover:bg-brand-coral hover:shadow-[0_0_30px_rgba(217,90,64,0.3)] transition-all flex items-center gap-2" onClick={handleGenerate}>
              <Sparkles className="w-5 h-5" /> Start Generation Process
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ModeFeature;
