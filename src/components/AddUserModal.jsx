import React, { useState } from 'react';
import styles from './AddUserModal.module.css';

const AddUserModal = ({ onClose, onAdd, adding }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    group: '',
    role: '',
    university: '',
    major: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.group || !formData.role) {
      return;
    }
    onAdd(formData);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>&times;</button>
        
        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <h2>Add New User</h2>
            <p>Enter user information to create a new account.</p>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.addUserForm}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.formControl}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Personal Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.formControl}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="group">Group *</label>
                <select
                  id="group"
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                >
                  <option value="">Select a group...</option>
                  <option value="spintronics">Spintronics</option>
                  <option value="photonics">Photonics</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                >
                  <option value="">Select a role...</option>
                  <option value="member">Member</option>
                  <option value="collaborator">Collaborator</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="university">University</label>
                <input
                  type="text"
                  id="university"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  className={styles.formControl}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="major">Major</label>
                <input
                  type="text"
                  id="major"
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  className={styles.formControl}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button 
                type="submit" 
                className={styles.btnPrimary}
                disabled={adding}
              >
                {adding ? (
                  <>
                    <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                    Adding User...
                  </>
                ) : (
                  <>
                    <span className="material-icons">person_add</span>
                    Add User
                  </>
                )}
              </button>
              <button 
                type="button" 
                className={styles.btnSecondary} 
                onClick={onClose}
                disabled={adding}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;

