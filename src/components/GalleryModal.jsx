import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabaseClient } from '../config/supabase';
import styles from './GalleryModal.module.css';

const GalleryModal = ({ galleryItem, onClose, onSave }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (galleryItem) {
      setImageUrl(galleryItem.image || '');
      setCaption(galleryItem.caption || '');
    }
  }, [galleryItem]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(50);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const utcSeconds = Math.floor(Date.now() / 1000);
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${utcSeconds}_${randomString}.${fileExt}`;
      const filePath = `events/${fileName}`;

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
        setImageUrl(urlData.publicUrl);
        toast.success('Image uploaded successfully');
      }

      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imageUrl) {
      toast.error('Please upload an image');
      return;
    }
    onSave({ image: imageUrl, caption: caption.trim() });
  };

  const isEdit = !!galleryItem;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Gallery Image</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form id="galleryForm" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="galleryImage">Image <span className={styles.required}>*</span></label>
              <input
                type="file"
                id="galleryImage"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className={styles.fileInput}
              />
              <label htmlFor="galleryImage" className={styles.uploadButton}>
                {uploadingImage ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
              </label>
              {uploadProgress > 0 && (
                <div className={styles.uploadProgress}>
                  <div 
                    className={styles.uploadProgressBar}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              {imageUrl && (
                <div className={styles.imagePreview}>
                  <img src={imageUrl} alt="Preview" />
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="imageUrl">Image URL <span className={styles.required}>*</span></label>
              <div className={styles.urlInputWrapper}>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL or upload an image above"
                  className={styles.urlInput}
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(imageUrl);
                      toast.success('URL copied to clipboard');
                    }}
                    className={styles.copyButton}
                    title="Copy URL"
                  >
                    <span className="material-icons">content_copy</span>
                  </button>
                )}
              </div>
              <p className={styles.urlHint}>Enter an image URL directly or upload an image above</p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="caption">Caption</label>
              <textarea
                id="caption"
                name="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows="3"
                placeholder="Image caption (optional)"
              />
            </div>
          </form>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="submit"
            form="galleryForm"
            className={styles.btnPrimary}
            disabled={!imageUrl || uploadingImage}
          >
            {isEdit ? 'Update' : 'Add'} Image
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

export default GalleryModal;

