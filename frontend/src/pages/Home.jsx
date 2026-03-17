import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const features = [
    {
      icon: '📄',
      title: 'Smart Summarization',
      description: 'Extract and summarize key points from your documents using advanced AI',
    },
    {
      icon: '📋',
      title: 'Cheat Sheets',
      description: 'Generate quick reference guides organized by topic',
    },
    {
      icon: '❓',
      title: 'Auto Q&A',
      description: 'Create exam-style questions from your study materials',
    },
    {
      icon: '🎯',
      title: 'MCQ Quizzes',
      description: 'Test your knowledge with multiple choice questions at different difficulty levels',
    },
    {
      icon: '📺',
      title: 'Video Suggestions',
      description: 'Find relevant YouTube videos to supplement your learning',
    },
    {
      icon: '🎨',
      title: 'Visual Diagrams',
      description: 'Generate mind maps and flowcharts to visualize concepts',
    },
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Master Your Studies Faster</h1>
          <p className="hero-subtitle">
            Transform your notes into comprehensive study materials with AI-powered summaries,
            quizzes, and visual diagrams
          </p>
          <Link to="/workspace" className="btn btn-primary btn-large">
            Start Summarizing →
          </Link>
        </div>
        <div className="hero-image">
          <div className="hero-illustration">📚✨</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-header">
          <h2>Powerful Features</h2>
          <p>Everything you need to study smarter, not harder</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Upload Your Document</h3>
            <p>Upload a PDF, image, or screenshot of your notes</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>AI Extracts Text</h3>
            <p>Our OCR technology extracts and cleans the text</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Generate Study Materials</h3>
            <p>Create summaries, quizzes, diagrams, and more</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Study & Excel</h3>
            <p>Use the generated materials to master the content</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Transform Your Learning?</h2>
        <p>Start your journey to academic excellence today</p>
        <Link to="/workspace" className="btn btn-primary btn-large">
          Get Started Now
        </Link>
      </section>
    </div>
  );
}

export default Home;
