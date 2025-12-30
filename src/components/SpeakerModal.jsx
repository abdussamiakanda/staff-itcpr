import React, { useState, useEffect } from 'react';
import styles from './SpeakerModal.module.css';

const SpeakerModal = ({ speaker, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    organization: '',
    bio: '',
    topics: []
  });

  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    if (speaker) {
      setFormData({
        name: speaker.name || '',
        title: speaker.title || '',
        organization: speaker.organization || '',
        bio: speaker.bio || '',
        topics: speaker.topics || []
      });
    }
  }, [speaker]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTopicAdd = () => {
    if (!newTopic.trim()) return;
    setFormData(prev => ({
      ...prev,
      topics: [...prev.topics, newTopic.trim()]
    }));
    setNewTopic('');
  };

  const handleTopicRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      return;
    }
    onSave(formData);
  };

  const isEdit = !!speaker;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Speaker</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form id="speakerForm" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Name <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Speaker name"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Speaker title"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="organization">Organization</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="Organization"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                placeholder="Speaker biography"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Topics</label>
              <div className={styles.arrayInput}>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTopicAdd())}
                  placeholder="Add topic"
                />
                <button
                  type="button"
                  onClick={handleTopicAdd}
                  className={styles.btnAdd}
                >
                  Add
                </button>
              </div>
              <div className={styles.arrayList}>
                {formData.topics.map((topic, index) => (
                  <div key={index} className={styles.arrayItem}>
                    <span>{topic}</span>
                    <button
                      type="button"
                      onClick={() => handleTopicRemove(index)}
                      className={styles.btnRemove}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="submit"
            form="speakerForm"
            className={styles.btnPrimary}
          >
            {isEdit ? 'Update' : 'Add'} Speaker
          </button>
          <button
            type="button"
            className={styles.btnOutline}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpeakerModal;

