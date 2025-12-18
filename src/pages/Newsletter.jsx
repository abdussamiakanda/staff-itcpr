import React, { useState, useEffect } from 'react';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import NewsletterModal from '../components/NewsletterModal';
import styles from './Newsletter.module.css';

const Newsletter = () => {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadNewsletterData();
  }, []);

  const loadNewsletterData = async () => {
    setLoading(true);
    try {
      const { data: newsData, error: fetchError } = await supabaseClient
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setNewsletters(newsData || []);
    } catch (error) {
      console.error('Error loading newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingNewsletter(null);
    setShowModal(true);
  };

  const handleEdit = (id) => {
    const newsletter = newsletters.find(n => n.id === id);
    setEditingNewsletter(newsletter);
    setShowModal(true);
  };

  const generateSlug = (title) => {
    if (!title) return '';
    // Get first 10 words, convert to lowercase, replace spaces with hyphens, remove special chars
    const words = title.split(/\s+/).slice(0, 10);
    return words
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleView = (news) => {
    const slug = generateSlug(news.title);
    window.open(`https://itcpr.org/news/${slug}`, '_blank');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNewsletter(null);
  };


  const handleSave = async (formData) => {
    try {
      if (editingNewsletter) {
        await supabaseServiceClient
          .from('news')
          .update([formData])
          .eq('id', editingNewsletter.id);
      } else {
        await supabaseServiceClient
          .from('news')
          .insert([formData]);
      }
      await loadNewsletterData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving newsletter:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter newsletters
  const filteredNewsletters = newsletters.filter(news => {
    const matchesSearch = !searchQuery || 
      (news.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (news.author || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || news.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Newsletters</h3>
          <p>Please wait while we fetch the newsletters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.newsletterSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Newsletter Management</h2>
            <p>Manage all the newsletters of ITCPR</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnAddNews} onClick={handleAdd}>
              <span className="material-icons">add</span>
              Add News
            </button>
            <button className={styles.btnRefresh} onClick={loadNewsletterData}>
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
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.typeFilter}>
            <button
              className={filterType === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={filterType === 'issue' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('issue')}
            >
              Issues
            </button>
            <button
              className={filterType === 'news' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('news')}
            >
              News
            </button>
          </div>
        </div>

        <div className={styles.newsletterGrid}>
          {filteredNewsletters.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">inbox</span>
              <h3>No Newsletters Found</h3>
              <p>{searchQuery || filterType !== 'all' ? 'Try adjusting your filters or search query.' : 'No newsletters have been added yet.'}</p>
            </div>
          ) : (
            filteredNewsletters.map((news) => (
              <div key={news.id} className={styles.newsletterCard}>
                <div className={styles.newsletterHeader}>
                  <h4 title={news.title}>
                    {news.title && news.title.length > 40 ? `${news.title.substring(0, 40)}...` : news.title}
                  </h4>
                  <div className={styles.newsletterMeta}>
                    <div className={styles.newsletterDate}>
                      <span className="material-icons">schedule</span>
                      {formatDate(news.created_at)}
                    </div>
                    <div className={`${styles.newsletterType} ${styles[news.type]}`}>
                      {news.type === 'issue' ? 'Issue' : 'News'}
                    </div>
                  </div>
                  {news.author && (
                    <div className={styles.newsletterAuthor}>
                      <span className="material-icons">person</span>
                      {news.author}
                    </div>
                  )}
                </div>
                <div className={styles.newsletterFooter}>
                  <button
                    className={styles.btnView}
                    onClick={() => handleView(news)}
                  >
                    <span className="material-icons">open_in_new</span>
                    View
                  </button>
                  <button
                    className={styles.btnEdit}
                    onClick={() => handleEdit(news.id)}
                  >
                    <span className="material-icons">edit</span>
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <NewsletterModal
          newsletter={editingNewsletter}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

    </div>
  );
};

export default Newsletter;
