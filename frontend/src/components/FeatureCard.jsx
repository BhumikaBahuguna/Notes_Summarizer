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
import './FeatureCard.css';

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
      case 'cheat-sheet':
        return Array.isArray(payload.bullets) && payload.bullets.length > 0;
      case 'questions':
        return Array.isArray(payload.questions) && payload.questions.length > 0;
      case 'quiz':
        return Array.isArray(payload.quiz) && payload.quiz.length > 0;
      case 'youtube':
        return Array.isArray(payload.videos) && payload.videos.length > 0;
      case 'diagram':
        return typeof payload.code === 'string' && payload.code.trim().length > 0;
      default:
        return false;
    }
  };

  const isGenerated = hasRenderableResult(feature.id, result);

  const getExportText = () => {
    if (!result) return '';

    switch (feature.id) {
      case 'cheat-sheet':
        return (result.bullets || [])
          .map((section) => {
            const lines = [section.section || 'Section'];
            (section.bullets || []).forEach((point) => lines.push(`- ${point}`));
            return lines.join('\n');
          })
          .join('\n\n');
      case 'questions':
        return (result.questions || [])
          .map((q, idx) => `Q${idx + 1}: ${q.question}\nA: ${q.answer}`)
          .join('\n\n');
      case 'quiz':
        return (result.quiz || [])
          .map((q, idx) => {
            const options = (q.options || []).join('\n');
            return `Q${idx + 1}: ${q.question}\n${options}\nCorrect: ${q.correct_answer}\nExplanation: ${q.explanation || ''}`;
          })
          .join('\n\n');
      case 'youtube':
        return (result.videos || [])
          .map((v, idx) => `${idx + 1}. ${v.title}\n${v.description || ''}\n${v.youtube_url || v.url || ''}`)
          .join('\n\n');
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
        case 'cheat-sheet':
          data = await generateCheatSheet(extractedText);
          break;
        case 'questions':
          data = await generateQuestions(extractedText);
          break;
        case 'quiz':
          data = await generateQuiz(extractedText, quizDifficulty);
          break;
        case 'youtube':
          data = await getYouTubeSuggestions(extractedText);
          break;
        case 'diagram':
          data = await generateDiagram(extractedText);
          break;
        default:
          break;
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

  const renderSkeleton = () => {
    const count = feature.id === 'quiz' ? 5 : 3;
    return (
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: count }).map((_, idx) => (
          <div className="skeleton-item" key={`s-${idx}`}>
            <div className="skeleton-line w-70" />
            <div className="skeleton-line w-90" />
            <div className="skeleton-line w-50" />
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (!result) return null;

    switch (feature.id) {
      case 'cheat-sheet':
        return (
          <div className="cheat-sheet-content">
            {Array.isArray(result.bullets) && result.bullets.length > 0 ? (
              result.bullets.map((sectionData, idx) => (
                <div key={idx} className="sheet-section">
                  <h3>{sectionData.section || `Section ${idx + 1}`}</h3>
                  <ul>
                    {Array.isArray(sectionData.bullets)
                      ? sectionData.bullets.map((item, i) => <li key={i}>{item}</li>)
                      : <li>No points available.</li>}
                  </ul>
                </div>
              ))
            ) : (
              <p>No cheat sheet content was generated. Please try again.</p>
            )}
          </div>
        );

      case 'questions':
        return (
          <div className="questions-content">
            <div className="questions-section-header">
              <h3 className="expected-heading">⭐ Highly Expected Questions</h3>
              <p className="questions-subtext">
                Based on your document content, these are the most likely exam questions.
              </p>
            </div>
            {result.questions && result.questions.length > 0 ? (
              result.questions.map((q, idx) => (
                <div key={idx} className="question-item">
                  <div className="question-text">
                    <strong>Q{idx + 1}:</strong> {q.question}
                  </div>
                  <div className="answer-text">
                    <strong>A:</strong> {q.answer}
                  </div>
                </div>
              ))
            ) : (
              <p>{result.questions}</p>
            )}
          </div>
        );

      case 'quiz': {
        const totalQ = Array.isArray(result.quiz) ? result.quiz.length : 0;
        const answeredCount = Object.keys(selectedAnswers).length;
        const allAnswered = totalQ > 0 && answeredCount === totalQ;
        const correctCount = allAnswered
          ? result.quiz.filter((q, i) => selectedAnswers[i] === getAnswerToken(q.correct_answer)).length
          : 0;
        const scorePercent = allAnswered ? Math.round((correctCount / totalQ) * 100) : 0;
        const getScoreData = (pct) => {
          if (pct >= 80) return { emoji: '🏆', title: 'Outstanding!', msg: "You've mastered this topic. Brilliant work — keep it up!", cls: 'score-excellent' };
          if (pct >= 60) return { emoji: '👍', title: 'Well Done!', msg: 'Great effort! Review the missed questions to strengthen your understanding.', cls: 'score-good' };
          if (pct >= 40) return { emoji: '📚', title: 'Keep Studying!', msg: "You're on the right path. A bit more revision and you'll ace it!", cls: 'score-average' };
          return { emoji: '💪', title: "Don't Give Up!", msg: "Every expert was once a beginner. Revisit your notes and try again — you've got this!", cls: 'score-low' };
        };
        const scoreData = allAnswered ? getScoreData(scorePercent) : null;
        return (
          <div className="quiz-content">
            {result.quiz && result.quiz.length > 0 ? (
              <>
                {result.quiz.map((mcq, idx) => {
                  const answered = selectedAnswers[idx] !== undefined;
                  const userToken = selectedAnswers[idx];
                  const correctToken = getAnswerToken(mcq.correct_answer);
                  const isCorrect = answered && userToken === correctToken;
                  return (
                    <div
                      key={idx}
                      className={`mcq-item ${
                        answered ? (isCorrect ? 'mcq-answered-correct' : 'mcq-answered-wrong') : ''
                      }`}
                    >
                      <div className="mcq-question">
                        <span className="mcq-num">Q{idx + 1}</span>
                        {mcq.question}
                      </div>
                      <div className="mcq-options">
                        {mcq.options.map((option, i) => {
                          const optToken = getAnswerToken(option);
                          const isThisCorrect = optToken === correctToken;
                          const isThisSelected = userToken === optToken;
                          let labelCls = 'option-label';
                          if (answered) {
                            if (isThisCorrect) labelCls += ' correct-answer';
                            else if (isThisSelected) labelCls += ' wrong-selected';
                          }
                          return (
                            <label key={i} className={labelCls}>
                              <input
                                type="radio"
                                name={`q${idx}`}
                                checked={isThisSelected}
                                disabled={answered}
                                onChange={() => {
                                  if (!answered) {
                                    setSelectedAnswers((prev) => ({ ...prev, [idx]: optToken }));
                                  }
                                }}
                              />
                              <span>{option}</span>
                              {answered && isThisCorrect && (
                                <span className="opt-badge opt-correct">✓</span>
                              )}
                              {answered && isThisSelected && !isThisCorrect && (
                                <span className="opt-badge opt-wrong">✗</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className={`quiz-feedback-block ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
                          <span className="feedback-icon">{isCorrect ? '✅' : '❌'}</span>
                          <div className="feedback-text">
                            <strong>
                              {isCorrect
                                ? 'Correct!'
                                : `Incorrect — Correct answer: ${mcq.correct_answer}`}
                            </strong>
                            {mcq.explanation && (
                              <p className="explanation-text">{mcq.explanation}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {allAnswered && scoreData && (
                  <div className={`quiz-score-card ${scoreData.cls}`}>
                    <div className="score-trophy">{scoreData.emoji}</div>
                    <div className="score-info">
                      <h3 className="score-title">{scoreData.title}</h3>
                      <div className="score-fraction">
                        <span className="score-num">{correctCount}</span>
                        <span className="score-sep"> / </span>
                        <span className="score-total">{totalQ}</span>
                        <span className="score-pct"> ({scorePercent}%)</span>
                      </div>
                      <p className="score-message">{scoreData.msg}</p>
                    </div>
                    <button
                      className="btn btn-outline btn-small score-retake"
                      onClick={() => setSelectedAnswers({})}
                    >
                      🔄 Retake Quiz
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p>{result.quiz}</p>
            )}
          </div>
        );
      }

      case 'youtube':
        return (
          <div className="youtube-content">
            <div className="videos-section-header">
              <h3 className="videos-heading">Recommended Videos</h3>
              <p className="videos-subtext">Curated YouTube resources to reinforce your learning on this topic.</p>
            </div>
            {result.videos && result.videos.length > 0 ? (
              result.videos.map((video, idx) => (
                <div key={idx} className="video-card">
                  <div className="video-thumb-area">
                    <div className="yt-play-circle">
                      <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="video-index">#{idx + 1}</span>
                  </div>
                  <div className="video-details">
                    <h4 className="video-title">{video.title}</h4>
                    <p className="video-desc">{video.description || video.reason}</p>
                    <div className="video-footer">
                      <span className="yt-platform-badge">
                        <svg viewBox="0 0 24 24" fill="#ff0000" width="14" height="14">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        YouTube
                      </span>
                      {(video.youtube_url || video.url) && (
                        <a
                          href={video.youtube_url || video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-small video-watch-btn"
                        >
                          ▶ Watch Now
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>{result.youtube_suggestions}</p>
            )}
          </div>
        );

      case 'diagram':
        return (
          <div className="diagram-content">
            {result.code ? (
              <MermaidDiagram code={result.code} />
            ) : (
              <p>No diagram code returned. Please try regenerate.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="feature-card-container">
      <div className="feature-header">
        <h2>{feature.title}</h2>
        <div className="feature-controls">
          {feature.id === 'quiz' && (
            <select
              value={quizDifficulty}
              onChange={(e) => setQuizDifficulty(e.target.value)}
              disabled={loading}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="full_prepared">Advanced</option>
            </select>
          )}
          <button
            onClick={handleGenerateFeature}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading"></span>
                Generating...
              </>
            ) : isGenerated ? (
              'Regenerate'
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>

      {feature.id === 'quiz' && (
        <div className="quiz-level-notice">
          <span className="notice-icon">💡</span>
          <p>
            <strong>Preparation Tip:</strong> Choose your difficulty based on how well you know this topic.{' '}
            <em>Beginner</em> — just starting &bull; <em>Intermediate</em> — know the basics &bull; <em>Advanced</em> — fully prepared.
          </p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="feature-loading-wrap">
          <LoadingState
            title={`Generating ${feature.title}`}
            subtitle="Using AI to create your study material..."
          />
          {renderSkeleton()}
        </div>
      )}

      {result && (
        <>
          <div className="result-actions">
            <button className="btn btn-outline btn-small" onClick={copyResult}>Copy</button>
            <button className="btn btn-secondary btn-small" onClick={exportResult}>Export</button>
          </div>
          <div className="feature-result">{renderContent()}</div>
        </>
      )}

      {!result && !loading && (
        <div className="feature-empty">
          <p>Click "Generate" to create {feature.title.toLowerCase()}</p>
        </div>
      )}
    </div>
  );
}

export default FeatureCard;
