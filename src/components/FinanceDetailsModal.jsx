import React from 'react';
import styles from './FinanceDetailsModal.module.css';

const FinanceDetailsModal = ({ finance, onClose, onEdit, onDelete, formatDateTime, isAdmin = false }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Finance Details</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.financeDetails}>
            <div className={styles.financeDetailItem}>
              <span className={styles.financeCurrency}>{finance.currency === 'USD' ? '$' : '৳'}</span>
              <span className={styles.financeAmount}>{parseFloat(finance.amount || 0).toFixed(2)}</span>
              <span className={`${styles.financeType} ${styles[finance.type]}`}>
                {finance.type === 'income' ? 'Income' : 'Expense'}
              </span>
            </div>

            <div className={styles.financeDetailItemSmall}>
              <span className="material-icons">description</span>
              <span className={styles.financeDescription}>{finance.description}</span>
            </div>

            <div className={styles.financeDetailItemSmall}>
              <span className="material-icons">event</span>
              <span className={styles.financeDate}>{formatDateTime(finance.created_at)}</span>
            </div>

            {finance.category && (
              <div className={styles.financeDetailItemSmall}>
                <span className="material-icons">category</span>
                <span className={styles.financeCategory}>{finance.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
            )}

            {finance.account && (
              <div className={styles.financeDetailItemSmall}>
                <span className="material-icons">account_balance</span>
                <span className={styles.financeAccount}>
                  Account: {finance.account}
                </span>
              </div>
            )}

            {finance.receipt && (
              <div className={styles.financeDetailItem}>
                <img src={finance.receipt} alt="Receipt" className={styles.receiptImage} />
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnEdit} onClick={() => onEdit(finance)}>
            <span className="material-icons">edit</span>
            Edit
          </button>
          {isAdmin && (
            <button className={styles.btnDanger} onClick={onDelete}>
              <span className="material-icons">delete</span>
              Delete
            </button>
          )}
          <button className={styles.btnOutline} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceDetailsModal;

