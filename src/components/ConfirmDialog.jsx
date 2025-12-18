import React from 'react';
import styles from './ConfirmDialog.module.css';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title || 'Confirm Action'}</h3>
        </div>
        <div className={styles.body}>
          <p>{message || 'Are you sure you want to proceed?'}</p>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnConfirm} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

