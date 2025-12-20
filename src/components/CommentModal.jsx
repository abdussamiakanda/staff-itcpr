import React, { useState, useEffect } from 'react';
import styles from './CommentModal.module.css';

const CommentModal = ({ issueId, comment, onClose, onSave }) => {
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (comment) {
      setCommentText(comment.comment || '');
    }
  }, [comment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || saving) {
      return;
    }
    setSaving(true);
    try {
      await onSave(commentText.trim());
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!comment;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Comment</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit} id="commentForm">
            <div className={styles.formGroup}>
              <label htmlFor="comment">Comment *</label>
              <textarea
                id="comment"
                name="comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className={styles.formControl}
                rows="4"
                required
              />
            </div>
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button 
            type="submit" 
            form="commentForm" 
            className={styles.btnPrimary}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                {isEdit ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                {isEdit ? 'Update' : 'Add'} Comment
              </>
            )}
          </button>
          <button 
            type="button" 
            className={styles.btnOutline} 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;

