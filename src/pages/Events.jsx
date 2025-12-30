import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import EventModal from '../components/EventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './Events.module.css';

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: fetchError } = await supabaseClient
        .from('itcpr_events')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error loading events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEdit = (id) => {
    const event = events.find(e => e.id === id);
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeletingEventId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEventId) return;

    setDeleting(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .delete()
        .eq('id', deletingEventId);

      if (error) {
        throw error;
      }

      toast.success('Event deleted successfully');
      await loadEvents();
      setShowDeleteDialog(false);
      setDeletingEventId(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error deleting event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSave = async (formData) => {
    try {
      if (editingEvent) {
        const { error } = await supabaseServiceClient
          .from('itcpr_events')
          .update([formData])
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Event updated successfully');
      } else {
        const { error } = await supabaseServiceClient
          .from('itcpr_events')
          .insert([formData]);

        if (error) throw error;
        toast.success('Event added successfully');
      }
      await loadEvents();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(editingEvent ? 'Error updating event. Please try again.' : 'Error adding event. Please try again.');
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery || 
      (event.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.overview || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || (event.status || '').toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Get unique event types and statuses for filters
  const eventTypes = [...new Set(events.map(e => e.type).filter(Boolean))].sort();
  const eventStatuses = [...new Set(events.map(e => e.status).filter(Boolean))].sort();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Events</h3>
          <p>Please wait while we fetch the events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.eventsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Events Management</h2>
            <p>Manage all events for ITCPR</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnAddEvent} onClick={handleAdd}>
              <span className="material-icons">add</span>
              Add Event
            </button>
            <button className={styles.btnRefresh} onClick={loadEvents}>
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
              placeholder="Search by title, subtitle, or overview..."
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
              <option value="all">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.statusFilter}>
            <select
              id="statusFilter"
              className={styles.statusFilterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {eventStatuses.map(status => (
                <option key={status} value={status.toLowerCase()}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.eventsList}>
          {filteredEvents.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">event</span>
              <h3>No Events Found</h3>
              <p>{searchQuery || filterType !== 'all' || filterStatus !== 'all' ? 'Try adjusting your filters or search query.' : 'No events have been added yet.'}</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div className={styles.eventTags}>
                    <span className={styles.eventTag}>{event.type || 'Event'}</span>
                    <span className={`${styles.eventTag} ${styles[event.status?.toLowerCase() || '']}`}>
                      {event.status || 'Pending'}
                    </span>
                    {event.date && (
                      <span className={styles.eventTag}>{formatDate(event.date)}</span>
                    )}
                  </div>
                  <div className={styles.eventActions}>
                    <button
                      className={styles.btnView}
                      onClick={() => navigate(`/events/${event.id}`)}
                      title="View event details"
                    >
                      <span className="material-icons">visibility</span>
                    </button>
                    <button
                      className={styles.btnEdit}
                      onClick={() => handleEdit(event.id)}
                      title="Edit event"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDelete(event.id)}
                      title="Delete event"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                </div>
                <div className={styles.eventContent}>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  {event.subtitle && (
                    <p className={styles.eventSubtitle}>{event.subtitle}</p>
                  )}
                  <div className={styles.eventDetails}>
                    {event.location && (
                      <span className={styles.eventDetail}>
                        <span className="material-icons">location_on</span>
                        {event.location}
                      </span>
                    )}
                    {event.time && (
                      <span className={styles.eventDetail}>
                        <span className="material-icons">schedule</span>
                        {event.time}
                      </span>
                    )}
                    {event.language && (
                      <span className={styles.eventDetail}>
                        <span className="material-icons">language</span>
                        {event.language}
                      </span>
                    )}
                    {event.price !== undefined && event.price !== null && (
                      <span className={styles.eventDetail}>
                        <span className="material-icons">attach_money</span>
                        {event.price}
                      </span>
                    )}
                  </div>
                  {event.overview && (
                    <p className={styles.eventOverview}>{event.overview.substring(0, 200)}...</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <EventModal
          event={editingEvent}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingEventId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        isLoading={deleting}
      />
    </div>
  );
};

export default Events;

