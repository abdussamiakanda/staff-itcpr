import React, { useState, useEffect } from 'react';
import styles from './ScheduleItemModal.module.css';

const ScheduleItemModal = ({ scheduleItem, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    time: '',
    title: '',
    description: '',
    type: 'Lecture',
    level: 'Beginner',
    room: '',
    timezone: 'Asia/Dhaka',
    speaker: {
      name: '',
      title: '',
      organization: '',
      bio: '',
      topics: []
    },
    tags: [],
    video_link: ''
  });

  const [newTopic, setNewTopic] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (scheduleItem) {
      setFormData({
        time: scheduleItem.time || '',
        title: scheduleItem.title || '',
        description: scheduleItem.description || '',
        type: scheduleItem.type || 'Lecture',
        level: scheduleItem.level || 'Beginner',
        room: scheduleItem.room || '',
        timezone: scheduleItem.timezone || 'Asia/Dhaka',
        speaker: scheduleItem.speaker || {
          name: '',
          title: '',
          organization: '',
          bio: '',
          topics: []
        },
        tags: scheduleItem.tags || [],
        video_link: scheduleItem.video_link || ''
      });
      if (scheduleItem.speaker?.topics) {
        setFormData(prev => ({
          ...prev,
          speaker: {
            ...prev.speaker,
            topics: scheduleItem.speaker.topics
          }
        }));
      }
    }
  }, [scheduleItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSpeakerChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      speaker: {
        ...prev.speaker,
        [field]: value
      }
    }));
  };

  const handleTopicAdd = () => {
    if (!newTopic.trim()) return;
    setFormData(prev => ({
      ...prev,
      speaker: {
        ...prev.speaker,
        topics: [...prev.speaker.topics, newTopic.trim()]
      }
    }));
    setNewTopic('');
  };

  const handleTopicRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      speaker: {
        ...prev.speaker,
        topics: prev.speaker.topics.filter((_, i) => i !== index)
      }
    }));
  };

  const handleTagAdd = () => {
    if (!newTag.trim()) return;
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }));
    setNewTag('');
  };

  const handleTagRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.time || !formData.title) {
      return;
    }
    
    // If type is Break, clear fields that don't apply
    const dataToSave = formData.type === 'Break' 
      ? {
          ...formData,
          level: '',
          room: '',
          tags: [],
          speaker: {
            name: '',
            title: '',
            organization: '',
            bio: '',
            topics: []
          }
        }
      : formData;
    
    onSave(dataToSave);
  };

  const isEdit = !!scheduleItem;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Schedule Item</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form id="scheduleForm" onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="time">Time <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  placeholder="10:00 AM - 10:45 AM"
                />
                <small style={{ color: '#666', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                  Default timezone: Asia/Dhaka
                </small>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="title">Title <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Session title"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Session description"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Lecture">Lecture</option>
                  <option value="Practical">Practical</option>
                  <option value="Break">Break</option>
                </select>
              </div>
              {formData.type !== 'Break' && (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="level">Level</label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="room">Room</label>
                    <input
                      type="text"
                      id="room"
                      name="room"
                      value={formData.room}
                      onChange={handleChange}
                      placeholder="Room 302"
                    />
                  </div>
                </>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="video_link">Video Link</label>
              <input
                type="url"
                id="video_link"
                name="video_link"
                value={formData.video_link}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            {formData.type !== 'Break' && (
              <>
                <div className={styles.speakerSection}>
                  <h4>Speaker</h4>
                  <div className={styles.formGroup}>
                    <label htmlFor="speakerName">Speaker Name</label>
                    <input
                      type="text"
                      id="speakerName"
                      value={formData.speaker.name}
                      onChange={(e) => handleSpeakerChange('name', e.target.value)}
                      placeholder="Speaker name"
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="speakerTitle">Speaker Title</label>
                      <input
                        type="text"
                        id="speakerTitle"
                        value={formData.speaker.title}
                        onChange={(e) => handleSpeakerChange('title', e.target.value)}
                        placeholder="Speaker title"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="speakerOrg">Organization</label>
                      <input
                        type="text"
                        id="speakerOrg"
                        value={formData.speaker.organization}
                        onChange={(e) => handleSpeakerChange('organization', e.target.value)}
                        placeholder="Organization"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="speakerBio">Speaker Bio</label>
                    <textarea
                      id="speakerBio"
                      value={formData.speaker.bio}
                      onChange={(e) => handleSpeakerChange('bio', e.target.value)}
                      rows="2"
                      placeholder="Speaker biography"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Speaker Topics</label>
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
                      {formData.speaker.topics.map((topic, index) => (
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
                </div>

                <div className={styles.formGroup}>
                  <label>Tags</label>
                  <div className={styles.arrayInput}>
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                      placeholder="Add tag"
                    />
                    <button
                      type="button"
                      onClick={handleTagAdd}
                      className={styles.btnAdd}
                    >
                      Add
                    </button>
                  </div>
                  <div className={styles.arrayList}>
                    {formData.tags.map((tag, index) => (
                      <div key={index} className={styles.arrayItem}>
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleTagRemove(index)}
                          className={styles.btnRemove}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="submit"
            form="scheduleForm"
            className={styles.btnPrimary}
          >
            {isEdit ? 'Update' : 'Add'} Schedule Item
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

export default ScheduleItemModal;

