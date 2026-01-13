import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { markdownToHtml, sendEmail, getEmailTemplate } from '../utils/email';
import ConfirmDialog from '../components/ConfirmDialog';
import CommentModal from '../components/CommentModal';
import IssueModal from '../components/IssueModal';
import DeleteIssueModal from '../components/DeleteIssueModal';
import styles from './IssueDetail.module.css';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCommentId, setPendingCommentId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState(false);
  const [unresolvingIssue, setUnresolvingIssue] = useState(false);

  useEffect(() => {
    if (id) {
      loadIssue();
      loadComments();
    }
  }, [id]);

  const loadIssue = async () => {
    setLoading(true);
    try {
      const issueDoc = await getDoc(doc(db, 'issues', id));
      if (!issueDoc.exists()) {
        toast.error('Issue not found');
        navigate('/issues');
        return;
      }
      setIssue({ id: issueDoc.id, ...issueDoc.data() });
    } catch (error) {
      console.error('Error loading issue:', error);
      toast.error('Error loading issue');
      navigate('/issues');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsRef = collection(db, 'issues', id, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
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

  const formatContent = (text) => {
    if (!text) return '';
    return markdownToHtml(text);
  };

  const handleDeleteComment = async (commentId) => {
    setPendingCommentId(commentId);
    setShowConfirmDialog(true);
  };

  const executeDeleteComment = async (commentId) => {
    setDeletingCommentId(commentId);
    try {
      await deleteDoc(doc(db, 'issues', id, 'comments', commentId));

      const issueUrl = `${window.location.origin}/issues/${id}`;
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> deleted a comment from an issue in the ITCPR Staff Portal.</p>
        <p><b>Issue:</b> ${issue?.title || 'N/A'}</p>
        <p>
          <a href="${issueUrl}">View Issue</a>
        </p>
      `;

      await notifyStaff(
        'A Comment was Deleted in ITCPR Staff Portal',
        message,
        user?.uid
      );

      await loadComments();
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error deleting comment. Please try again.');
    } finally {
      setDeletingCommentId(null);
      setPendingCommentId(null);
    }
  };

  const handleEditIssue = async (formData) => {
    setSavingIssue(true);
    try {
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'issues', id), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      await loadIssue();
      setShowEditModal(false);
      toast.success('Issue updated successfully');
    } catch (error) {
      console.error('Error editing issue:', error);
      toast.error('Error editing issue. Please try again.');
    } finally {
      setSavingIssue(false);
    }
  };

  const handleDeleteIssue = async () => {
    setDeletingIssue(true);
    try {
      await deleteDoc(doc(db, 'issues', id));
      toast.success('Issue deleted successfully');
      navigate('/issues');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Error deleting issue. Please try again.');
    } finally {
      setDeletingIssue(false);
    }
  };

  const notifyStaff = async (subject, message, excludeUserId = null) => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const staffUsers = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.position === 'staff' && u.email && (!excludeUserId || u.id !== excludeUserId));

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

  const handleResolveIssue = async () => {
    setResolvingIssue(true);
    try {
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'issues', id), { resolvedAt: serverTimestamp() });
      
      const issueUrl = `${window.location.origin}/issues/${id}`;
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> resolved an issue in the ITCPR Staff Portal.</p>
        <p><b>Issue:</b> ${issue?.title || 'N/A'}</p>
        <p><b>Status:</b> Resolved</p>
        ${issue?.description ? `<p><b>Description:</b><br>${issue.description.replace(/\n/g, '<br>')}</p>` : ''}
        <p>
          <a href="${issueUrl}">View Issue</a>
        </p>
      `;
      
      await notifyStaff(
        'An Issue was Resolved in ITCPR Staff Portal',
        message,
        user?.uid
      );
      
      await loadIssue();
      toast.success('Issue resolved successfully');
    } catch (error) {
      console.error('Error resolving issue:', error);
      toast.error('Error resolving issue. Please try again.');
    } finally {
      setResolvingIssue(false);
    }
  };

  const handleUnresolveIssue = async () => {
    setUnresolvingIssue(true);
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'issues', id), { resolvedAt: null });
      
      const issueUrl = `${window.location.origin}/issues/${id}`;
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> marked an issue as unresolved in the ITCPR Staff Portal.</p>
        <p><b>Issue:</b> ${issue?.title || 'N/A'}</p>
        <p><b>Status:</b> Pending</p>
        ${issue?.description ? `<p><b>Description:</b><br>${issue.description.replace(/\n/g, '<br>')}</p>` : ''}
        <p>
          <a href="${issueUrl}">View Issue</a>
        </p>
      `;
      
      await notifyStaff(
        'An Issue was Unresolved in ITCPR Staff Portal',
        message,
        user?.uid
      );
      
      await loadIssue();
      toast.success('Issue marked as unresolved');
    } catch (error) {
      console.error('Error unresolving issue:', error);
      toast.error('Error unresolving issue. Please try again.');
    } finally {
      setUnresolvingIssue(false);
    }
  };

  const handleAddComment = async (comment) => {
    try {
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'issues', id, 'comments'), {
        comment,
        userId: user.uid,
        userName: userData?.name || userData?.displayName || user?.email || 'Unknown',
        createdAt: serverTimestamp()
      });

      const issueUrl = `${window.location.origin}/issues/${id}`;
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> added a comment to an issue in the ITCPR Staff Portal.</p>
        <p><b>Issue:</b> ${issue?.title || 'N/A'}</p>
        <p><b>Comment:</b><br>${comment.replace(/\n/g, '<br>')}</p>
        <p>
          <a href="${issueUrl}">View Issue</a>
        </p>
      `;

      await notifyStaff(
        'A New Comment was Created in ITCPR Staff Portal',
        message,
        user?.uid
      );

      await loadComments();
      setShowCommentModal(false);
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment. Please try again.');
    }
  };

  const handleEditComment = async (commentId, comment) => {
    try {
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'issues', id, 'comments', commentId), {
        comment,
        updatedAt: serverTimestamp()
      });

      const issueUrl = `${window.location.origin}/issues/${id}`;
      const message = `
        <p><b>${userData?.name || userData?.displayName || user?.email || 'Unknown'}</b> edited a comment on an issue in the ITCPR Staff Portal.</p>
        <p><b>Issue:</b> ${issue?.title || 'N/A'}</p>
        <p><b>Updated Comment:</b><br>${comment.replace(/\n/g, '<br>')}</p>
        <p>
          <a href="${issueUrl}">View Issue</a>
        </p>
      `;

      await notifyStaff(
        'A Comment was Edited in ITCPR Staff Portal',
        message,
        user?.uid
      );

      await loadComments();
      setShowCommentModal(false);
      setEditingComment(null);
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Error editing comment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Issue</h3>
        </div>
      </div>
    );
  }

  if (!issue) {
    return null;
  }

  const isResolved = issue.resolvedAt;
  const isIssue = issue.type === 'issue';
  const isAdmin = userData?.type === 'admin';

  return (
    <div className="container">
      <div className={styles.issueDetailPage}>
        <div className={styles.pageHeader}>
          <button className={styles.btnBack} onClick={() => navigate('/issues')}>
            <span className="material-icons">arrow_back</span>
            Back to Issues
          </button>
          {isAdmin && (
            <div className={styles.issueActions}>
              {isIssue && !isResolved && (
                <button 
                  className={styles.btnResolve} 
                  onClick={handleResolveIssue}
                  disabled={resolvingIssue || unresolvingIssue}
                >
                  {resolvingIssue ? (
                    <>
                      <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                      Resolving...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">check_circle</span>
                      Resolve
                    </>
                  )}
                </button>
              )}
              {isIssue && isResolved && (
                <button 
                  className={styles.btnUnresolve} 
                  onClick={handleUnresolveIssue}
                  disabled={resolvingIssue || unresolvingIssue}
                >
                  {unresolvingIssue ? (
                    <>
                      <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                      Unresolving...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">cancel</span>
                      Unresolve
                    </>
                  )}
                </button>
              )}
              <button 
                className={styles.btnEdit} 
                onClick={() => setShowEditModal(true)}
                disabled={resolvingIssue || unresolvingIssue}
              >
                <span className="material-icons">edit</span>
                Edit
              </button>
              <button 
                className={styles.btnDelete} 
                onClick={() => setShowDeleteModal(true)}
                disabled={resolvingIssue || unresolvingIssue}
              >
                <span className="material-icons">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>

        <div className={styles.issueContent}>
          <div className={styles.issueHeader}>
            <h1>{issue.title}</h1>
            <div className={styles.issueMetaRow}>
              <div className={styles.issueMeta}>
                <div className={styles.issueDate}>
                  {issue.date ? (
                    <>
                      <span className="material-icons">event</span>
                      Event Date: {formatEventDate(issue.date, issue.time, issue.timezone)}
                    </>
                  ) : (
                    <>
                      <span className="material-icons">schedule</span>
                      Created: {formatDate(issue.createdAt)}
                    </>
                  )}
                </div>
                {isIssue && (
                  <div className={`${styles.issueStatus} ${styles[isResolved ? 'resolved' : 'pending']}`}>
                    {isResolved ? 'Resolved' : 'Pending'}
                  </div>
                )}
              </div>
              {issue.userName && (
                <div className={styles.issueCreator}>
                  <span className="material-icons">person</span>
                  Created by: {issue.userName}
                </div>
              )}
              {isResolved && (
                <div className={styles.issueResolved}>
                  Resolved: {formatDate(issue.resolvedAt)}
                </div>
              )}
            </div>
            <div className={styles.issueDescription}>
              <b>Description:</b> {issue.description}
            </div>
          </div>

          <div className={styles.commentsSection}>
            <div className={styles.commentsHeader}>
              <h2>Comments</h2>
              <button className={styles.btnAddComment} onClick={() => setShowCommentModal(true)}>
                <span className="material-icons">add</span>
                Add Comment
              </button>
            </div>
            <div className={styles.commentsList}>
              {comments.length === 0 ? (
                <div className={styles.emptyComments}>
                  <span className="material-icons">inbox</span>
                  <p>No comments found</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className={styles.commentCard}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentUser}>
                        <span className="material-icons">person</span>
                        <b>{comment.userName}</b> commented on {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <div 
                      className={styles.commentContent}
                      dangerouslySetInnerHTML={{ __html: formatContent(comment.comment) }}
                    />
                    {comment.userId === user?.uid && (
                      <div className={styles.commentActions}>
                        <button 
                          className={styles.btnEditComment}
                          onClick={() => {
                            setEditingComment(comment);
                            setShowCommentModal(true);
                          }}
                          disabled={deletingCommentId === comment.id}
                        >
                          <span className="material-icons">edit</span>
                          Edit
                        </button>
                        <button 
                          className={styles.btnDeleteComment}
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id}
                        >
                          {deletingCommentId === comment.id ? (
                            <>
                              <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <span className="material-icons">delete</span>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <IssueModal
          issue={{ ...issue, isEdit: true }}
          onClose={() => {
            setShowEditModal(false);
            setSavingIssue(false);
          }}
          onSave={handleEditIssue}
          saving={savingIssue}
        />
      )}

      {showCommentModal && (
        <CommentModal
          issueId={id}
          comment={editingComment}
          onClose={() => {
            setShowCommentModal(false);
            setEditingComment(null);
          }}
          onSave={editingComment 
            ? (comment) => handleEditComment(editingComment.id, comment)
            : handleAddComment
          }
        />
      )}

      {showDeleteModal && (
        <DeleteIssueModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteIssue}
          deleting={deletingIssue}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingCommentId(null);
        }}
        onConfirm={() => {
          if (pendingCommentId) {
            executeDeleteComment(pendingCommentId);
          }
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
      />
    </div>
  );
};

export default IssueDetail;

