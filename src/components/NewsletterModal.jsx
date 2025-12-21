import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import styles from './NewsletterModal.module.css';

const NewsletterModal = ({ newsletter, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    content: '',
    type: 'issue',
    image: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (newsletter) {
      setFormData({
        title: newsletter.title || '',
        author: newsletter.author || '',
        content: newsletter.content || '',
        type: newsletter.type || 'issue',
        image: newsletter.image || ''
      });
      setPreviewImage(newsletter.image || null);
    } else {
      setPreviewImage(null);
    }
  }, [newsletter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update preview when image URL is manually entered
    if (name === 'image' && value) {
      setPreviewImage(value);
    } else if (name === 'image' && !value) {
      setPreviewImage(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadProgress(50);

    try {
      // Generate unique filename with UTC seconds
      const fileExt = file.name.split('.').pop();
      const utcSeconds = Math.floor(Date.now() / 1000);
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${utcSeconds}_${randomString}.${fileExt}`;
      const filePath = `newsletters/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabaseClient.storage
        .from('itcpr')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      setUploadProgress(90);

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('itcpr')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setFormData(prev => ({
          ...prev,
          image: urlData.publicUrl
        }));
        setPreviewImage(urlData.publicUrl);
      }

      setUploadProgress(100);
      
      // Small delay to show completion
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadProgress(0);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEdit = !!newsletter;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} style={{ maxWidth: '800px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Newsletter</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form id="newsletterForm" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="author">Author</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="content">Description</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows="15"
                placeholder="Enter description in markdown format"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="type">Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="issue">Issue</option>
                <option value="news">News</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="image">Image</label>
              <div className={styles.imageUploadContainer}>
                <input
                  type="file"
                  id="imageFile"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <label htmlFor="imageFile" className={styles.uploadButton}>
                  {uploading ? (
                    <>
                      <span className="material-icons">hourglass_empty</span>
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <span className="material-icons">cloud_upload</span>
                      {formData.image ? 'Change Image' : 'Upload Image'}
                    </>
                  )}
                </label>
                {previewImage && (
                  <div className={styles.imagePreview}>
                    <img src={previewImage} alt="Preview" />
                    <button
                      type="button"
                      className={styles.removeImage}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, image: '' }));
                        setPreviewImage(null);
                      }}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="Or enter image URL manually"
                  className={styles.imageUrlInput}
                />
              </div>
            </div>
          </form>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="submit"
            form="newsletterForm"
            className={styles.btnPrimary}
          >
            {isEdit ? 'Update' : 'Add'} Newsletter
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

export default NewsletterModal;


