import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import PublicationModal from '../components/PublicationModal';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './Publications.module.css';

const Publications = () => {
  const [publications, setPublications] = useState([]);
  const [projectPublications, setProjectPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjectPublications, setLoadingProjectPublications] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPublication, setEditingPublication] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [publicationView, setPublicationView] = useState('regular'); // 'regular' or 'project'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPublicationId, setDeletingPublicationId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPublications();
    loadProjectPublications();
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

  // Load project publications from Firestore
  const loadProjectPublications = async () => {
    setLoadingProjectPublications(true);
    try {
      // Get all groups
      const groupsRef = collection(db, 'groups');
      const groupsSnap = await getDocs(groupsRef);
      
      const allProjectPublications = [];
      
      // Iterate through each group
      for (const groupDoc of groupsSnap.docs) {
        const groupId = groupDoc.id;
        
        // Get all projects in this group
        const projectsRef = collection(db, 'groups', groupId, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        
        // Iterate through each project
        for (const projectDoc of projectsSnap.docs) {
          const projectId = projectDoc.id;
          const projectData = projectDoc.data();
          
          // Only get publications from projects (not courses)
          if (projectData.type === 'project') {
            // Get publications for this project
            const publicationsRef = collection(db, 'groups', groupId, 'projects', projectId, 'publications');
            const publicationsQuery = query(publicationsRef, orderBy('createdAt', 'desc'));
            const publicationsSnap = await getDocs(publicationsQuery);
            
            // Get author name for each publication
            const publicationsList = await Promise.all(
              publicationsSnap.docs.map(async (pubDoc) => {
                const pubData = pubDoc.data();
                let authorName = 'Unknown';
                
                if (pubData.userId) {
                  try {
                    const userDoc = await getDoc(doc(db, 'users', pubData.userId));
                    if (userDoc.exists()) {
                      authorName = userDoc.data().name || 'Unknown';
                    }
                  } catch (error) {
                    console.error('Error fetching user:', error);
                  }
                }
                
                return {
                  id: pubDoc.id,
                  ...pubData,
                  authorName,
                  projectTitle: projectData.title || 'Untitled Project',
                  projectId,
                  groupId
                };
              })
            );
            
            allProjectPublications.push(...publicationsList);
          }
        }
      }
      
      // Sort by createdAt (newest first)
      allProjectPublications.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setProjectPublications(allProjectPublications);
    } catch (error) {
      console.error('Error loading project publications:', error);
      toast.error('Error loading project publications. Please try again.');
    } finally {
      setLoadingProjectPublications(false);
    }
  };

  // Format date helper
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return timestamp;
  };

  // Get unique publication types for filter
  const publicationTypes = [...new Set(publications.map(p => p.type).filter(Boolean))].sort();
  
  // Status and type labels for project publications
  const statusColors = {
    'draft': '#9e9e9e',
    'submitted': '#ff9800',
    'under-review': '#ff5722',
    'minor-revision': '#9c27b0',
    'major-revision': '#e91e63',
    'revision-submitted': '#673ab7',
    'accepted': '#4caf50',
    'in-press': '#00bcd4',
    'published': '#009688'
  };
  
  const statusLabels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'under-review': 'Under Review',
    'minor-revision': 'Minor Revision',
    'major-revision': 'Major Revision',
    'revision-submitted': 'Revision Submitted',
    'accepted': 'Accepted',
    'in-press': 'In Press',
    'published': 'Published'
  };
  
  const typeLabels = {
    'journal-paper': 'Journal Paper',
    'conference-paper': 'Conference Paper',
    'poster': 'Poster',
    'talk': 'Talk',
    'book': 'Book',
    'thesis': 'Thesis',
    'other': 'Other'
  };

  if (loading || loadingProjectPublications) {
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
            <p>{publicationView === 'regular' ? 'Manage all the publications of ITCPR' : 'Publications from active projects'}</p>
          </div>
          {publicationView === 'regular' && (
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
          )}
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.filtersLeft}>
            {publicationView === 'regular' && (
              <>
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
              </>
            )}
          </div>
          <div className={styles.viewToggle}>
            <button
              className={publicationView === 'regular' ? styles.viewToggleBtnActive : styles.viewToggleBtn}
              onClick={() => setPublicationView('regular')}
            >
              Published
            </button>
            <button
              className={publicationView === 'project' ? styles.viewToggleBtnActive : styles.viewToggleBtn}
              onClick={() => setPublicationView('project')}
            >
              Track
            </button>
          </div>
        </div>

        {publicationView === 'regular' && (
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
                  </p>
                  {pub.doi && (
                    <div className={styles.readMoreContainer}>
                      <button
                        onClick={() => {
                          const url = pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className={styles.readMoreBtn}
                      >
                        <span className="material-icons">open_in_new</span>
                        Read more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
        )}

        {publicationView === 'project' && (
          <div className={styles.publicationsList}>
          {(() => {
            // Filter out project publications that exist in regular publications
            const filteredProjectPublications = projectPublications.filter(projectPub => {
              // Check if this project publication matches any regular publication
              return !publications.some(regularPub => {
                // Match by DOI if both have it
                if (projectPub.doiUrl && regularPub.doi) {
                  const projectDoi = projectPub.doiUrl.replace(/^https?:\/\/(doi\.org\/)?/i, '').trim();
                  const regularDoi = regularPub.doi.replace(/^https?:\/\/(doi\.org\/)?/i, '').trim();
                  if (projectDoi && regularDoi && projectDoi.toLowerCase() === regularDoi.toLowerCase()) {
                    return true;
                  }
                }
                // Match by title and authors if DOI doesn't match or is missing
                if (projectPub.title && regularPub.title && 
                    projectPub.authors && regularPub.authors) {
                  const projectTitle = projectPub.title.trim().toLowerCase();
                  const regularTitle = regularPub.title.trim().toLowerCase();
                  const projectAuthors = projectPub.authors.trim().toLowerCase();
                  const regularAuthors = regularPub.authors.trim().toLowerCase();
                  if (projectTitle === regularTitle && projectAuthors === regularAuthors) {
                    return true;
                  }
                }
                return false;
              });
            });

            if (filteredProjectPublications.length === 0) {
              return (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <span className="material-icons">menu_book</span>
                  </div>
                  <h3>No Tracked Publications</h3>
                  <p>Publications from active projects that aren't already in the published list will appear here.</p>
                </div>
              );
            }

            return filteredProjectPublications.map((pub) => (
              <div key={`project-${pub.groupId}-${pub.projectId}-${pub.id}`} className={styles.publicationCard}>
                <div className={styles.publicationHeader}>
                  <div className={styles.publicationTags}>
                    <span 
                      className={styles.publicationStatus}
                      style={{ 
                        backgroundColor: statusColors[pub.status] || '#9e9e9e',
                        color: 'white'
                      }}
                    >
                      {statusLabels[pub.status] || pub.status}
                    </span>
                    <span className={styles.publicationTag}>
                      {typeLabels[pub.type] || pub.type}
                    </span>
                  </div>
                  <span className={styles.publicationAuthor}>Added by {pub.authorName}</span>
                </div>
                <div className={styles.publicationContent}>
                  <h4 className={styles.projectPubTitle}>{pub.title}</h4>
                  {pub.authors && (
                    <p className={styles.projectPubDetail}>
                      <strong>Authors:</strong> {pub.authors}
                    </p>
                  )}
                  {pub.journalVenue && (
                    <p className={styles.projectPubDetail}>
                      <strong>Journal/Venue:</strong> {pub.journalVenue}
                    </p>
                  )}
                  {pub.doiUrl && (
                    <p className={styles.projectPubDetail}>
                      <a 
                        href={pub.doiUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--primary)', textDecoration: 'none' }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {pub.doiUrl}
                      </a>
                    </p>
                  )}
                  {pub.submittedDate && (
                    <p className={styles.projectPubDetail}>
                      <strong>Submitted:</strong> {formatDate(pub.submittedDate)}
                    </p>
                  )}
                  {pub.publishedDate && (
                    <p className={styles.projectPubDetail}>
                      <strong>Published:</strong> {formatDate(pub.publishedDate)}
                    </p>
                  )}
                  {pub.notes && (
                    <p className={styles.projectPubNotes}>{pub.notes}</p>
                  )}
                </div>
              </div>
            ));
          })()}
          </div>
        )}
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

