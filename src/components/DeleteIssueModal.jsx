import React from 'react';
import styles from './DeleteIssueModal.module.css';

const DeleteIssueModal = ({ onClose, onConfirm }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Delete Issue</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete this issue? This action cannot be undone.</p>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnDanger} onClick={onConfirm}>
            <span className="material-icons">delete</span>
            Delete
          </button>
          <button className={styles.btnOutline} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteIssueModal;

