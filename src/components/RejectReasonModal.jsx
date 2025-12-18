import React, { useState } from 'react';
import styles from './RejectReasonModal.module.css';

const RejectReasonModal = ({ onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <div className={styles.modalReject} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Reject Application</h3>
          <textarea
            id="rejectReasonInput"
            placeholder="Please enter the reason for rejection"
            rows="5"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.buttonGroup}>
            <button className={styles.appBtnPrimary} onClick={onClose}>
              Close
            </button>
            <button className={styles.appBtnDanger} onClick={handleSubmit}>
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectReasonModal;

