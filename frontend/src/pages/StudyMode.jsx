import { useNavigate } from 'react-router-dom';
import './StudyMode.css';

const modes = [
  {
    id: 'quick-revision',
    title: 'Quick Revision',
    icon: '⚡',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    time: '5–10 min',
    tagline: 'Revise fast before your exam',
    description:
      'Get a rapid overview of your notes with ultra-brief summaries, key terms, a mini concept tree, and a 3-question quiz. Perfect when you\u2019re short on time.',
    features: [
      { id: 'ultra-summary', title: 'Ultra Brief Summary', icon: '📄', desc: '5–7 bullet point summary of key ideas' },
      { id: 'cheat-sheet', title: 'Cheat Sheet', icon: '📝', desc: 'Compact revision notes & definitions' },
      { id: 'key-concepts', title: 'Key Concepts', icon: '🔑', desc: 'Most important terms & keywords' },
      { id: 'concept-tree', title: 'Concept Tree', icon: '🌳', desc: 'Hierarchical topic map' },
      { id: 'mini-quiz', title: 'Mini Quiz', icon: '⚡', desc: '3 quick MCQ questions with instant feedback' },
      { id: 'revision-time', title: 'Revision Time Estimate', icon: '⏱️', desc: 'How long this revision will take' },
      { id: 'definitions', title: 'Important Definitions', icon: '📖', desc: 'Key definitions extracted from notes' },
    ],
  },
  {
    id: 'deep-study',
    title: 'Deep Study',
    icon: '📚',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)',
    time: '30–60 min',
    tagline: 'Truly understand every concept',
    description:
      'Dive deep with detailed structured summaries, an AI tutor that explains & simplifies, auto-generated flashcards, concept maps, diagrams, and example generators.',
    features: [
      { id: 'detailed-summary', title: 'Detailed Summary', icon: '📋', desc: 'Well-organized explanation with examples' },
      { id: 'ai-tutor', title: 'AI Tutor', icon: '🧑‍🏫', desc: 'Ask for explanations, simplifications & examples' },
      { id: 'flashcards', title: 'Flashcard Generator', icon: '🃏', desc: 'Auto-created question/answer flashcards' },
      { id: 'concept-map', title: 'Concept Map', icon: '🗺️', desc: 'Visual network of concept relationships' },
      { id: 'diagram', title: 'Diagram Generator', icon: '🎨', desc: 'Flowcharts & structure diagrams' },
      { id: 'youtube', title: 'Video Recommendations', icon: '📺', desc: 'Curated YouTube videos for deeper learning' },
      { id: 'related-topics', title: 'Related Topics', icon: '🔗', desc: 'Connected topics to expand your knowledge' },
      { id: 'examples', title: 'Example Generator', icon: '💡', desc: 'Practical examples for tough concepts' },
    ],
  },
  {
    id: 'exam-prep',
    title: 'Exam Preparation',
    icon: '🎯',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #f87171, #dc2626)',
    time: '45–90 min',
    tagline: 'Ace your exam with confidence',
    description:
      'Full exam-mode practice with expected questions, a three-level quiz system (Beginner → Intermediate → Advanced), weak-topic detection, and a last-minute revision sheet.',
    features: [
      { id: 'expected-questions', title: 'Expected Questions', icon: '❓', desc: 'Likely exam questions with answers' },
      { id: 'high-prob-questions', title: 'High Probability Qs', icon: '🔥', desc: 'AI-marked most important questions' },
      { id: 'three-level-quiz', title: '3-Level Quiz', icon: '🎯', desc: 'Beginner → Intermediate → Advanced MCQs' },
      { id: 'weak-topics', title: 'Weak Topic Detection', icon: '📊', desc: 'Find concepts you answered wrong' },
      { id: 'last-minute', title: 'Last Minute Sheet', icon: '🏃', desc: 'Compressed exam revision summary' },
      { id: 'formulas', title: 'Formulas & Definitions', icon: '📐', desc: 'Key exam formulas & definitions list' },
    ],
  },
];

function StudyMode({ uploadedData, onNotify }) {
  const navigate = useNavigate();
  const hasNotes = !!uploadedData?.extracted_text;

  const handleModeClick = (modeId) => {
    navigate(`/study-mode/${modeId}`);
  };

  return (
    <div className="study-mode-page">
      <div className="study-mode-container">
        <div className="study-mode-hero">
          <h1>🧑‍🏫 Advanced Study Mode</h1>
          <p className="study-mode-subtitle">
            Choose a study mode based on your current needs — whether you have 5 minutes for a quick
            revision or an hour for deep preparation. Each mode unlocks a set of AI-powered features
            tailored to that goal.
          </p>
          {!hasNotes && (
            <div className="study-mode-warning">
              <span>⚠️</span>
              <p>
                You haven't uploaded a document yet.{' '}
                <button className="link-btn" onClick={() => navigate('/workspace')}>
                  Go to Workspace
                </button>{' '}
                to upload your notes first.
              </p>
            </div>
          )}
        </div>

        <div className="modes-grid">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className="mode-card"
              onClick={() => handleModeClick(mode.id)}
            >
              <div className="mode-card-visual" style={{ background: mode.gradient }}>
                <span className="mode-card-icon">{mode.icon}</span>
                <span className="mode-card-time">{mode.time}</span>
              </div>
              <div className="mode-card-body">
                <h2 className="mode-card-title">{mode.title}</h2>
                <p className="mode-card-tagline">{mode.tagline}</p>
                <p className="mode-card-desc">{mode.description}</p>
              </div>
              <div className="mode-card-footer">
                <span className="mode-feature-count">{mode.features.length} features</span>
                <span className="mode-expand-hint">Open Mode →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { modes };
export default StudyMode;
