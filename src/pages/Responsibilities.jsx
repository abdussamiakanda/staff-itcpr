import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import styles from './Responsibilities.module.css';

const Responsibilities = () => {
  const [responsibilities, setResponsibilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadResponsibilities();
  }, []);

  const loadResponsibilities = async () => {
    setLoading(true);
    try {
      const responsibilitiesRef = collection(db, 'responsibilities');
      const q = query(responsibilitiesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const responsibilitiesData = [];
      querySnapshot.forEach((doc) => {
        responsibilitiesData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setResponsibilities(responsibilitiesData);
    } catch (error) {
      console.error('Error loading responsibilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      // Firestore timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // Already a Date object
      date = timestamp;
    } else {
      // String or number timestamp
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter responsibilities
  const filteredResponsibilities = responsibilities.filter(resp => {
    const matchesSearch = !searchQuery || 
      (resp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Responsibilities</h3>
          <p>Please wait while we fetch the responsibilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.responsibilitiesSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Staff Responsibilities</h2>
            <p>Policies, procedures, and guidelines for staff tasks</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnRefresh} onClick={loadResponsibilities}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Search responsibilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.responsibilitiesGrid}>
          {filteredResponsibilities.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">description</span>
              <h3>No Responsibilities Found</h3>
              <p>{searchQuery ? 'Try adjusting your search query.' : 'No responsibilities have been added yet.'}</p>
            </div>
          ) : (
            filteredResponsibilities.map((resp) => (
              <div key={resp.id} className={styles.responsibilityCard}>
                <div className={styles.responsibilityHeader}>
                  <h3>{resp.title}</h3>
                  <div className={styles.responsibilityMeta}>
                    {resp.category && (
                      <span className={styles.responsibilityCategory}>
                        {resp.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                    {resp.createdAt && (
                      <div className={styles.responsibilityDate}>
                        <span className="material-icons">schedule</span>
                        {formatDate(resp.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.responsibilityContent}>
                  <p>{resp.description}</p>
                  {resp.steps && resp.steps.length > 0 && (
                    <div className={styles.responsibilitySteps}>
                      <h4>Steps:</h4>
                      <ol>
                        {resp.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {resp.notes && (
                    <div className={styles.responsibilityNotes}>
                      <h4>Notes:</h4>
                      <p>{resp.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Responsibilities;


