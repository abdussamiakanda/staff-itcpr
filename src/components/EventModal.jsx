import React, { useState, useEffect } from 'react';
import styles from './EventModal.module.css';

const EventModal = ({ event, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subtitle: '',
    type: 'Seminar',
    status: 'Upcoming',
    published: false,
    date: '',
    time: '',
    location: '',
    room: '',
    language: 'English',
    price: '',
    capacity: '',
    overview: '',
    learning_objectives: [],
    target_audience: [],
    prerequisites: [],
    materials: [],
    schedule: [],
    speakers: [],
    gallery: []
  });

  const [newLearningObjective, setNewLearningObjective] = useState('');
  const [newTargetAudience, setNewTargetAudience] = useState('');
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [newMaterial, setNewMaterial] = useState('');

  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id || '',
        title: event.title || '',
        subtitle: event.subtitle || '',
        type: event.type || 'Seminar',
        status: event.status || 'Upcoming',
        published: event.published ?? false,
        date: event.date || '',
        time: event.time || '',
        location: event.location || '',
        room: event.room || '',
        language: event.language || 'English',
        price: event.price?.toString() || '',
        capacity: event.capacity?.toString() || '',
        overview: event.overview || '',
        learning_objectives: event.learning_objectives || [],
        target_audience: event.target_audience || [],
        prerequisites: event.prerequisites || [],
        materials: event.materials || [],
        schedule: event.schedule || [], // Keep in formData but don't show in modal
        speakers: event.speakers || [], // Keep in formData but don't show in modal
        gallery: event.gallery || []
      });
    } else {
      // Generate a unique ID for new events
      const newId = `event_${Date.now()}`;
      setFormData(prev => ({ ...prev, id: newId }));
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayAdd = (field, value, setter) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    setter('');
  };

  const handleArrayRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.type || !formData.date) {
      return;
    }

    const eventData = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null
    };

    onSave(eventData);
  };

  const isEdit = !!event;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Event</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form id="eventForm" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className={styles.formSection}>
              <h4>Basic Information</h4>
              <div className={styles.formGroup}>
                <label htmlFor="id">Event ID <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  required
                  placeholder="event1, seminar1, etc."
                />
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
                  placeholder="Event title"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="subtitle">Subtitle</label>
                <input
                  type="text"
                  id="subtitle"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="Event subtitle"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="type">Type <span className={styles.required}>*</span></label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                  >
                    <option value="Seminar">Seminar</option>
                    <option value="Workshop">Workshop</option>
                    <option value="School">School</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="published" className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id="published"
                    name="published"
                    checked={formData.published}
                    onChange={handleChange}
                  />
                  <span>Published</span>
                </label>
              </div>
            </div>

            {/* Date & Location */}
            <div className={styles.formSection}>
              <h4>Date & Location</h4>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="date">Date <span className={styles.required}>*</span></label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="time">Time</label>
                  <input
                    type="text"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    placeholder="10:00 AM - 2:00 PM"
                  />
                  <small style={{ color: '#666', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                    Default timezone: Asia/Dhaka
                  </small>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="location">Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="ITCPR Conference Hall"
                  />
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
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="language">Language</label>
                  <input
                    type="text"
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    placeholder="English"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="price">Price</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="capacity">Capacity</label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  placeholder="100"
                />
              </div>
            </div>

            {/* Overview */}
            <div className={styles.formSection}>
              <h4>Overview</h4>
              <div className={styles.formGroup}>
                <label htmlFor="overview">Overview</label>
                <textarea
                  id="overview"
                  name="overview"
                  value={formData.overview}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Event overview description..."
                />
              </div>
            </div>

            {/* Learning Objectives */}
            <div className={styles.formSection}>
              <h4>Learning Objectives</h4>
              <div className={styles.arrayInput}>
                <input
                  type="text"
                  value={newLearningObjective}
                  onChange={(e) => setNewLearningObjective(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayAdd('learning_objectives', newLearningObjective, setNewLearningObjective))}
                  placeholder="Add learning objective"
                />
                <button
                  type="button"
                  onClick={() => handleArrayAdd('learning_objectives', newLearningObjective, setNewLearningObjective)}
                  className={styles.btnAdd}
                >
                  Add
                </button>
              </div>
              <div className={styles.arrayList}>
                {formData.learning_objectives.map((item, index) => (
                  <div key={index} className={styles.arrayItem}>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('learning_objectives', index)}
                      className={styles.btnRemove}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className={styles.formSection}>
              <h4>Target Audience</h4>
              <div className={styles.arrayInput}>
                <input
                  type="text"
                  value={newTargetAudience}
                  onChange={(e) => setNewTargetAudience(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayAdd('target_audience', newTargetAudience, setNewTargetAudience))}
                  placeholder="Add target audience"
                />
                <button
                  type="button"
                  onClick={() => handleArrayAdd('target_audience', newTargetAudience, setNewTargetAudience)}
                  className={styles.btnAdd}
                >
                  Add
                </button>
              </div>
              <div className={styles.arrayList}>
                {formData.target_audience.map((item, index) => (
                  <div key={index} className={styles.arrayItem}>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('target_audience', index)}
                      className={styles.btnRemove}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Prerequisites */}
            <div className={styles.formSection}>
              <h4>Prerequisites</h4>
              <div className={styles.arrayInput}>
                <input
                  type="text"
                  value={newPrerequisite}
                  onChange={(e) => setNewPrerequisite(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayAdd('prerequisites', newPrerequisite, setNewPrerequisite))}
                  placeholder="Add prerequisite"
                />
                <button
                  type="button"
                  onClick={() => handleArrayAdd('prerequisites', newPrerequisite, setNewPrerequisite)}
                  className={styles.btnAdd}
                >
                  Add
                </button>
              </div>
              <div className={styles.arrayList}>
                {formData.prerequisites.map((item, index) => (
                  <div key={index} className={styles.arrayItem}>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('prerequisites', index)}
                      className={styles.btnRemove}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div className={styles.formSection}>
              <h4>Materials</h4>
              <div className={styles.arrayInput}>
                <input
                  type="text"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayAdd('materials', newMaterial, setNewMaterial))}
                  placeholder="Add material requirement"
                />
                <button
                  type="button"
                  onClick={() => handleArrayAdd('materials', newMaterial, setNewMaterial)}
                  className={styles.btnAdd}
                >
                  Add
                </button>
              </div>
              <div className={styles.arrayList}>
                {formData.materials.map((item, index) => (
                  <div key={index} className={styles.arrayItem}>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('materials', index)}
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
            form="eventForm"
            className={styles.btnPrimary}
          >
            {isEdit ? 'Update' : 'Add'} Event
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

export default EventModal;

