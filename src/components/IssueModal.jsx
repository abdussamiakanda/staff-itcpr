import React, { useState, useEffect } from 'react';
import styles from './IssueModal.module.css';

const IssueModal = ({ issue, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'issue',
    date: '',
    time: '',
    timezone: ''
  });

  useEffect(() => {
    if (issue && !issue.isEdit) {
      return;
    }
    if (issue && issue.isEdit) {
      setFormData({
        title: issue.title || '',
        description: issue.description || '',
        type: issue.type || 'issue',
        date: issue.date || '',
        time: issue.time || '',
        timezone: issue.timezone || ''
      });
    }
  }, [issue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      return;
    }
    onSave(formData);
  };

  const isEdit = issue && issue.isEdit;
  const isEvent = formData.type === 'event';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Issue/Event</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit} id="issueForm">
            <div className={styles.formGroup}>
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={styles.formControl}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.formControl}
                rows="4"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={styles.formControl}
                required
              >
                <option value="issue">Issue</option>
                <option value="event">Event</option>
              </select>
            </div>

            {isEvent && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={styles.formControl}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="time">Time</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className={styles.formControl}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button type="submit" form="issueForm" className={styles.btnPrimary}>
            {isEdit ? 'Save Changes' : 'Add Issue/Event'}
          </button>
          <button type="button" className={styles.btnOutline} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueModal;

