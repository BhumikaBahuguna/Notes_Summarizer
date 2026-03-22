import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Home, Layout, GraduationCap } from 'lucide-react';

function Navbar() {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Workspace', path: '/workspace', icon: Layout },
    { name: 'Study Mode', path: '/study-mode', icon: GraduationCap },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-coral shadow-lg transition-transform group-hover:scale-105">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-semibold text-xl tracking-tight text-white group-hover:text-brand-beige transition-colors">
              Notes Summarizer
            </span>
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center gap-1 bg-dark-surface/50 p-1 rounded-full border border-white/5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
              const Icon = link.icon;
              
              return (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                      isActive 
                        ? 'text-white' 
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-white/10 rounded-full"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
