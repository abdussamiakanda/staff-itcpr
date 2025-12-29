import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import ResponsibilityModal from '../components/ResponsibilityModal';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import styles from './Responsibilities.module.css';

const Responsibilities = () => {
  const [responsibilities, setResponsibilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingResponsibility, setEditingResponsibility] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingResponsibilityId, setDeletingResponsibilityId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleAdd = () => {
    setEditingResponsibility(null);
    setShowModal(true);
  };

  const handleEdit = (id) => {
    const responsibility = responsibilities.find(r => r.id === id);
    setEditingResponsibility(responsibility);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeletingResponsibilityId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingResponsibilityId) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'responsibilities', deletingResponsibilityId));
      toast.success('Responsibility deleted successfully');
      await loadResponsibilities();
      setShowDeleteDialog(false);
      setDeletingResponsibilityId(null);
    } catch (error) {
      console.error('Error deleting responsibility:', error);
      toast.error('Error deleting responsibility. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingResponsibility(null);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const responsibilityData = {
        ...formData,
        createdAt: editingResponsibility ? editingResponsibility.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingResponsibility) {
        await updateDoc(doc(db, 'responsibilities', editingResponsibility.id), responsibilityData);
        toast.success('Responsibility updated successfully');
      } else {
        await addDoc(collection(db, 'responsibilities'), responsibilityData);
        toast.success('Responsibility added successfully');
      }
      
      await loadResponsibilities();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving responsibility:', error);
      toast.error('Error saving responsibility. Please try again.');
    } finally {
      setSaving(false);
    }
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
            <button className={styles.btnAddResponsibility} onClick={handleAdd}>
              <span className="material-icons">add</span>
              Add Responsibility
            </button>
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
                <div className={styles.responsibilityActions}>
                  <button 
                    className={styles.btnEdit}
                    onClick={() => handleEdit(resp.id)}
                  >
                    <span className="material-icons">edit</span>
                    Edit
                  </button>
                  <button 
                    className={styles.btnDelete}
                    onClick={() => handleDelete(resp.id)}
                  >
                    <span className="material-icons">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <ResponsibilityModal
          responsibility={editingResponsibility}
          onClose={handleCloseModal}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeletingResponsibilityId(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Responsibility"
          message="Are you sure you want to delete this responsibility? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default Responsibilities;


