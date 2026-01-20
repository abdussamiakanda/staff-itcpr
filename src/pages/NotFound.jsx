import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

const NotFound = () => {
  return (
    <div className="container">
      <section className={styles.notFound}>
        <div className={styles.card}>
          <div className={styles.icon}>
            <span className="material-icons">search_off</span>
          </div>
          <h2>Page not found</h2>
          <p>The page you’re looking for doesn’t exist (or moved).</p>
          <div className={styles.actions}>
            <Link className={styles.btnPrimary} to="/staff">
              Go to Directory
            </Link>
            <Link className={styles.btnOutline} to="/users">
              Go to Users
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NotFound;

