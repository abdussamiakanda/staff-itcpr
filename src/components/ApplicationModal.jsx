import React from 'react';
import styles from './ApplicationModal.module.css';

const ApplicationModal = ({ application, onClose, onApprove, onReject, onScheduleInterview, onDownloadFile, capitalize, formatDate }) => {
  const appId = application.id || application._id;
  const firestoreStatus = application.firestoreStatus || 'pending';
  const interviewSent = application.interviewSent || false;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Application Details</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.appModalView}>
            <div className={styles.appModalMeta}>
              <span className={`${styles.appModalStatus} ${styles[firestoreStatus]}`}>
                {capitalize(firestoreStatus)}
              </span>
              <span className={styles.appModalDate}>
                Submitted: {formatDate(application.createdAt || application.submittedAt || application.timestamp)}
              </span>
            </div>

            {firestoreStatus === 'rejected' && application.rejectReason ? (
              <div className={styles.appModalSection}>
                <h4>Rejection Reason</h4>
                <div className={`${styles.appInfoItem} ${styles.rejectReasonItem}`}>
                  <span className={styles.appInfoValue}>{application.rejectReason}</span>
                </div>
              </div>
            ) : null}
            
            <div className={styles.appModalSection}>
              <h4>Personal Information</h4>
              <div className={styles.appInfoGrid}>
                <div className={styles.appInfoItem}>
                  <span className={styles.appInfoLabel}>Name:</span>
                  <span className={styles.appInfoValue}>{application.name || application.fullName || 'N/A'}</span>
                </div>
                <div className={styles.appInfoItem}>
                  <span className={styles.appInfoLabel}>Email:</span>
                  <span className={styles.appInfoValue}>{application.email || 'N/A'}</span>
                </div>
                <div className={styles.appInfoItem}>
                  <span className={styles.appInfoLabel}>Phone:</span>
                  <span className={styles.appInfoValue}>{application.contact || application.phone || 'N/A'}</span>
                </div>
                {application.address ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Address:</span>
                    <span className={styles.appInfoValue}>{application.address}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.appModalSection}>
              <h4>Academic Information</h4>
              <div className={styles.appInfoGrid}>
                {application.university ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>University:</span>
                    <span className={styles.appInfoValue}>{application.university}</span>
                  </div>
                ) : null}
                {application.education ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Education Level:</span>
                    <span className={styles.appInfoValue}>{application.education}</span>
                  </div>
                ) : null}
                {application.major ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Major:</span>
                    <span className={styles.appInfoValue}>{application.major}</span>
                  </div>
                ) : null}
                {application.field ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Field of Interest:</span>
                    <span className={styles.appInfoValue}>{application.field}</span>
                  </div>
                ) : null}
                {application.year ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Current Year:</span>
                    <span className={styles.appInfoValue}>{application.year}</span>
                  </div>
                ) : null}
                {application.graduationdate ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Expected Graduation:</span>
                    <span className={styles.appInfoValue}>{application.graduationdate}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {((application.courses && application.courses !== 'N/A') || 
              (application.experiences && application.experiences !== 'N/A') || 
              (application.publications && application.publications !== 'N/A') || 
              (application.skills && application.skills !== 'N/A')) ? (
              <div className={styles.appModalSection}>
                <h4>Experience & Skills</h4>
                {application.courses && application.courses !== 'N/A' ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Relevant Courses:</span>
                    <span className={styles.appInfoValue}>{application.courses}</span>
                  </div>
                ) : null}
                {application.experiences && application.experiences !== 'N/A' ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Research Experience:</span>
                    <span className={styles.appInfoValue}>{application.experiences}</span>
                  </div>
                ) : null}
                {application.publications && application.publications !== 'N/A' ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Publications:</span>
                    <span className={styles.appInfoValue}>{application.publications}</span>
                  </div>
                ) : null}
                {application.skills && application.skills !== 'N/A' ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Technical Skills:</span>
                    <span className={styles.appInfoValue}>{application.skills}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {((application.reason && application.reason !== 'N/A') || 
              (application.expectation && application.expectation !== 'N/A')) ? (
              <div className={styles.appModalSection}>
                <h4>Motivation</h4>
                {application.reason && application.reason !== 'N/A' ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>Why do you want to join?</span>
                    <span className={styles.appInfoValue}>{application.reason}</span>
                  </div>
                ) : null}
                {application.expectation && application.expectation !== 'N/A' ? (
                  <div className={styles.appInfoItem}>
                    <span className={styles.appInfoLabel}>What are your expectations?</span>
                    <span className={styles.appInfoValue}>{application.expectation}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {application.fileUrls && 
             (application.fileUrls.cv || application.fileUrls.coverLetter || 
              application.fileUrls.transcript || application.fileUrls.additionalDocuments) ? (
              <div className={styles.appModalSection}>
                <h4>Attached Files</h4>
                <div className={styles.appFilesList}>
                  {application.fileUrls.cv ? (
                    <div className={styles.appFileItem}>
                      <span className="material-icons">description</span>
                      <span className={styles.appFileName}>CV: {application.fileUrls.cv}</span>
                      <button className={styles.appBtnOutline} onClick={() => onDownloadFile(application.fileUrls.cv)}>
                        <span className="material-icons">open_in_new</span>
                      </button>
                    </div>
                  ) : null}
                  {application.fileUrls.coverLetter ? (
                    <div className={styles.appFileItem}>
                      <span className="material-icons">description</span>
                      <span className={styles.appFileName}>Cover Letter: {application.fileUrls.coverLetter}</span>
                      <button className={styles.appBtnOutline} onClick={() => onDownloadFile(application.fileUrls.coverLetter)}>
                        <span className="material-icons">open_in_new</span>
                      </button>
                    </div>
                  ) : null}
                  {application.fileUrls.transcript ? (
                    <div className={styles.appFileItem}>
                      <span className="material-icons">description</span>
                      <span className={styles.appFileName}>Transcript: {application.fileUrls.transcript}</span>
                      <button className={styles.appBtnOutline} onClick={() => onDownloadFile(application.fileUrls.transcript)}>
                        <span className="material-icons">open_in_new</span>
                      </button>
                    </div>
                  ) : null}
                  {application.fileUrls.additionalDocuments ? (
                    <div className={styles.appFileItem}>
                      <span className="material-icons">description</span>
                      <span className={styles.appFileName}>Additional Documents: {application.fileUrls.additionalDocuments}</span>
                      <button className={styles.appBtnOutline} onClick={() => onDownloadFile(application.fileUrls.additionalDocuments)}>
                        <span className="material-icons">open_in_new</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {firestoreStatus === 'pending' ? (
            <>
              <button className={styles.appBtnSuccess} onClick={() => onApprove(appId)}>
                <span className="material-icons">check</span>
                Approve
              </button>
              {!interviewSent ? (
                <button className={styles.appBtnWarning} onClick={() => onScheduleInterview(appId)}>
                  <span className="material-icons">event</span>
                  Interview
                </button>
              ) : null}
              <button className={styles.appBtnDanger} onClick={() => onReject(appId)}>
                <span className="material-icons">close</span>
                Reject
              </button>
            </>
          ) : null}
          <button className={styles.appBtnOutline} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationModal;

