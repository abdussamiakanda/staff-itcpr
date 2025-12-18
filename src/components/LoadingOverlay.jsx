import React from 'react';
import styles from './LoadingOverlay.module.css';

const LoadingOverlay = () => {
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loader}></div>
    </div>
  );
};

export default LoadingOverlay;


