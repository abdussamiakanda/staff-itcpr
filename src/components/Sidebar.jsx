import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Sidebar.module.css';

const Sidebar = ({ currentPath, isOpen, onClose }) => {
  const { userData, signOutUser } = useAuth();
  
  // Close sidebar when route changes on mobile
  const prevPathRef = useRef(currentPath);
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevPathRef.current = currentPath;
      return;
    }
    
    // Only close if the path actually changed
    if (prevPathRef.current !== currentPath && isOpen && window.innerWidth <= 768) {
      onClose();
    }
    prevPathRef.current = currentPath;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]); // Only depend on currentPath to avoid closing when isOpen changes

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      onClose();
    }
  };
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { path: '/staff', icon: 'people', label: 'Staff Directory' },
    { path: '/applications', icon: 'description', label: 'Applications' },
    { path: '/users', icon: 'manage_accounts', label: 'Users' },
    { path: '/finance', icon: 'account_balance_wallet', label: 'Finances' },
    { path: '/issues', icon: 'bug_report', label: 'Issues' },
    { path: '/emails', icon: 'email', label: 'Send Emails' },
    { path: '/newsletter', icon: 'newspaper', label: 'Newsletter' },
    { path: '/publications', icon: 'article', label: 'Publications' },
    { path: '/responsibilities', icon: 'description', label: 'Responsibilities' },
    { path: '/technicals', icon: 'build', label: 'Technicals' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* Brand Section */}
      <div className={styles.brandSection}>
        <div className={styles.navBrand}>
          <div className={styles.logoContainer}>
            <span className="material-icons">percent</span>
          </div>
          <div className={styles.brandText}>
            <h1 className={styles.brandTitle}>ITCPR</h1>
            <span className={styles.brandSubtitle}>Staff Portal</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.sidebarNav}>
        <ul className={styles.navList}>
          {menuItems.map((item) => (
            <li key={item.path} className={styles.navItem}>
              <Link
                to={item.path}
                className={`${styles.navLink} ${currentPath === item.path ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                <span className="material-icons">{item.icon}</span>
                <span className={styles.navText}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            <img
              src={userData?.photoURL || '/assets/default-avatar.svg'}
              alt={userData?.name || 'User'}
              className={styles.navAvatar}
            />
            <div className={styles.statusIndicator}></div>
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{userData?.name || 'Loading...'}</span>
            {userData?.email && (
              <span className={styles.userEmail}>{userData.email}</span>
            )}
          </div>
        </div>
        <button
          className={styles.signOutButton}
          onClick={handleSignOut}
          disabled={loading}
        >
          <span className="material-icons">logout</span>
          <span>{loading ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;


