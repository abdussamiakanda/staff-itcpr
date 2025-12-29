import React, { useState, useEffect } from 'react';
import styles from './ResponsibilityModal.module.css';

const ResponsibilityModal = ({ responsibility, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    steps: [''],
    notes: ''
  });

  useEffect(() => {
    if (responsibility) {
      setFormData({
        title: responsibility.title || '',
        description: responsibility.description || '',
        category: responsibility.category || '',
        steps: responsibility.steps && responsibility.steps.length > 0 
          ? responsibility.steps 
          : [''],
        notes: responsibility.notes || ''
      });
    }
  }, [responsibility]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData(prev => ({
      ...prev,
      steps: newSteps
    }));
  };

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, '']
    }));
  };

  const handleRemoveStep = (index) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        steps: newSteps
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || saving) {
      return;
    }
    
    // Filter out empty steps
    const filteredSteps = formData.steps.filter(step => step.trim() !== '');
    
    await onSave({
      ...formData,
      steps: filteredSteps.length > 0 ? filteredSteps : undefined
    });
  };

  const isEdit = !!responsibility;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Responsibility</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit} id="responsibilityForm">
            <div className={styles.formGroup}>
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={styles.formControl}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.formControl}
                rows="4"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={styles.formControl}
                placeholder="e.g., administrative, technical, communication"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Steps</label>
              {formData.steps.map((step, index) => (
                <div key={index} className={styles.stepInputContainer}>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    className={styles.formControl}
                    placeholder={`Step ${index + 1}`}
                  />
                  {formData.steps.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeStepBtn}
                      onClick={() => handleRemoveStep(index)}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={styles.addStepBtn}
                onClick={handleAddStep}
              >
                <span className="material-icons">add</span>
                Add Step
              </button>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={styles.formControl}
                rows="3"
                placeholder="Additional notes or important information"
              />
            </div>
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button 
            type="submit" 
            form="responsibilityForm" 
            className={styles.btnPrimary}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                {isEdit ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              <>
                {isEdit ? 'Save Changes' : 'Add Responsibility'}
              </>
            )}
          </button>
          <button 
            type="button" 
            className={styles.btnOutline} 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponsibilityModal;

