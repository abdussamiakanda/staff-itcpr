import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { markdownToHtml } from '../utils/email';
import ConfirmDialog from './ConfirmDialog';
import styles from './IssueDetailsModal.module.css';

const IssueDetailsModal = ({ 
  issue, 
  onClose, 
  onEdit, 
  onDelete, 
  onResolve, 
  onUnresolve,
  onAddComment,
  onEditComment,
  onDeleteComment,
  formatDate,
  formatEventDate,
  isAdmin,
  currentUserId,
  resolving,
  unresolving
}) => {
  const [comments, setComments] = useState(issue.comments || []);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCommentId, setPendingCommentId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  useEffect(() => {
    loadComments();
  }, [issue.id]);

  // Reload comments when issue.comments changes (after adding/editing)
  useEffect(() => {
    if (issue.comments) {
      setComments(issue.comments);
    }
  }, [issue.comments]);

  const loadComments = async () => {
    try {
      const commentsRef = collection(db, 'issues', issue.id, 'comments');
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
      await onDeleteComment(issue.id, commentId);
      await loadComments();
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error deleting comment. Please try again.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const isResolved = issue.resolvedAt;
  const isIssue = issue.type === 'issue';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTop}>
            <button className={styles.btnBack} onClick={onClose}>
              <span className="material-icons">arrow_back</span>
              Back to Issues
            </button>
            {isAdmin && (
              <div className={styles.issueActions}>
                {isIssue && !isResolved && (
                  <button 
                    className={styles.btnResolve} 
                    onClick={() => onResolve(issue.id)}
                    disabled={resolving || unresolving}
                  >
                    {resolving ? (
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
                    onClick={() => onUnresolve(issue.id)}
                    disabled={resolving || unresolving}
                  >
                    {unresolving ? (
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
                  onClick={() => onEdit(issue)}
                  disabled={resolving || unresolving}
                >
                  <span className="material-icons">edit</span>
                  Edit
                </button>
                <button 
                  className={styles.btnDelete} 
                  onClick={onDelete}
                  disabled={resolving || unresolving}
                >
                  <span className="material-icons">delete</span>
                  Delete
                </button>
              </div>
            )}
          </div>
          <div className={styles.issueHeader}>
            <h2>{issue.title}</h2>
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
        </div>

        <div className={styles.modalBody}>
          <div className={styles.commentsSection}>
            <div className={styles.commentsHeader}>
              <h3>Comments</h3>
              <button className={styles.btnAddComment} onClick={onAddComment}>
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
                    {comment.userId === currentUserId && (
                      <div className={styles.commentActions}>
                        <button 
                          className={styles.btnEditComment}
                          onClick={() => onEditComment(comment)}
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

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingCommentId(null);
        }}
        onConfirm={() => {
          setShowConfirmDialog(false);
          if (pendingCommentId) {
            executeDeleteComment(pendingCommentId);
            setPendingCommentId(null);
          }
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
      />
    </div>
  );
};

export default IssueDetailsModal;

