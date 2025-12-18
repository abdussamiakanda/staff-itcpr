import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import styles from './Login.module.css';

const Login = () => {
  const { signInWithSSO } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithSSO();
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.loginSection}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <div className={styles.navBrand}>
            <span className="material-icons">percent</span>
            <div>
              <h1>ITCPR Staff Directory</h1>
            </div>
          </div>
          <p className={styles.loginSubtitle}>Sign in to access the staff directory</p>
        </div>
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        <button
          className={styles.btnApply}
          onClick={handleLogin}
          disabled={loading}
        >
          <i className="fa-solid fa-key"></i>
          {loading ? 'Signing in...' : 'Sign in with SSO'}
        </button>
        <small className={styles.privacyNotice}>
          By signing in, you agree to our{' '}
          <a href="https://itcpr.org/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>.
        </small>
      </div>
    </section>
  );
};

export default Login;


