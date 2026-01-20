import React from 'react';
import styles from './DeleteFinanceModal.module.css';

const DeleteFinanceModal = ({ onClose, onConfirm, deleting = false }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Delete Finance Record</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete this finance record? This action cannot be undone.</p>
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.btnDanger} 
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className={`material-icons ${styles.spinningIcon}`}>sync</span>
                Deleting...
              </>
            ) : (
              <>
                <span className="material-icons">delete</span>
                Delete
              </>
            )}
          </button>
          <button 
            className={styles.btnOutline} 
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteFinanceModal;

