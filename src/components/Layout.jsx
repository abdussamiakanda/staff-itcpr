import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleMainContentClick = (e) => {
    // Don't close if clicking on the hamburger button
    if (e.target.closest(`.${styles.mobileMenuButton}`)) {
      return;
    }
    if (window.innerWidth <= 768 && sidebarOpen) {
      closeSidebar();
    }
  };

  return (
    <section>
      {/* Mobile Menu Button */}
      <button 
        className={styles.mobileMenuButton}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
        aria-expanded={sidebarOpen}
        type="button"
      >
        <span className="material-icons">
          {sidebarOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className={styles.overlay}
          onClick={(e) => {
            e.stopPropagation();
            closeSidebar();
          }}
        />
      )}

      <div className="main-wrapper">
        <Sidebar 
          currentPath={location.pathname} 
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />
        <main 
          className="main-content" 
          onClick={handleMainContentClick}
          onTouchStart={handleMainContentClick}
        >
          {children}
        </main>
      </div>
    </section>
  );
};

export default Layout;


