import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">📚</span>
          Notes Summarizer
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/workspace" className="nav-link">Workspace</Link>
          </li>
          <li className="nav-item">
            <Link to="/study-mode" className="nav-link study-mode-link">🧑‍🏫 Study Mode</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
