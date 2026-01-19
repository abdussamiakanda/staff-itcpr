import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import styles from './FinanceDetailsModal.module.css';

const FinanceDetailsModal = ({ finance, onClose, onEdit, onDelete, formatDateTime, isAdmin = false }) => {
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!finance || !finance.category || !finance.user) {
        setUserName(null);
        return;
      }

      if (finance.category === 'monthly_fee' && finance.user) {
        // Check if finance.user looks like a UID (long alphanumeric string) or is a name
        // UIDs are typically 28 characters, but we'll check if it's longer than a typical name
        if (finance.user.length > 20 || !finance.user.includes(' ')) {
          // Likely a UID, fetch the name
          try {
            const userDocRef = doc(db, 'users', finance.user);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserName(userData.name || finance.user);
            } else {
              setUserName(finance.user); // Fallback to UID if user not found
            }
          } catch (error) {
            console.error('Error fetching user name:', error);
            setUserName(finance.user); // Fallback to UID on error
          }
        } else {
          // Likely a name (backward compatibility)
          setUserName(finance.user);
        }
      }
    };

    fetchUserName();
  }, [finance?.user, finance?.category]);

  if (!finance) {
    return null;
  }

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

            {finance.category === 'monthly_fee' && finance.user && (
              <div className={styles.financeDetailItemSmall}>
                <span className="material-icons">person</span>
                <span className={styles.financeUser}>
                  User: {userName || finance.user}
                </span>
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

