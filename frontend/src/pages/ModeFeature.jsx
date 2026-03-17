import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { modes } from './StudyMode';
import MermaidDiagram from '../components/MermaidDiagram';
import LoadingState from '../components/LoadingState';
import {
  generateStudyFeature,
  generateAiTutorResponse,
} from '../services/api';
import './ModeFeature.css';

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
    <div className="mf-result-section">
      {result.summary && <p className="mf-summary-text">{result.summary}</p>}
      {result.bullets?.map((section, idx) => (
        <div key={idx} className="mf-bullet-section">
          <h4>{section.section}</h4>
          <ul>{(section.bullets || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      ))}
      {result.estimated_time && (
        <div className="mf-time-badge">⏱️ Estimated revision time: <strong>{result.estimated_time}</strong></div>
      )}
    </div>
  );

  const renderConcepts = () => (
    <div className="mf-concepts-grid">
      {(result.concepts || []).map((c, idx) => (
        <div key={idx} className="mf-concept-card">
          <span className="concept-term">{c.term}</span>
          <span className="concept-def">{c.definition}</span>
        </div>
      ))}
    </div>
  );

  const renderDefinitions = () => (
    <div className="mf-definitions-list">
      {(result.definitions || []).map((d, idx) => (
        <div key={idx} className="mf-definition-item">
          <strong>{d.term}</strong>
          <p>{d.definition}</p>
        </div>
      ))}
    </div>
  );

  const renderQuestions = () => (
    <div className="mf-questions-list">
      {(result.questions || []).map((q, idx) => (
        <div key={idx} className="mf-question-card">
          <div className="mf-q-text"><strong>Q{idx + 1}:</strong> {q.question}</div>
          <div className="mf-a-text"><strong>A:</strong> {q.answer}</div>
          {q.importance && <span className="mf-importance-badge">🔥 {q.importance}</span>}
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

    const getScoreData = (pct) => {
      if (pct >= 80) return { emoji: '🏆', title: 'Outstanding!', msg: "You nailed it!", cls: 'score-excellent' };
      if (pct >= 60) return { emoji: '👍', title: 'Well Done!', msg: 'Review missed questions to improve.', cls: 'score-good' };
      if (pct >= 40) return { emoji: '📚', title: 'Keep Studying!', msg: 'A bit more revision will do wonders.', cls: 'score-average' };
      return { emoji: '💪', title: "Don't Give Up!", msg: "Revisit notes and try again — you've got this!", cls: 'score-low' };
    };

    // Detect weak topics
    const weakTopics = allAnswered
      ? quizItems
          .map((q, i) => (selectedAnswers[i] !== getAnswerToken(q.correct_answer) ? q.topic || q.question : null))
          .filter(Boolean)
      : [];

    const scoreData = allAnswered ? getScoreData(scorePercent) : null;

    return (
      <div className="mf-quiz-section">
        {/* Level tabs for three-level-quiz */}
        {result.levels && (
          <div className="quiz-level-tabs">
            {result.levels.map((lvl) => (
              <button
                key={lvl.level}
                className={`quiz-lvl-tab ${result._activeLevel === lvl.level ? 'active' : ''}`}
                onClick={() => {
                  setResult((prev) => ({ ...prev, quiz: lvl.questions, _activeLevel: lvl.level }));
                  setSelectedAnswers({});
                }}
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
            <div key={idx} className={`mf-mcq-item ${answered ? (isCorrect ? 'mcq-right' : 'mcq-wrong') : ''}`}>
              <div className="mf-mcq-question"><span className="mcq-num">Q{idx + 1}</span> {mcq.question}</div>
              <div className="mf-mcq-options">
                {(mcq.options || []).map((option, i) => {
                  const optT = getAnswerToken(option);
                  const isThisCorrect = optT === correctToken;
                  const isThisPicked = userToken === optT;
                  let cls = 'mf-opt';
                  if (answered) {
                    if (isThisCorrect) cls += ' opt-correct';
                    else if (isThisPicked) cls += ' opt-wrong';
                  }
                  return (
                    <label key={i} className={cls}>
                      <input
                        type="radio"
                        name={`mf-q${idx}`}
                        checked={isThisPicked}
                        disabled={answered}
                        onChange={() => {
                          if (!answered) setSelectedAnswers((p) => ({ ...p, [idx]: optT }));
                        }}
                      />
                      <span>{option}</span>
                      {answered && isThisCorrect && <span className="opt-badge opt-correct-b">✓</span>}
                      {answered && isThisPicked && !isThisCorrect && <span className="opt-badge opt-wrong-b">✗</span>}
                    </label>
                  );
                })}
              </div>
              {answered && (
                <div className={`mf-feedback ${isCorrect ? 'fb-correct' : 'fb-wrong'}`}>
                  <span>{isCorrect ? '✅' : '❌'}</span>
                  <div>
                    <strong>{isCorrect ? 'Correct!' : `Incorrect — Answer: ${mcq.correct_answer}`}</strong>
                    {mcq.explanation && <p>{mcq.explanation}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {allAnswered && scoreData && (
          <>
            <div className={`mf-score-card ${scoreData.cls}`}>
              <div className="score-trophy">{scoreData.emoji}</div>
              <div className="score-info">
                <h3>{scoreData.title}</h3>
                <div className="score-fraction">
                  <span className="score-num">{correctCount}</span> / <span>{totalQ}</span>
                  <span className="score-pct"> ({scorePercent}%)</span>
                </div>
                <p>{scoreData.msg}</p>
              </div>
              <button className="btn btn-outline btn-small" onClick={() => setSelectedAnswers({})}>🔄 Retake</button>
            </div>
            {weakTopics.length > 0 && (
              <div className="mf-weak-topics">
                <h4>📊 Topics to Revisit</h4>
                <ul>{weakTopics.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderFlashcards = () => (
    <div className="mf-flashcards-grid">
      {(result.flashcards || []).map((card, idx) => (
        <div
          key={idx}
          className={`mf-flashcard ${flippedCards[idx] ? 'flipped' : ''}`}
          onClick={() => setFlippedCards((p) => ({ ...p, [idx]: !p[idx] }))}
        >
          <div className="fc-inner">
            <div className="fc-front">
              <span className="fc-label">Question</span>
              <p>{card.front}</p>
            </div>
            <div className="fc-back">
              <span className="fc-label">Answer</span>
              <p>{card.back}</p>
            </div>
          </div>
          <span className="fc-hint">Click to flip</span>
        </div>
      ))}
    </div>
  );

  const renderAiTutor = () => (
    <div className="mf-tutor">
      <div className="tutor-quickactions">
        {['Explain this topic again', 'Simplify this concept', 'Give examples'].map((q) => (
          <button
            key={q}
            className="btn btn-outline btn-small"
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
          >
            {q}
          </button>
        ))}
      </div>
      <div className="tutor-chat">
        {tutorHistory.map((msg, idx) => (
          <div key={idx} className={`tutor-msg ${msg.role}`}>
            <span className="tutor-role">{msg.role === 'user' ? '🙋' : '🧑‍🏫'}</span>
            <div className="tutor-text">{msg.text}</div>
          </div>
        ))}
        {tutorLoading && (
          <div className="tutor-msg ai">
            <span className="tutor-role">🧑‍🏫</span>
            <div className="tutor-text typing">Thinking...</div>
          </div>
        )}
      </div>
      <div className="tutor-input-row">
        <input
          type="text"
          placeholder="Ask anything about your notes..."
          value={tutorQuery}
          onChange={(e) => setTutorQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTutorAsk()}
          disabled={tutorLoading}
        />
        <button className="btn btn-primary btn-small" onClick={handleTutorAsk} disabled={tutorLoading || !tutorQuery.trim()}>
          Send
        </button>
      </div>
    </div>
  );

  const renderVideos = () => (
    <div className="mf-videos-list">
      {(result.videos || []).map((v, idx) => (
        <div key={idx} className="mf-video-card">
          <div className="mfv-thumb">
            <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M8 5v14l11-7z" /></svg>
          </div>
          <div className="mfv-info">
            <h4>{v.title}</h4>
            <p>{v.description || v.reason}</p>
            {(v.youtube_url || v.url) && (
              <a href={v.youtube_url || v.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-small">
                ▶ Watch
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderRelatedTopics = () => (
    <div className="mf-related-grid">
      {(result.topics || []).map((t, idx) => (
        <div key={idx} className="mf-related-card">
          <h4>🔗 {t.title}</h4>
          <p>{t.description}</p>
          {t.why && <span className="mf-why-tag">Why: {t.why}</span>}
        </div>
      ))}
    </div>
  );

  const renderExamples = () => (
    <div className="mf-examples-list">
      {(result.examples || []).map((ex, idx) => (
        <div key={idx} className="mf-example-card">
          <h4>💡 {ex.concept}</h4>
          <p>{ex.example}</p>
        </div>
      ))}
    </div>
  );

  const renderFormulas = () => (
    <div className="mf-formulas-list">
      {(result.formulas || result.definitions || []).map((f, idx) => (
        <div key={idx} className="mf-formula-card">
          <strong>{f.name || f.term}</strong>
          <p>{f.formula || f.definition}</p>
        </div>
      ))}
    </div>
  );

  const renderLastMinuteSheet = () => (
    <div className="mf-lastmin">
      {result.sheet && <div className="mf-sheet-text">{result.sheet}</div>}
      {result.bullets?.map((section, idx) => (
        <div key={idx} className="mf-bullet-section">
          <h4>{section.section}</h4>
          <ul>{(section.bullets || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      ))}
    </div>
  );

  const renderRevisionTime = () => (
    <div className="mf-revision-time-card">
      <div className="rt-icon">⏱️</div>
      <div className="rt-info">
        <h3>Estimated Revision Time</h3>
        <p className="rt-time">{result.estimated_time || 'Unknown'}</p>
        {result.breakdown && (
          <div className="rt-breakdown">
            {result.breakdown.map((b, i) => (
              <div key={i} className="rt-item">
                <span>{b.activity}</span>
                <strong>{b.time}</strong>
              </div>
            ))}
          </div>
        )}
        {result.tip && <p className="rt-tip">💡 {result.tip}</p>}
      </div>
    </div>
  );

  const renderDiagram = () => (
    <div className="mf-diagram">
      {result.code ? <MermaidDiagram code={result.code} /> : <p>No diagram generated.</p>}
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    // Map feature IDs to renderers
    switch (featureId) {
      case 'ultra-summary':
      case 'detailed-summary':
      case 'last-minute':
        return result.sheet || result.summary ? renderBulletSummary() : renderLastMinuteSheet();
      case 'cheat-sheet':
        return renderBulletSummary();
      case 'key-concepts':
        return renderConcepts();
      case 'definitions':
      case 'formulas':
        return result.formulas ? renderFormulas() : renderDefinitions();
      case 'concept-tree':
      case 'concept-map':
      case 'diagram':
        return renderDiagram();
      case 'mini-quiz':
      case 'three-level-quiz':
        return renderQuiz();
      case 'revision-time':
        return renderRevisionTime();
      case 'ai-tutor':
        return renderAiTutor();
      case 'flashcards':
        return renderFlashcards();
      case 'youtube':
        return renderVideos();
      case 'related-topics':
        return renderRelatedTopics();
      case 'examples':
        return renderExamples();
      case 'expected-questions':
      case 'high-prob-questions':
        return renderQuestions();
      case 'weak-topics':
        return renderQuiz();
      default:
        return <pre className="mf-raw">{JSON.stringify(result, null, 2)}</pre>;
    }
  };

  if (!mode || !feature) {
    return (
      <div className="mf-page">
        <div className="mf-container">
          <p>Mode or feature not found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/study-mode')}>Back to Study Mode</button>
        </div>
      </div>
    );
  }

  const isTutor = featureId === 'ai-tutor';

  return (
    <div className="mf-page">
      <div className="mf-container">
        <div className="mf-breadcrumb">
          <button className="link-btn" onClick={() => navigate('/study-mode')}>Study Mode</button>
          <span>/</span>
          <button className="link-btn" onClick={() => navigate(`/study-mode/${modeId}`)}>{mode.title}</button>
          <span>/</span>
          <span className="mf-current">{feature.title}</span>
        </div>

        <div className="mf-header">
          <div className="mf-header-left">
            <span className="mf-feat-icon" style={{ background: mode.gradient }}>{feature.icon}</span>
            <div>
              <h1>{feature.title}</h1>
              <p className="mf-feat-desc">{feature.desc}</p>
            </div>
          </div>
          <div className="mf-header-actions">
            {!isTutor && (
              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : result ? '🔄 Regenerate' : '✨ Generate'}
              </button>
            )}
            {result && !isTutor && (
              <>
                <button className="btn btn-outline btn-small" onClick={() => copyToClipboard(exportableText)}>📋 Copy</button>
                <button className="btn btn-secondary btn-small" onClick={() => downloadText(exportableText, `${featureId}.txt`)}>⬇ Download</button>
              </>
            )}
          </div>
        </div>

        {error && <div className="mf-error">{error}</div>}

        {loading && (
          <LoadingState title={`Generating ${feature.title}`} subtitle="AI is analyzing your notes..." />
        )}

        {isTutor && !loading && renderAiTutor()}

        {!isTutor && result && (
          <div className="mf-result-wrap">{renderResult()}</div>
        )}

        {!isTutor && !result && !loading && (
          <div className="mf-empty">
            <p>Click <strong>"Generate"</strong> to create {feature.title.toLowerCase()} from your notes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModeFeature;
