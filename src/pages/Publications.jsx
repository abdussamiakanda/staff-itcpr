import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import PublicationModal from '../components/PublicationModal';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './Publications.module.css';

const Publications = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPublication, setEditingPublication] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPublicationId, setDeletingPublicationId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const { data: publicationsData, error: fetchError } = await supabaseClient
        .from('publications')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Sort by date (year + month) with newest first
      const sortedPublications = (publicationsData || []).sort((a, b) => {
        // Convert month name to number for proper sorting
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        const monthA = monthNames.indexOf(a.month || '');
        const monthB = monthNames.indexOf(b.month || '');
        
        // Compare by year first, then by month
        if (b.year !== a.year) {
          return (b.year || 0) - (a.year || 0);
        }
        return (monthB >= 0 ? monthB : 0) - (monthA >= 0 ? monthA : 0);
      });

      setPublications(sortedPublications);
    } catch (error) {
      console.error('Error loading publications:', error);
      toast.error('Error loading publications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPublication(null);
    setShowModal(true);
  };

  const handleEdit = (id) => {
    const publication = publications.find(p => p.id === id);
    setEditingPublication(publication);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeletingPublicationId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPublicationId) return;

    setDeleting(true);
    try {
      const { error } = await supabaseServiceClient
        .from('publications')
        .delete()
        .eq('id', deletingPublicationId);

      if (error) {
        throw error;
      }

      toast.success('Publication deleted successfully');
      await loadPublications();
      setShowDeleteDialog(false);
      setDeletingPublicationId(null);
    } catch (error) {
      console.error('Error deleting publication:', error);
      toast.error('Error deleting publication. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPublication(null);
  };

  const handleSave = async (formData) => {
    try {
      if (editingPublication) {
        const { error } = await supabaseServiceClient
          .from('publications')
          .update([formData])
          .eq('id', editingPublication.id);

        if (error) throw error;
        toast.success('Publication updated successfully');
      } else {
        const { error } = await supabaseServiceClient
          .from('publications')
          .insert([formData]);

        if (error) throw error;
        toast.success('Publication added successfully');
      }
      await loadPublications();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving publication:', error);
      toast.error(editingPublication ? 'Error updating publication. Please try again.' : 'Error adding publication. Please try again.');
    }
  };

  // Filter publications
  const filteredPublications = publications.filter(pub => {
    const matchesSearch = !searchQuery || 
      (pub.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pub.authors || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pub.journal || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !filterType || pub.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Get unique publication types for filter
  const publicationTypes = [...new Set(publications.map(p => p.type).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Publications</h3>
          <p>Please wait while we fetch the publications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.publicationsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Publications Management</h2>
            <p>Manage all the publications of ITCPR</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnAddPublication} onClick={handleAdd}>
              <span className="material-icons">add</span>
              Add Publication
            </button>
            <button className={styles.btnRefresh} onClick={loadPublications}>
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
              placeholder="Search by title, authors, or journal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.typeFilter}>
            <select
              id="typeFilter"
              className={styles.typeFilterSelect}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              {publicationTypes.length === 0 ? (
                <option value="" disabled>No types available</option>
              ) : (
                publicationTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className={styles.publicationsList}>
          {filteredPublications.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">article</span>
              <h3>No Publications Found</h3>
              <p>{searchQuery || filterType ? 'Try adjusting your filters or search query.' : 'No publications have been added yet.'}</p>
            </div>
          ) : (
            filteredPublications.map((pub) => (
              <div key={pub.id} className={styles.publicationCard}>
                <div className={styles.publicationHeader}>
                  <div className={styles.publicationTags}>
                    <span className={styles.publicationTag}>{pub.type || 'Publication'}</span>
                    <span className={styles.publicationTag}>{pub.month} {pub.year}</span>
                    {pub.group && (
                      <span className={styles.publicationTag}>{pub.group}</span>
                    )}
                  </div>
                  <div className={styles.publicationActions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => handleEdit(pub.id)}
                      title="Edit publication"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDelete(pub.id)}
                      title="Delete publication"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                </div>
                <div className={styles.publicationContent}>
                  <p>
                    <b>{pub.title}</b>, {pub.authors}, {pub.journal}
                    {pub.doi && (
                      <a 
                        href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.doiLink}
                      >
                        {' '}Read more...
                      </a>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <PublicationModal
          publication={editingPublication}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingPublicationId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Publication"
        message="Are you sure you want to delete this publication? This action cannot be undone."
      />
    </div>
  );
};

export default Publications;

