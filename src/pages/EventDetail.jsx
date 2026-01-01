import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import EventModal from '../components/EventModal';
import ScheduleItemModal from '../components/ScheduleItemModal';
import SpeakerModal from '../components/SpeakerModal';
import GalleryModal from '../components/GalleryModal';
import styles from './EventDetail.module.css';

// Helper function to parse time string and convert to Date object
// Returns null if parsing fails (instead of Date(0) to distinguish from valid dates)
const parseScheduleTime = (timeString, eventDate) => {
  if (!timeString) return null; // Return null if missing
  
  // Check if timeString already contains full date/time format
  // Format: "Sunday, February 9, 2025, 10:00 PM"
  if (timeString.includes(',') && timeString.match(/\d{4}/)) {
    // Try to parse as full date/time string
    const parsedDate = new Date(timeString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  // If eventDate is provided, combine with time
  if (eventDate) {
    // Extract start time (before " - " if it's a range)
    const startTime = timeString.split(' - ')[0].trim();
    
    // Try multiple parsing strategies
    let parsedDate;
    
    // Strategy 1: Direct combination
    const dateTimeString1 = `${eventDate} ${startTime}`;
    parsedDate = new Date(dateTimeString1);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    // Strategy 2: With T separator (ISO-like)
    const dateTimeString2 = `${eventDate}T${startTime}`;
    parsedDate = new Date(dateTimeString2);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    // Strategy 3: Parse eventDate first, then add time
    const baseDate = new Date(eventDate);
    if (!isNaN(baseDate.getTime())) {
      // Try to extract hours and minutes from time string
      const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const dateWithTime = new Date(baseDate);
        dateWithTime.setHours(hours, minutes, 0, 0);
        return dateWithTime;
      }
      
      // Strategy 4: Try parsing with different formats
      const timeMatch24 = startTime.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch24) {
        const hours = parseInt(timeMatch24[1], 10);
        const minutes = parseInt(timeMatch24[2], 10);
        const dateWithTime = new Date(baseDate);
        dateWithTime.setHours(hours, minutes, 0, 0);
        return dateWithTime;
      }
    }
    
    // If all strategies fail, return null
    return null;
  }
  
  // If no eventDate and can't parse, return null
  return null;
};

// Helper function to extract numeric time value for sorting
// Converts time string like "10:00 AM" to minutes since midnight for comparison
const extractTimeValue = (timeString) => {
  if (!timeString) return 0;
  
  // Extract start time (before " - " if it's a range)
  let startTime = timeString.split(' - ')[0].trim();
  
  // Normalize time format: replace period with colon (e.g., "11.15 AM" -> "11:15 AM")
  startTime = startTime.replace(/\./g, ':');
  
  // Normalize spacing: ensure space before AM/PM (e.g., "1:PM" -> "1:00 PM")
  startTime = startTime.replace(/(\d)(AM|PM)/i, '$1 $2');
  
  // Try to extract hours and minutes with AM/PM
  // Match patterns like "10:00 AM", "11:15 AM", "12:30 PM", "1:00 PM"
  const timeMatch = startTime.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    let minutes = parseInt(timeMatch[2] || '0', 10); // Default to 0 if minutes missing
    
    // If minutes are missing but we have a colon, assume 00
    if (isNaN(minutes) || minutes === 0) {
      minutes = 0;
    }
    
    const ampm = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes; // Return minutes since midnight
  }
  
  // Try 24-hour format (e.g., "14:30")
  const timeMatch24 = startTime.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch24) {
    const hours = parseInt(timeMatch24[1], 10);
    const minutes = parseInt(timeMatch24[2], 10);
    return hours * 60 + minutes;
  }
  
  return 0;
};

// Helper function to sort schedule items by date/time
const sortScheduleByDateTime = (a, b, eventDate) => {
  const dateA = parseScheduleTime(a.time, eventDate);
  const dateB = parseScheduleTime(b.time, eventDate);
  
  // If both dates are valid, sort by date (ascending - earliest first)
  if (dateA !== null && dateB !== null) {
    return dateA - dateB; // Ascending order (earliest first)
  }
  
  // For all other cases, use time value comparison
  // This ensures break items and other items sort correctly by time
  const timeValueA = extractTimeValue(a.time);
  const timeValueB = extractTimeValue(b.time);
  
  if (timeValueA !== timeValueB) {
    return timeValueA - timeValueB; // Ascending order (earliest times first)
  }
  
  // If time values are the same, fallback to string comparison
  const timeA = a.time || '';
  const timeB = b.time || '';
  return timeA.localeCompare(timeB); // Ascending order
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Schedule, speakers, and gallery state
  const [schedule, setSchedule] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [gallery, setGallery] = useState([]);

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState(null);
  const [editingSpeakerIndex, setEditingSpeakerIndex] = useState(null);
  const [editingGalleryIndex, setEditingGalleryIndex] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('itcpr_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Event not found');
        navigate('/events');
        return;
      }

      setEvent(data);
      // Sort schedule items by date/time
      const sortedSchedule = (data.schedule || []).sort((a, b) => {
        return sortScheduleByDateTime(a, b, data.date);
      });
      setSchedule(sortedSchedule);
      setSpeakers(data.speakers || []);
      setGallery(data.gallery || []);
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Error loading event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const saveEvent = async (eventData = null) => {
    setSaving(true);
    try {
      const updateData = eventData 
        ? { ...eventData, schedule, speakers, gallery }
        : { schedule, speakers, gallery };

      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Event updated successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error saving event');
    } finally {
      setSaving(false);
    }
  };

  // Event modal handlers
  const handleEventSave = async (formData) => {
    await saveEvent(formData);
    setShowEventModal(false);
  };

  // Schedule modal handlers
  const handleScheduleAdd = () => {
    setEditingScheduleIndex(null);
    setShowScheduleModal(true);
  };

  const handleScheduleEdit = (index) => {
    setEditingScheduleIndex(index);
    setShowScheduleModal(true);
  };

  const handleScheduleSave = async (scheduleItem) => {
    let updatedSchedule;
    if (editingScheduleIndex !== null) {
      // Update existing schedule item
      updatedSchedule = [...schedule];
      updatedSchedule[editingScheduleIndex] = scheduleItem;
    } else {
      // Add new schedule item
      updatedSchedule = [...schedule, scheduleItem];
    }
    
    // Sort schedule by date/time
    updatedSchedule = updatedSchedule.sort((a, b) => {
      return sortScheduleByDateTime(a, b, event?.date);
    });
    
    // Update state
    setSchedule(updatedSchedule);
    setShowScheduleModal(false);
    setEditingScheduleIndex(null);
    
    // Auto-save with updated schedule
    setSaving(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update({ schedule: updatedSchedule, speakers, gallery })
        .eq('id', id);

      if (error) throw error;
      toast.success('Schedule item saved successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error saving schedule item');
      // Revert state on error
      await loadEvent();
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleRemove = async (index) => {
    const updatedSchedule = schedule.filter((_, i) => i !== index);
    setSchedule(updatedSchedule);
    
    // Auto-save
    setSaving(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update({ schedule: updatedSchedule, speakers, gallery })
        .eq('id', id);

      if (error) throw error;
      toast.success('Schedule item removed successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error removing schedule:', error);
      toast.error('Error removing schedule item');
      // Revert state on error
      await loadEvent();
    } finally {
      setSaving(false);
    }
  };

  // Speaker modal handlers
  const handleSpeakerAdd = () => {
    setEditingSpeakerIndex(null);
    setShowSpeakerModal(true);
  };

  const handleSpeakerEdit = (index) => {
    setEditingSpeakerIndex(index);
    setShowSpeakerModal(true);
  };

  const handleSpeakerSave = async (speaker) => {
    let updatedSpeakers;
    if (editingSpeakerIndex !== null) {
      // Update existing speaker
      updatedSpeakers = [...speakers];
      updatedSpeakers[editingSpeakerIndex] = speaker;
    } else {
      // Add new speaker
      updatedSpeakers = [...speakers, speaker];
    }
    
    // Update state
    setSpeakers(updatedSpeakers);
    setShowSpeakerModal(false);
    setEditingSpeakerIndex(null);
    
    // Auto-save with updated speakers
    setSaving(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update({ schedule, speakers: updatedSpeakers })
        .eq('id', id);

      if (error) throw error;
      toast.success('Speaker saved successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error saving speaker:', error);
      toast.error('Error saving speaker');
      // Revert state on error
      await loadEvent();
    } finally {
      setSaving(false);
    }
  };

  const handleSpeakerRemove = async (index) => {
    const updatedSpeakers = speakers.filter((_, i) => i !== index);
    setSpeakers(updatedSpeakers);
    
    // Auto-save
    setSaving(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update({ schedule, speakers: updatedSpeakers, gallery })
        .eq('id', id);

      if (error) throw error;
      toast.success('Speaker removed successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error removing speaker:', error);
      toast.error('Error removing speaker');
      // Revert state on error
      await loadEvent();
    } finally {
      setSaving(false);
    }
  };

  // Gallery modal handlers
  const handleGalleryAdd = () => {
    setEditingGalleryIndex(null);
    setShowGalleryModal(true);
  };

  const handleGalleryEdit = (index) => {
    setEditingGalleryIndex(index);
    setShowGalleryModal(true);
  };

  const handleGallerySave = async (galleryItem) => {
    const updatedGallery = editingGalleryIndex !== null
      ? gallery.map((item, i) => i === editingGalleryIndex ? galleryItem : item)
      : [...gallery, galleryItem];
    
    setGallery(updatedGallery);
    
    // Auto-save
    setSaving(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update({ schedule, speakers, gallery: updatedGallery })
        .eq('id', id);

      if (error) throw error;
      toast.success('Gallery updated successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error saving gallery:', error);
      toast.error('Error saving gallery');
      // Revert state on error
      await loadEvent();
    } finally {
      setSaving(false);
      setShowGalleryModal(false);
      setEditingGalleryIndex(null);
    }
  };

  const handleGalleryRemove = async (index) => {
    const updatedGallery = gallery.filter((_, i) => i !== index);
    setGallery(updatedGallery);
    
    // Auto-save
    setSaving(true);
    try {
      const { error } = await supabaseServiceClient
        .from('itcpr_events')
        .update({ schedule, speakers, gallery: updatedGallery })
        .eq('id', id);

      if (error) throw error;
      toast.success('Gallery image removed successfully');
      await loadEvent();
    } catch (error) {
      console.error('Error removing gallery image:', error);
      toast.error('Error removing gallery image');
      // Revert state on error
      await loadEvent();
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    try {
      let date;
      if (timeString) {
        // Combine date and time
        const dateTime = `${dateString}T${timeString}`;
        date = new Date(dateTime);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return dateString;
      
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      if (timeString) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      
      return date.toLocaleString('en-US', options);
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Event</h3>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const currentScheduleItem = editingScheduleIndex !== null ? schedule[editingScheduleIndex] : null;
  const currentSpeaker = editingSpeakerIndex !== null ? speakers[editingSpeakerIndex] : null;
  const currentGalleryItem = editingGalleryIndex !== null ? gallery[editingGalleryIndex] : null;

  return (
    <div className="container">
      <div className={styles.eventDetail}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/events')}>
            <span className="material-icons">arrow_back</span>
            Back to Events
          </button>
          <div className={styles.headerActions}>
            <a
              href={`https://events.itcpr.org/${event.type?.toLowerCase() || 'seminar'}/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewButton}
              title="View public event page"
            >
              <span className="material-icons">visibility</span>
              View Event
            </a>
            <button
              className={styles.editButton}
              onClick={() => setShowEventModal(true)}
              title="Edit event"
            >
              <span className="material-icons">edit</span>
              Edit Event
            </button>
          </div>
        </div>

        <div className={styles.eventInfo}>
          <h1>{event.title}</h1>
          {event.subtitle && <p className={styles.subtitle}>{event.subtitle}</p>}
          <div className={styles.meta}>
            <span className={styles.badge}>{event.type}</span>
            <span className={`${styles.badge} ${styles[event.status?.toLowerCase()]}`}>
              {event.status}
            </span>
            {event.date && (
              <span className={styles.metaItem}>
                <span className={`material-icons ${styles.metaIcon}`}>event</span>
                {formatDateTime(event.date, event.time)}
              </span>
            )}
            {event.location && (
              <span className={styles.metaItem}>
                <span className={`material-icons ${styles.metaIcon}`}>location_on</span>
                {event.location}
                {event.room && ` - ${event.room}`}
              </span>
            )}
            {event.time && !event.date && (
              <span className={styles.metaItem}>
                <span className={`material-icons ${styles.metaIcon}`}>schedule</span>
                {event.time}
              </span>
            )}
            {event.language && (
              <span className={styles.metaItem}>
                <span className={`material-icons ${styles.metaIcon}`}>language</span>
                {event.language}
              </span>
            )}
            {event.price !== undefined && event.price !== null && (
              <span className={styles.metaItem}>
                <span className={`material-icons ${styles.metaIcon}`}>attach_money</span>
                {event.price}
              </span>
            )}
            {event.capacity && (
              <span className={styles.metaItem}>
                <span className={`material-icons ${styles.metaIcon}`}>people</span>
                {event.currentEnrollment || 0} / {event.capacity}
              </span>
            )}
          </div>
        </div>

        {/* Overview Section */}
        {event.overview && (
          <div className={styles.section}>
            <h2>Overview</h2>
            <p className={styles.overviewText}>{event.overview}</p>
          </div>
        )}

        {/* Learning Objectives Section */}
        {event.learning_objectives && event.learning_objectives.length > 0 && (
          <div className={styles.section}>
            <h2>Learning Objectives</h2>
            <ul className={styles.list}>
              {event.learning_objectives.map((objective, index) => (
                <li key={index}>{objective}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Target Audience Section */}
        {event.target_audience && event.target_audience.length > 0 && (
          <div className={styles.section}>
            <h2>Target Audience</h2>
            <ul className={styles.list}>
              {event.target_audience.map((audience, index) => (
                <li key={index}>{audience}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Prerequisites Section */}
        {event.prerequisites && event.prerequisites.length > 0 && (
          <div className={styles.section}>
            <h2>Prerequisites</h2>
            <ul className={styles.list}>
              {event.prerequisites.map((prerequisite, index) => (
                <li key={index}>{prerequisite}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Materials Section */}
        {event.materials && event.materials.length > 0 && (
          <div className={styles.section}>
            <h2>Materials</h2>
            <ul className={styles.list}>
              {event.materials.map((material, index) => (
                <li key={index}>{material}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Schedule Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Schedule</h2>
            <button
              className={styles.addButton}
              onClick={handleScheduleAdd}
            >
              <span className="material-icons">add</span>
              Add Schedule Item
            </button>
          </div>

          {/* Schedule List */}
          <div className={styles.scheduleList}>
            {schedule.length === 0 ? (
              <p className={styles.emptyMessage}>No schedule items added yet.</p>
            ) : (
              schedule.map((item, index) => (
                <div key={index} className={styles.scheduleItem}>
                  <div className={styles.scheduleItemHeader}>
                    <div>
                      <div className={styles.scheduleTimeTitle}>
                        <strong>{item.time}</strong>
                        {item.timezone && (
                          <span className={styles.timezoneTag}>
                            {item.timezone}
                          </span>
                        )}
                        <span className={styles.scheduleTitle}>{item.title}</span>
                      </div>
                      {item.type !== 'Break' && (item.type || item.level || item.room) && (
                        <div className={styles.scheduleTags}>
                          {item.type && <span className={styles.scheduleTag}>{item.type}</span>}
                          {item.level && <span className={styles.scheduleTag}>{item.level}</span>}
                          {item.room && (
                            <span className={styles.scheduleTag}>
                              <span className={`material-icons ${styles.tagIcon}`}>meeting_room</span>
                              {item.room}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        onClick={() => handleScheduleEdit(index)}
                        className={styles.btnEdit}
                        title="Edit schedule item"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScheduleRemove(index)}
                        className={styles.btnRemove}
                        title="Remove schedule item"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {item.description && <p className={styles.scheduleDescription}>{item.description}</p>}
                  {item.type !== 'Break' && item.speaker?.name && (
                    <div className={styles.speakerInfo}>
                      <div className={styles.speakerHeader}>
                        <strong>Speaker:</strong> {item.speaker.name}
                        {item.speaker.title && <span> - {item.speaker.title}, {item.speaker.organization}</span>}
                      </div>
                      {item.speaker.bio && (
                        <div className={styles.speakerBio}>{item.speaker.bio}</div>
                      )}
                      {item.speaker.topics && item.speaker.topics.length > 0 && (
                        <div className={styles.speakerTopics}>
                          <strong>Topics:</strong>
                          <div className={styles.topicsList}>
                            {item.speaker.topics.map((topic, i) => (
                              <span key={i} className={styles.topicTag}>{topic}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {item.type !== 'Break' && item.tags && item.tags.length > 0 && (
                    <div className={styles.scheduleTagsSection}>
                      <strong>Tags:</strong>
                      <div className={styles.tagsList}>
                        {item.tags.map((tag, i) => (
                          <span key={i} className={styles.tagItem}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.video_link && (
                    <a href={item.video_link} target="_blank" rel="noopener noreferrer" className={styles.videoLink}>
                      <span className={`material-icons ${styles.videoIcon}`}>play_circle</span>
                      Watch Video
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Speakers Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Speakers</h2>
            <button
              className={styles.addButton}
              onClick={handleSpeakerAdd}
            >
              <span className="material-icons">add</span>
              Add Speaker
            </button>
          </div>

          {/* Speakers List */}
          <div className={styles.speakersList}>
            {speakers.length === 0 ? (
              <p className={styles.emptyMessage}>No speakers added yet.</p>
            ) : (
              speakers.map((speaker, index) => (
                <div key={index} className={styles.speakerCard}>
                  <div className={styles.speakerCardHeader}>
                    <div>
                      <strong>{speaker.name}</strong>
                      {speaker.title && <span> - {speaker.title}</span>}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        onClick={() => handleSpeakerEdit(index)}
                        className={styles.btnEdit}
                        title="Edit speaker"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSpeakerRemove(index)}
                        className={styles.btnRemove}
                        title="Remove speaker"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {speaker.organization && <p className={styles.organization}>{speaker.organization}</p>}
                  {speaker.bio && <p className={styles.bio}>{speaker.bio}</p>}
                  {speaker.topics && speaker.topics.length > 0 && (
                    <div className={styles.topics}>
                      {speaker.topics.map((topic, i) => (
                        <span key={i} className={styles.topicTag}>{topic}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gallery Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Gallery</h2>
            <button
              className={styles.addButton}
              onClick={handleGalleryAdd}
            >
              <span className="material-icons">add</span>
              Add Image
            </button>
          </div>

          {/* Gallery Grid */}
          {gallery.length === 0 ? (
            <p className={styles.emptyMessage}>No gallery images added yet.</p>
          ) : (
            <div className={styles.galleryGrid}>
              {gallery.map((item, index) => (
                <div key={index} className={styles.galleryItem}>
                  <div className={styles.galleryImageWrapper}>
                    <img
                      src={item.image}
                      alt={item.caption || 'Gallery image'}
                      onClick={() => setSelectedImage({ image: item.image, caption: item.caption, index })}
                    />
                    <div className={styles.galleryOverlay}>
                      <button
                        type="button"
                        onClick={() => handleGalleryEdit(index)}
                        className={styles.galleryEditBtn}
                        title="Edit image"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGalleryRemove(index)}
                        className={styles.galleryRemoveBtn}
                        title="Remove image"
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </div>
                  {item.caption && (
                    <div className={styles.galleryCaption}>
                      <p>{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <EventModal
          event={event}
          onClose={() => setShowEventModal(false)}
          onSave={handleEventSave}
        />
      )}

      {showScheduleModal && (
        <ScheduleItemModal
          scheduleItem={currentScheduleItem}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingScheduleIndex(null);
          }}
          onSave={handleScheduleSave}
        />
      )}

      {showSpeakerModal && (
        <SpeakerModal
          speaker={currentSpeaker}
          onClose={() => {
            setShowSpeakerModal(false);
            setEditingSpeakerIndex(null);
          }}
          onSave={handleSpeakerSave}
        />
      )}

      {showGalleryModal && (
        <GalleryModal
          galleryItem={currentGalleryItem}
          onClose={() => {
            setShowGalleryModal(false);
            setEditingGalleryIndex(null);
          }}
          onSave={handleGallerySave}
        />
      )}

      {/* Image Lightbox */}
      {selectedImage && gallery && (
        <div
          className={styles.lightbox}
          onClick={() => setSelectedImage(null)}
        >
          <div className={styles.lightboxOverlay}></div>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.lightboxClose}
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
            >
              <span className="material-icons">close</span>
            </button>
            <div className={styles.lightboxImageWrapper}>
              <img src={selectedImage.image} alt={selectedImage.caption || 'Gallery Image'} />
            </div>
            {selectedImage.caption && (
              <div className={styles.lightboxCaption}>
                <p>{selectedImage.caption}</p>
              </div>
            )}
            {gallery.length > 1 && (
              <>
                <button
                  className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = selectedImage.index > 0 ? selectedImage.index - 1 : gallery.length - 1;
                    const prevItem = gallery[prevIndex];
                    setSelectedImage({ image: prevItem.image, caption: prevItem.caption, index: prevIndex });
                  }}
                  aria-label="Previous image"
                >
                  <span className="material-icons">chevron_left</span>
                </button>
                <button
                  className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = selectedImage.index < gallery.length - 1 ? selectedImage.index + 1 : 0;
                    const nextItem = gallery[nextIndex];
                    setSelectedImage({ image: nextItem.image, caption: nextItem.caption, index: nextIndex });
                  }}
                  aria-label="Next image"
                >
                  <span className="material-icons">chevron_right</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
