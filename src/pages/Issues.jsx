import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { sendEmail, getEmailTemplate } from '../utils/email';
import IssueModal from '../components/IssueModal';
import DeleteIssueModal from '../components/DeleteIssueModal';
import styles from './Issues.module.css';

const Issues = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [editingIssueData, setEditingIssueData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingIssueId, setDeletingIssueId] = useState(null);
  const [addingIssue, setAddingIssue] = useState(false);
  const [editingIssue, setEditingIssue] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    events: 0
  });

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setIssues(issuesData);

      const total = issuesData.length;
      const pending = issuesData.filter(i => !i.resolvedAt && i.type !== 'event').length;
      const resolved = issuesData.filter(i => i.resolvedAt).length;
      const events = issuesData.filter(i => i.type === 'event').length;

      setStats({ total, pending, resolved, events });
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventDate = (date, time, timezone) => {
    if (!date) return 'N/A';
    try {
      const dateTime = time ? `${date}T${time}` : date;
      const eventDate = new Date(dateTime);
      return eventDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone || undefined
      });
    } catch (error) {
      return date;
    }
  };

  const notifyStaff = async (subject, message, excludeUserId = null) => {
    try {
      // Get all staff users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const staffUsers = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.position === 'staff' && u.email && (!excludeUserId || u.id !== excludeUserId));

      // Send email to each staff member
      for (const staff of staffUsers) {
        try {
          const staffName = staff.name || staff.displayName || 'User';
          await sendEmail(staff.email, subject, getEmailTemplate(staffName, message));
        } catch (error) {
          console.error(`Error sending email to ${staff.email}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying staff:', error);
    }
  };

  const handleAddIssue = async (formData) => {
    setAddingIssue(true);
    try {
      const issueData = {
        ...formData,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: userData?.name || userData?.displayName || user?.email || 'Unknown'
      };

      if (formData.type === 'event') {
        issueData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      const docRef = await addDoc(collection(db, 'issues'), issueData);
      const issueUrl = `${window.location.origin}/issues/${docRef.id}`;
      const issueType = formData.type === 'event' ? 'Event' : 'Issue';
      const issueStatus = formData.type === 'event' ? 'Scheduled' : 'Pending';
      
      const message = `
        <p><b>${issueData.userName}</b> created a new ${issueType.toLowerCase()} in the ITCPR Staff Portal.</p>
        <p><b>Title:</b> ${formData.title}</p>
        <p><b>Type:</b> ${issueType}</p>
        <p><b>Status:</b> ${issueStatus}</p>
        ${formData.description ? `<p><b>Description:</b><br>${formData.description.replace(/\n/g, '<br>')}</p>` : ''}
        ${formData.date ? `<p><b>Date:</b> ${formatEventDate(formData.date, formData.time, formData.timezone)}</p>` : ''}
        <p>
          <a href="${issueUrl}">View ${issueType}</a>
        </p>
      `;
      
      await notifyStaff(
        `A New ${issueType} was Created in ITCPR Staff Portal`,
        message,
        user?.uid
      );

      setShowAddModal(false);
      await loadIssues();
      toast.success('Issue added successfully');
    } catch (error) {
      console.error('Error adding issue:', error);
      toast.error('Error adding issue. Please try again.');
    } finally {
      setAddingIssue(false);
    }
  };

  const handleEditIssue = async (id, formData) => {
    setEditingIssue(true);
    try {
      const issueData = {
        ...formData,
        createdAt: serverTimestamp()
      };

      if (formData.type === 'event') {
        issueData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      await updateDoc(doc(db, 'issues', id), issueData);
      
      // Get the issue to include more details
      const issueDoc = await getDoc(doc(db, 'issues', id));
      const issue = issueDoc.data();
      const issueUrl = `${window.location.origin}/issues/${id}`;
      const issueType = formData.type === 'event' ? 'Event' : 'Issue';
      const issueStatus = issue.resolvedAt ? 'Resolved' : (formData.type === 'event' ? 'Scheduled' : 'Pending');
      
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> edited a ${issueType.toLowerCase()} in the ITCPR Staff Portal.</p>
        <p><b>Title:</b> ${formData.title}</p>
        <p><b>Type:</b> ${issueType}</p>
        <p><b>Status:</b> ${issueStatus}</p>
        ${formData.description ? `<p><b>Description:</b><br>${formData.description.replace(/\n/g, '<br>')}</p>` : ''}
        ${formData.date ? `<p><b>Date:</b> ${formatEventDate(formData.date, formData.time, formData.timezone)}</p>` : ''}
        <p>
          <a href="${issueUrl}">View ${issueType}</a>
        </p>
      `;
      
      await notifyStaff(
        `An ${issueType} was Edited in ITCPR Staff Portal`,
        message,
        user?.uid
      );

      await loadIssues();
      toast.success('Issue updated successfully');
    } catch (error) {
      console.error('Error editing issue:', error);
      toast.error('Error editing issue. Please try again.');
    } finally {
      setEditingIssue(false);
    }
  };

  const handleDeleteIssue = async (id) => {
    setDeletingIssue(true);
    try {
      // Get issue details before deleting
      const issueDoc = await getDoc(doc(db, 'issues', id));
      const issue = issueDoc.data();
      const issueType = issue?.type === 'event' ? 'Event' : 'Issue';
      
      await deleteDoc(doc(db, 'issues', id));
      
      const issueUrl = `${window.location.origin}/issues`;
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> deleted a ${issueType.toLowerCase()} from the ITCPR Staff Portal.</p>
        ${issue?.title ? `<p><b>Deleted ${issueType}:</b> ${issue.title}</p>` : ''}
        <p>
          <a href="${issueUrl}">View All Issues</a>
        </p>
      `;
      
      await notifyStaff(
        `An ${issueType} was Deleted in ITCPR Staff Portal`,
        message,
        user?.uid
      );

      setShowDeleteModal(false);
      setDeletingIssueId(null);
      await loadIssues();
      toast.success('Issue deleted successfully');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Error deleting issue. Please try again.');
    } finally {
      setDeletingIssue(false);
    }
  };

  const handleViewIssue = (issue) => {
    navigate(`/issues/${issue.id}`);
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pending' && !issue.resolvedAt && issue.type !== 'event') ||
      (filterStatus === 'resolved' && issue.resolvedAt) ||
      (filterStatus === 'events' && issue.type === 'event');
    
    const matchesType = filterType === 'all' || issue.type === filterType;
    
    const matchesSearch = !searchQuery || 
      (issue.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesType && matchesSearch;
  });

  const isAdmin = userData?.type === 'admin';

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Issues</h3>
          <p>Please wait while we fetch the issues and events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.issuesSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Issues Management</h2>
            <p>Manage all the issues/events of ITCPR</p>
          </div>
          <div className={styles.sectionActions}>
            {isAdmin && (
              <button className={styles.btnAddIssue} onClick={() => setShowAddModal(true)}>
                <span className="material-icons">add</span>
                Add Issue/Event
              </button>
            )}
            <button className={styles.btnRefresh} onClick={loadIssues}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.overviewContainer}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>bug_report</span>
              <span className={styles.statTitle}>Total Issues</span>
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
            <div className={styles.statSubtitle}>Awaiting Resolution</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>check_circle</span>
              <span className={styles.statTitle}>Resolved</span>
            </div>
            <div className={styles.statValue}>{stats.resolved}</div>
            <div className={styles.statSubtitle}>Completed</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>event</span>
              <span className={styles.statTitle}>Events</span>
            </div>
            <div className={styles.statValue}>{stats.events}</div>
            <div className={styles.statSubtitle}>Scheduled Events</div>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Search by title or description..."
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
              className={filterStatus === 'resolved' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('resolved')}
            >
              Resolved
            </button>
            <button
              className={filterStatus === 'events' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('events')}
            >
              Events
            </button>
          </div>
          <div className={styles.typeFilter}>
            <button
              className={filterType === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('all')}
            >
              All Types
            </button>
            <button
              className={filterType === 'issue' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('issue')}
            >
              Issues
            </button>
            <button
              className={filterType === 'event' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('event')}
            >
              Events
            </button>
          </div>
        </div>

        <div className={styles.issuesGrid}>
          {filteredIssues.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">inbox</span>
              <h3>No Issues Found</h3>
              <p>{searchQuery || filterStatus !== 'all' || filterType !== 'all' ? 'Try adjusting your filters or search query.' : 'No issues or events have been added yet.'}</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div key={issue.id} className={styles.issueCard}>
                <div className={styles.issueHeader}>
                  <h4>{issue.title}</h4>
                  <div className={styles.issueMeta}>
                    <div className={styles.issueDate}>
                      {issue.date ? (
                        <span className="material-icons">event</span>
                      ) : (
                        <span className="material-icons">schedule</span>
                      )}
                      {issue.date 
                        ? formatEventDate(issue.date, issue.time, issue.timezone)
                        : formatDate(issue.createdAt)
                      }
                    </div>
                    <div className={`${styles.issueStatus} ${styles[issue.resolvedAt ? 'resolved' : 'pending']}`}>
                      {issue.resolvedAt ? 'Resolved' : 'Pending'}
                    </div>
                  </div>
                  {issue.userName && (
                    <div className={styles.issueCreator}>
                      Created by: {issue.userName}
                    </div>
                  )}
                </div>
                <p className={styles.issueDescription}>
                  {issue.description || 'No description'}
                </p>
                <div className={styles.issueFooter}>
                  <button 
                    className={styles.btnManage}
                    onClick={() => handleViewIssue(issue)}
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showAddModal && (
        <IssueModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddIssue}
          saving={addingIssue}
        />
      )}

      {editingIssueId && editingIssueData && (
        <IssueModal
          issue={{ ...editingIssueData, isEdit: true }}
          onClose={() => {
            setEditingIssueId(null);
            setEditingIssueData(null);
            setEditingIssue(false);
          }}
          onSave={(formData) => {
            handleEditIssue(editingIssueId, formData);
            setEditingIssueId(null);
            setEditingIssueData(null);
          }}
          saving={editingIssue}
        />
      )}

      {showDeleteModal && deletingIssueId && (
        <DeleteIssueModal
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingIssueId(null);
          }}
          onConfirm={() => {
            handleDeleteIssue(deletingIssueId);
          }}
          deleting={deletingIssue}
        />
      )}
    </div>
  );
};

export default Issues;
