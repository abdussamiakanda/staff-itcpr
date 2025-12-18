import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { sendEmail, getEmailTemplate } from '../utils/email';
import IssueModal from '../components/IssueModal';
import IssueDetailsModal from '../components/IssueDetailsModal';
import CommentModal from '../components/CommentModal';
import DeleteIssueModal from '../components/DeleteIssueModal';
import styles from './Issues.module.css';

const Issues = () => {
  const { user, userData } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const notifyAdmins = async (subject, message) => {
    try {
      // Get all admin users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const admins = usersSnapshot.docs
        .map(doc => doc.data())
        .filter(u => u.type === 'admin' && u.pemail);

      // Send email to each admin
      for (const admin of admins) {
        try {
          await sendEmail(admin.pemail, subject, getEmailTemplate(admin.name, message));
        } catch (error) {
          console.error(`Error sending email to ${admin.pemail}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  };

  const handleAddIssue = async (formData) => {
    try {
      const issueData = {
        ...formData,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown'
      };

      if (formData.type === 'event') {
        issueData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      await addDoc(collection(db, 'issues'), issueData);
      await notifyAdmins(
        'A New Issue was Created in ITCPR Staff Portal',
        `<b>${issueData.userName}</b> created a new issue.<br>Title: ${formData.title}`
      );

      setShowAddModal(false);
      await loadIssues();
    } catch (error) {
      console.error('Error adding issue:', error);
    }
  };

  const handleEditIssue = async (id, formData) => {
    try {
      const issueData = {
        ...formData,
        createdAt: serverTimestamp()
      };

      if (formData.type === 'event') {
        issueData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      await updateDoc(doc(db, 'issues', id), issueData);
      await notifyAdmins(
        'An Issue was Edited in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> edited an issue.<br>Title: ${formData.title}`
      );

      setSelectedIssue(null);
      await loadIssues();
    } catch (error) {
      console.error('Error editing issue:', error);
    }
  };

  const handleDeleteIssue = async (id) => {
    try {
      await deleteDoc(doc(db, 'issues', id));
      await notifyAdmins(
        'An Issue was Deleted in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> deleted an issue.`
      );

      setShowDeleteModal(false);
      setSelectedIssue(null);
      await loadIssues();
    } catch (error) {
      console.error('Error deleting issue:', error);
    }
  };

  const handleResolveIssue = async (id) => {
    try {
      await updateDoc(doc(db, 'issues', id), { resolvedAt: serverTimestamp() });
      await notifyAdmins(
        'An Issue was Resolved in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> resolved an issue.`
      );

      setSelectedIssue(null);
      await loadIssues();
    } catch (error) {
      console.error('Error resolving issue:', error);
    }
  };

  const handleUnresolveIssue = async (id) => {
    try {
      await updateDoc(doc(db, 'issues', id), { resolvedAt: null });
      await notifyAdmins(
        'An Issue was Unresolved in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> marked an issue as unresolved.`
      );

      setSelectedIssue(null);
      await loadIssues();
    } catch (error) {
      console.error('Error unresolving issue:', error);
    }
  };

  const handleAddComment = async (issueId, comment) => {
    try {
      await addDoc(collection(db, 'issues', issueId, 'comments'), {
        comment,
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown',
        createdAt: serverTimestamp()
      });

      await notifyAdmins(
        'A New Comment was Created in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> added a comment.<br>Comment: ${comment}`
      );

      setShowCommentModal(false);
      if (selectedIssue && selectedIssue.id === issueId) {
        await loadComments(issueId);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditComment = async (issueId, commentId, comment) => {
    try {
      await updateDoc(doc(db, 'issues', issueId, 'comments', commentId), {
        comment,
        createdAt: serverTimestamp()
      });

      await notifyAdmins(
        'A Comment was Edited in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> edited a comment.<br>Comment: ${comment}`
      );

      setShowCommentModal(false);
      setEditingComment(null);
      if (selectedIssue && selectedIssue.id === issueId) {
        await loadComments(issueId);
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (issueId, commentId) => {
    try {
      await deleteDoc(doc(db, 'issues', issueId, 'comments', commentId));
      await notifyAdmins(
        'A Comment was Deleted in ITCPR Staff Portal',
        `<b>${user.displayName || user.email || 'Unknown'}</b> deleted a comment.`
      );

      if (selectedIssue && selectedIssue.id === issueId) {
        await loadComments(issueId);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const loadComments = async (issueId) => {
    try {
      const commentsRef = collection(db, 'issues', issueId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSelectedIssue(prev => prev ? { ...prev, comments } : null);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleViewIssue = async (issue) => {
    setSelectedIssue(issue);
    await loadComments(issue.id);
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
        />
      )}

      {selectedIssue && !showDeleteModal && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onEdit={(issue) => setSelectedIssue({ ...issue, isEdit: true })}
          onDelete={() => setShowDeleteModal(true)}
          onResolve={handleResolveIssue}
          onUnresolve={handleUnresolveIssue}
          onAddComment={() => setShowCommentModal(true)}
          onEditComment={(comment) => {
            setEditingComment(comment);
            setShowCommentModal(true);
          }}
          onDeleteComment={handleDeleteComment}
          formatDate={formatDate}
          formatEventDate={formatEventDate}
          isAdmin={isAdmin}
          currentUserId={user?.uid}
        />
      )}

      {selectedIssue && selectedIssue.isEdit && (
        <IssueModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onSave={(formData) => handleEditIssue(selectedIssue.id, formData)}
        />
      )}

      {showCommentModal && selectedIssue && (
        <CommentModal
          issueId={selectedIssue.id}
          comment={editingComment}
          onClose={() => {
            setShowCommentModal(false);
            setEditingComment(null);
          }}
          onSave={editingComment 
            ? (comment) => handleEditComment(selectedIssue.id, editingComment.id, comment)
            : (comment) => handleAddComment(selectedIssue.id, comment)
          }
        />
      )}

      {showDeleteModal && selectedIssue && (
        <DeleteIssueModal
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedIssue(null);
          }}
          onConfirm={() => handleDeleteIssue(selectedIssue.id)}
        />
      )}
    </div>
  );
};

export default Issues;
