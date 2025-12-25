import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import styles from './PublicationModal.module.css';

const PublicationModal = ({ publication, onClose, onSave }) => {
  const { userData } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  
  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    month: '',
    year: '',
    journal: '',
    type: '',
    doi: '',
    group: ''
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const groupsRef = collection(db, 'groups');
      const querySnapshot = await getDocs(groupsRef);
      
      const groupsList = [];
      querySnapshot.forEach((doc) => {
        const groupData = doc.data();
        const groupName = doc.id; // Use document ID as group name
        groupsList.push({
          id: doc.id,
          name: groupName,
          displayName: groupData.name || capitalize(groupName)
        });
      });

      // Sort groups alphabetically
      groupsList.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setGroups(groupsList);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (publication) {
      // Convert publication group to lowercase to match dropdown values
      const publicationGroup = publication.group ? publication.group.toLowerCase() : '';
      setFormData({
        title: publication.title || '',
        authors: publication.authors || '',
        month: publication.month || '',
        year: publication.year?.toString() || '',
        journal: publication.journal || '',
        type: publication.type || '',
        doi: publication.doi || '',
        group: publicationGroup
      });
    } else {
      // Set default group from userData if available
      const defaultGroup = userData?.group ? userData.group.toLowerCase() : '';
      setFormData({
        title: '',
        authors: '',
        month: '',
        year: '',
        journal: '',
        type: '',
        doi: '',
        group: defaultGroup
      });
    }
  }, [publication, userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.authors || !formData.group || !formData.month || 
        !formData.year || !formData.journal || !formData.type) {
      return;
    }

    const publicationData = {
      ...formData,
      year: parseInt(formData.year),
      group: capitalize(formData.group)
    };

    onSave(publicationData);
  };

  const isEdit = !!publication;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const publicationTypes = [
    'Journal Paper',
    'Conference Paper',
    'Conference Talk',
    'Poster',
    'Book',
    'Thesis',
    'Technical Report',
    'Other'
  ];

  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Publication</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form id="publicationForm" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Publication title"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="authors">Authors <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="authors"
                name="authors"
                value={formData.authors}
                onChange={handleChange}
                required
                placeholder="Author1, Author2, ..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="group">Group <span className={styles.required}>*</span></label>
              <select
                id="group"
                name="group"
                value={formData.group}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Group</option>
                {loadingGroups ? (
                  <option value="" disabled>Loading groups...</option>
                ) : (
                  groups.map(group => (
                    <option key={group.id} value={group.name}>
                      {group.displayName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="month">Month <span className={styles.required}>*</span></label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select Month</option>
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="year">Year <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  min="2000"
                  max={currentYear + 10}
                  placeholder={currentYear.toString()}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="type">Publication Type <span className={styles.required}>*</span></label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Type</option>
                {publicationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="journal">Journal/Conference <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="journal"
                name="journal"
                value={formData.journal}
                onChange={handleChange}
                required
                placeholder="Journal or Conference name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="doi">DOI/URL</label>
              <input
                type="text"
                id="doi"
                name="doi"
                value={formData.doi}
                onChange={handleChange}
                placeholder="https://doi.org/10.1234/example or full URL"
              />
            </div>
          </form>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="submit"
            form="publicationForm"
            className={styles.btnPrimary}
          >
            {isEdit ? 'Update' : 'Add'} Publication
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

export default PublicationModal;

