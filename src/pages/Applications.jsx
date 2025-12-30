import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { sendEmail } from '../utils/email';
import { getEmailTemplate } from '../utils/email';
import ApplicationModal from '../components/ApplicationModal';
import RejectReasonModal from '../components/RejectReasonModal';
import styles from './Applications.module.css';

const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectApplicationId, setRejectApplicationId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });

  useEffect(() => {
    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const apiUrl = import.meta.env.VITE_API_APPLY_URL;
      if (!apiUrl) {
        throw new Error('VITE_API_APPLY_URL is not defined in environment variables');
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      const apiApplications = data.applications || [];
      
      // Load status data from Firestore
      const statusRef = collection(db, 'applicationStatus');
      const statusSnap = await getDocs(statusRef);
      const statusData = {};
      
      statusSnap.docs.forEach(doc => {
        statusData[doc.id] = doc.data();
      });

      // Merge API data with Firestore status data
      const mergedApplications = apiApplications.map(app => {
        const appId = app.id || app._id;
        const firestoreData = statusData[appId] || {};
        
        return {
          ...app,
          firestoreStatus: firestoreData.status || 'pending',
          interviewSent: firestoreData.interviewSent || false,
          statusUpdatedAt: firestoreData.updatedAt,
          statusUpdatedBy: firestoreData.updatedBy,
          rejectReason: firestoreData.rejectReason || null
        };
      });
      
      // Sort applications by createdAt and submittedAt (newest first)
      mergedApplications.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.submittedAt || a.timestamp || 0);
        const dateB = new Date(b.createdAt || b.submittedAt || b.timestamp || 0);
        return dateB - dateA;
      });
      
      setApplications(mergedApplications);
      updateStats(mergedApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (apps) => {
    const total = apps.length;
    const pending = apps.filter(app => (app.firestoreStatus || 'pending') === 'pending').length;
    const accepted = apps.filter(app => app.firestoreStatus === 'approved').length;
    const rejected = apps.filter(app => app.firestoreStatus === 'rejected').length;
    
    setStats({ total, pending, accepted, rejected });
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewApplication = (application) => {
    setSelectedApplication(application);
  };

  const closeModal = () => {
    setSelectedApplication(null);
  };

  const handleApprove = async (applicationId) => {
    try {
      const application = applications.find(app => (app.id || app._id) === applicationId);
      if (!application) {
        return;
      }

      // Send acceptance email
      const emailSent = await sendAcceptApplicationEmail(application, application.field || application.position);
      
      // Create user in portal
      await createUser(application);

      // Store status in Firestore
      const statusData = {
        applicationId: applicationId,
        status: 'approved',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        emailSent: emailSent
      };

      await setDoc(doc(db, 'applicationStatus', applicationId), statusData);

      // Update local state
      const updatedApplications = applications.map(app => {
        const appId = app.id || app._id;
        if (appId === applicationId) {
          return { ...app, firestoreStatus: 'approved' };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      updateStats(updatedApplications);
      closeModal();
    } catch (error) {
      console.error('Error approving application:', error);
    }
  };

  const handleReject = (applicationId) => {
    setRejectApplicationId(applicationId);
    setShowRejectModal(true);
  };

  const confirmReject = async (reason) => {
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const application = applications.find(app => (app.id || app._id) === rejectApplicationId);
      if (!application) {
        return;
      }

      // Send rejection email
      const emailSent = await sendRejectApplicationEmail(application, reason);

      // Store status in Firestore
      const statusData = {
        applicationId: rejectApplicationId,
        status: 'rejected',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        emailSent: emailSent,
        rejectReason: reason
      };

      await setDoc(doc(db, 'applicationStatus', rejectApplicationId), statusData);

      // Update local state
      const updatedApplications = applications.map(app => {
        const appId = app.id || app._id;
        if (appId === rejectApplicationId) {
          return { ...app, firestoreStatus: 'rejected' };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      updateStats(updatedApplications);
      setShowRejectModal(false);
      setRejectApplicationId(null);
      closeModal();
    } catch (error) {
      console.error('Error rejecting application:', error);
    }
  };

  const handleScheduleInterview = async (applicationId) => {
    try {
      const application = applications.find(app => (app.id || app._id) === applicationId);
      if (!application) {
        return;
      }

      const message = `
        <p>
          We are pleased to inform you that your application has been
          successfully shortlisted for the next stage: the interview process.
        </p>
        <p>
          At your earliest convenience, please email us at <b>majasem@mail.itcpr.org</b>
          to coordinate a suitable time for your interview. Include your
          availability and preferred language (English or Bangla), and we
          will do our best to accommodate your schedule. The interview will
          be conducted via Google Meet.
        </p>
        <p>
          <b>Please respond within 3 days</b> of receiving this email to
          confirm your interest. If we do not hear from you within this
          time, your application may be withdrawn from consideration.
        </p>
        <p>
          If you have any questions or need further assistance, feel free
          to reach out to <b>majasem@mail.itcpr.org</b>. We look forward to speaking
          with you soon.
        </p>
        <p>
          <i>Note: This message was sent from an automated system. Please
          do not reply directly to this email.</i>
        </p>
      `;

      const subject = `Interview Invitation - ITCPR Internship Application`;
      const emailSent = await sendEmail(application.email, subject, getEmailTemplate(application.name || application.fullName, message));

      if (emailSent) {
        const interviewData = {
          applicationId: applicationId,
          status: 'pending',
          interviewSent: true,
          scheduledBy: user.uid,
          scheduledAt: serverTimestamp(),
          applicantName: application.name || application.fullName,
          applicantEmail: application.email,
          field: application.field || application.position,
          university: application.university,
          emailSent: true
        };

        await setDoc(doc(db, 'applicationStatus', applicationId), interviewData);

        // Update local state
        const updatedApplications = applications.map(app => {
          const appId = app.id || app._id;
          if (appId === applicationId) {
            return { ...app, interviewSent: true };
          }
          return app;
        });
        
        setApplications(updatedApplications);
        closeModal();
      }
    } catch (error) {
      console.error('Error sending interview email:', error);
    }
  };

  const sendAcceptApplicationEmail = async (applicationData, group) => {
    const { name, email } = applicationData;
    const subject = `Congratulations! Your Application to Join ITCPR has been Accepted`;

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const message = `
      <p>We are pleased to offer you an internship position in our ${capitalize(group)} Group
      at the Institution for Theoretical & Computational Physics Research.
      Your skills and background make you an ideal fit for our team, and we are excited
      about the potential contributions you will bring.</p>

      <p>Position Details:</p>
      <ul>
        <li>Title: Intern</li>
        <li>Research Group: ${capitalize(group)} Group</li>
        <li>Expected Hours: 10 hours per week</li>
        <li>Duration: 1 year (Conditional on performance)</li>
      </ul>

      <p>Responsibilities:</p>
      <ul>
        <li>Participating in specialized training sessions to enhance your skills.</li>
        <li>Contributing to team meetings with insights and ideas.</li>
        <li>Assisting in data analysis and research documentation.</li>
        <li>Collaborating on theoretical and computational physics projects.</li>
        <li>Complying with institutional policies and ethical standards.</li>
      </ul>

      <p>Terms of Internship:</p>
      <ul>
        <li>The internship concludes in June/December, depending on your recruitment cycle, with the option to re-apply for continuation into the next year.</li>
        <li>This is a self-funded institution; therefore, the internship position is unpaid.</li>
        <li>Interns will receive comprehensive training in various software and research methodologies crucial for their role.</li>
        <li>Each intern will be under the supervision of the lead of their assigned research group.</li>
        <li>Interns will be evaluated each month based on their performance and contributions to the team.</li>
        <li>Adherence to confidentiality and data protection standards is mandatory, particularly regarding sensitive research information.</li>
        <li>Completion of the internship does not guarantee subsequent membership with ITCPR.</li>
      </ul>
      <p>
        ITCPR internship handbook is a comprehensive guide detailing the structure, expectations, and responsibilities of interns at 
        ITCPR. It includes information about mentorship, weekly meetings, and evaluation criteria. <br><br>
        Download the handbook: <a href="https://itcpr.org/files/data/internship_handbook.pdf">ITCPR Internship Handbook (PDF)</a>
        <br>
        Please review the handbook thoroughly before starting your internship to ensure you understand the expectations and guidelines.
      </p>
      <p>We hope you will find your experience with us, rewarding and insightful.</p>
    `;

    return sendEmail(email, subject, getEmailTemplate(name, message));
  };

  const sendRejectApplicationEmail = async (applicationData, rejectReason) => {
    const { name, email } = applicationData;
    const subject = `Your Application to Join ITCPR is Rejected`;

    const message = `
      <p>
        We appreciate the time and effort you dedicated to your application and for
        your interest in joining our team.
      </p>
      <p>
        After careful consideration, I regret to inform you that we will not be moving
        forward with your application for this position. Please understand that this
        decision does not diminish the value of your skills and accomplishments. We
        encourage you to apply for future opportunities at ITCPR that align with your
        qualifications and interests.
      </p>
      <b>Reason for rejection:</b>
      <p>${rejectReason}</p>
      <p>
        We appreciate your interest in ITCPR and wish you all the best in your future
        endeavors.
      </p>
    `;

    return sendEmail(email, subject, getEmailTemplate(name, message));
  };

  const generateEmail = async (name) => {
    const parts = name.trim().toLowerCase().split(/\s+/);
  
    if (parts.length === 0) return '';
  
    const initials = parts.slice(0, -1).map(part => part[0] || '').join('');
    const lastName = parts[parts.length - 1];
  
    const email = (initials + lastName).replace(/[^a-z0-9]/g, '') + '@mail.itcpr.org';
    
    // Check if email exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const qSnap = await getDocs(q);
    
    if (qSnap.empty) {
      return email;
    }
    return await generateEmail(name + '1');
  };

  const createUser = async (application) => {
    const email = await generateEmail(application.name || application.fullName);

    try {
      if (!user) {
        throw new Error("User not logged in");
      }
  
      const idToken = await user.getIdToken();
  
      const apiUrl = import.meta.env.VITE_API_NEWUSER_URL;
      if (!apiUrl) {
        throw new Error('VITE_API_NEWUSER_URL is not defined in environment variables');
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        })
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || "Unknown error");
      }
  
      const userData = {
        email: email,
        name: application.name || application.fullName,
        role: 'intern',
        group: (application.field || application.position || '').toLowerCase(),
        pemail: application.email,
        photoURL: application.photoURL || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541",
        createdAt: serverTimestamp(),
        uid: result.uid,
        university: application.university,
        status: 'pending'
      };
      
      await setDoc(doc(db, 'users', result.uid), userData);
      
      // Send new user email
      const message = `
        <b>Your New ITCPR Email Credentials</b>
        <ul>
        <li>Email Address: ${email}</li>
        <li>Temporary Password: itcprnewuser</li>
        </ul>
        <b>What You Need to Do</b>
        <ul>
        <li>Visit the portal: https://portal.itcpr.org</li>
        <li>Log in using the email and temporary password above</li>
        <li>After logging in, you will be prompted to join our Discord server</li>
        <li>Click Join button and join the server</li>
        <li>Download Discord desktop app and the mobile app to join the server</li>
        <li>Click on the person icon on the top right corner in the portal.</li>
        <li>Click on change password, and change your password immediately</li>
        <li>You can now start using the portal and other services</li>
        </ul>
        <b>Explore our services to be familiar with the portal. All our communication is done through Discord and the webmail.</b>
      `;
      const subject = `Welcome to ITCPR Portal`;
      await sendEmail(application.email, subject, getEmailTemplate(application.name || application.fullName, message));
      return result;
  
    } catch (error) {
      console.error("Error creating new user:", error.message);
      return { error: error.message };
    }
  };

  const downloadFile = (fileUrl) => {
    try {
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `https://apply.itcpr.org/${fileUrl}`;
      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  // Filter and search applications
  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || (app.firestoreStatus || 'pending') === filterStatus;
    const matchesSearch = searchQuery === '' || 
      (app.name || app.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.field || app.position || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.university || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Applications</h3>
          <p>Please wait while we fetch the latest applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.applicationsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Applications</h2>
            <p>Manage and review applications</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnRefresh} onClick={loadApplications}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.overviewContainer}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>description</span>
              <span className={styles.statTitle}>Total Applications</span>
            </div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statSubtitle}>All Time</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>schedule</span>
              <span className={styles.statTitle}>Pending</span>
            </div>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statSubtitle}>Awaiting Review</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>check_circle</span>
              <span className={styles.statTitle}>Accepted</span>
            </div>
            <div className={styles.statValue}>{stats.accepted}</div>
            <div className={styles.statSubtitle}>Approved</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>cancel</span>
              <span className={styles.statTitle}>Rejected</span>
            </div>
            <div className={styles.statValue}>{stats.rejected}</div>
            <div className={styles.statSubtitle}>Declined</div>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Search by name, email, field, or university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.statusFilter}>
            <button
              className={filterStatus === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={filterStatus === 'pending' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('pending')}
            >
              Pending
            </button>
            <button
              className={filterStatus === 'approved' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('approved')}
            >
              Accepted
            </button>
            <button
              className={filterStatus === 'rejected' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('rejected')}
            >
              Rejected
            </button>
          </div>
        </div>

        <div className={styles.applicationsList}>
          {filteredApplications.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">inbox</span>
              <h3>No Applications Found</h3>
              <p>{searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters or search query.' : 'No applications have been submitted yet.'}</p>
            </div>
          ) : (
            filteredApplications.map((application) => {
              const appId = application.id || application._id;
              const firestoreStatus = application.firestoreStatus || 'pending';
              const interviewSent = application.interviewSent || false;
              
              return (
                <div key={appId} className={styles.appCard}>
                  <div className={styles.appHeader}>
                    <div className={styles.appInfo}>
                      <h3>{application.name || application.fullName || 'N/A'}</h3>
                      <p>{application.email || 'N/A'}</p>
                    </div>
                    <div className={`${styles.appStatus} ${styles[firestoreStatus]}`}>
                      <span className={styles.appStatusBadge}>{capitalize(firestoreStatus)}</span>
                    </div>
                  </div>
                  
                  <div className={styles.appDetails}>
                    <div className={styles.appDetailRow}>
                      <span className={styles.appDetailLabel}>Field:</span>
                      <span className={styles.appDetailValue}>{application.position || application.role || application.field || 'N/A'}</span>
                    </div>
                    <div className={styles.appDetailRow}>
                      <span className={styles.appDetailLabel}>Submitted:</span>
                      <span className={styles.appDetailValue}>{formatDate(application.createdAt || application.submittedAt || application.timestamp)}</span>
                    </div>
                    {application.contact || application.phone ? (
                      <div className={styles.appDetailRow}>
                        <span className={styles.appDetailLabel}>Phone:</span>
                        <span className={styles.appDetailValue}>{application.contact || application.phone}</span>
                      </div>
                    ) : null}
                    {application.university ? (
                      <div className={styles.appDetailRow}>
                        <span className={styles.appDetailLabel}>University:</span>
                        <span className={styles.appDetailValue}>{application.university}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.appActions}>
                    <button className={styles.appBtnSecondary} onClick={() => viewApplication(application)}>
                      <span className="material-icons">visibility</span>
                      View
                    </button>
                    {firestoreStatus === 'pending' ? (
                      <>
                        {!interviewSent ? (
                          <button className={styles.appBtnWarning} onClick={() => handleScheduleInterview(appId)}>
                            <span className="material-icons">event</span>
                            Interview
                          </button>
                        ) : null}
                        <button className={styles.appBtnSuccess} onClick={() => handleApprove(appId)}>
                          <span className="material-icons">check</span>
                          Approve
                        </button>
                        <button className={styles.appBtnDanger} onClick={() => handleReject(appId)}>
                          <span className="material-icons">close</span>
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {selectedApplication && (
        <ApplicationModal
          application={selectedApplication}
          onClose={closeModal}
          onApprove={handleApprove}
          onReject={handleReject}
          onScheduleInterview={handleScheduleInterview}
          onDownloadFile={downloadFile}
          capitalize={capitalize}
          formatDate={formatDate}
        />
      )}

      {showRejectModal && (
        <RejectReasonModal
          onClose={() => {
            setShowRejectModal(false);
            setRejectApplicationId(null);
          }}
          onConfirm={confirmReject}
        />
      )}
    </div>
  );
};

export default Applications;
