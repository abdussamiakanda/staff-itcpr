import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import NewsletterModal from '../components/NewsletterModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { sendMessageToChannel } from '../utils/discord';
import styles from './Newsletter.module.css';

const Newsletter = () => {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingNewsletterId, setDeletingNewsletterId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingDiscordId, setSendingDiscordId] = useState(null);

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

  const handleDelete = (id) => {
    setDeletingNewsletterId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingNewsletterId) return;

    setDeleting(true);
    try {
      const { error } = await supabaseServiceClient
        .from('news')
        .delete()
        .eq('id', deletingNewsletterId);

      if (error) {
        throw error;
      }

      toast.success('Newsletter deleted successfully');
      await loadNewsletterData();
      setShowDeleteDialog(false);
      setDeletingNewsletterId(null);
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      toast.error('Error deleting newsletter. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNewsletter(null);
  };

  const handleSendDiscord = async (news) => {
    setSendingDiscordId(news.id);
    try {
      const slug = generateSlug(news.title);
      const newsUrl = `https://itcpr.org/news/${slug}`;
      const newsType = news.type === 'issue' ? 'Issue' : 'News';
      const emoji = news.type === 'issue' ? '📋' : '📰';
      const actionEmoji = news.type === 'issue' ? '📖' : '✨';
      
      const discordMessage = `${emoji} **${actionEmoji} New ${newsType} Just Dropped! ${actionEmoji}**

🎯 **Title:** ${news.title}

✍️ **Author:** ${news.author}

🔗 👉 Read the full ${newsType.toLowerCase()} here: [${news.title}](${newsUrl})`;

      await sendMessageToChannel(null, discordMessage);
      toast.success('Discord message sent successfully!');
    } catch (error) {
      console.error('Error sending Discord notification:', error);
      toast.error('Error sending Discord message. Please try again.');
    } finally {
      setSendingDiscordId(null);
    }
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
                    className={styles.btnDiscord}
                    onClick={() => handleSendDiscord(news)}
                    disabled={sendingDiscordId === news.id}
                  >
                    {sendingDiscordId === news.id ? (
                      <>
                        <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="material-icons">send</span>
                        Discord
                      </>
                    )}
                  </button>
                  <button
                    className={styles.btnEdit}
                    onClick={() => handleEdit(news.id)}
                  >
                    <span className="material-icons">edit</span>
                    Edit
                  </button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => handleDelete(news.id)}
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
        <NewsletterModal
          newsletter={editingNewsletter}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingNewsletterId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Newsletter"
        message="Are you sure you want to delete this newsletter? This action cannot be undone."
      />

    </div>
  );
};

export default Newsletter;
