import React from 'react';
import styles from './UserDetailsModal.module.css';

const UserDetailsModal = ({ user, onClose, onTerminate, onChangeStatus, capitalize, formatDate, terminating, changingStatus }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user.name);
  const isTerminated = user.userType === 'terminated';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>&times;</button>
        
        <div className={styles.modalBody}>
          <div className={styles.modalStaffHeader}>
            <div className={styles.modalStaffAvatar}>
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={styles.modalStaffInfo}>
              <h2>{user.name || 'Unknown User'}</h2>
              <div className={styles.modalStaffTitle}>
                {isTerminated ? 'Terminated' : capitalize(user.role || 'N/A')}
              </div>
              <div className={styles.modalStaffDepartment}>
                {capitalize(user.group || 'N/A')}
              </div>
              {isTerminated && user.terminatedAt && (
                <div className={styles.terminatedStatus}>
                  Terminated on {formatDate(user.terminatedAt)}
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalSection}>
            <h3>User Information</h3>
            <div className={styles.userDetailsGrid}>
              <div className={styles.detailItem}>
                <label>Email:</label>
                <span>{user.email || 'N/A'}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Group:</label>
                <span>{capitalize(user.group || 'N/A')}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Role:</label>
                <span>{capitalize(user.role || 'N/A')}</span>
              </div>
              <div className={styles.detailItem}>
                <label>University:</label>
                <span>{user.university || 'N/A'}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Major:</label>
                <span>{user.major || 'N/A'}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Created:</label>
                <span>{formatDate(user.createdAt)}</span>
              </div>
              {isTerminated && (
                <>
                  <div className={styles.detailItem}>
                    <label>Terminated:</label>
                    <span>{formatDate(user.terminatedAt)}</span>
                  </div>
                  {user.terminatedBy && (
                    <div className={styles.detailItem}>
                      <label>Terminated By:</label>
                      <span>{user.terminatedBy}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {!isTerminated && (
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnDanger}
                onClick={() => onTerminate(user.uid)}
                disabled={terminating || changingStatus}
              >
                {terminating ? (
                  <>
                    <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                    Terminating...
                  </>
                ) : (
                  <>
                    <span className="material-icons">delete</span>
                    Terminate
                  </>
                )}
              </button>
              <button 
                className={styles.btnWarning}
                onClick={() => onChangeStatus(user.uid)}
                disabled={terminating || changingStatus}
              >
                {changingStatus ? (
                  <>
                    <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                    Updating...
                  </>
                ) : (
                  <>
                    <span className="material-icons">flag</span>
                    {user.status === 'active' ? 'Flag User' : 'Reinstate User'}
                  </>
                )}
              </button>
              <button 
                className={styles.btnOutline} 
                onClick={onClose}
                disabled={terminating || changingStatus}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;

