import React, { useEffect, useMemo, useState } from 'react';
import styles from './FeeSettingsModal.module.css';

const FeeSettingsModal = ({
  isOpen,
  user,
  onClose,
  onSave,
  saving = false,
}) => {
  const initialState = useMemo(() => {
    const isExempt = !!user?.isExempt;

    // Derive single amount + currency from stored values
    // Default to BDT if nothing is set
    let currency = 'BDT';
    let amount = '';

    if (!isExempt) {
      if (user?.monthlyFeeUSD !== undefined && user?.monthlyFeeUSD !== null && user?.monthlyFeeUSD !== '') {
        currency = 'USD';
        amount = user.monthlyFeeUSD;
      } else if (user?.monthlyFeeBDT !== undefined && user?.monthlyFeeBDT !== null && user?.monthlyFeeBDT !== '') {
        currency = 'BDT';
        amount = user.monthlyFeeBDT;
      }
    }

    return {
      amount,
      currency,
      isExempt,
    };
  }, [user]);

  const [form, setForm] = useState(initialState);

  useEffect(() => {
    setForm(initialState);
  }, [initialState]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let monthlyFeeUSD = null;
    let monthlyFeeBDT = null;

    if (!form.isExempt && form.amount !== '' && form.amount !== null) {
      if (form.currency === 'USD') {
        monthlyFeeUSD = form.amount;
      } else if (form.currency === 'BDT') {
        monthlyFeeBDT = form.amount;
      }
    }

    await onSave({
      userId: user.id,
      monthlyFeeUSD,
      monthlyFeeBDT,
      isExempt: form.isExempt,
    });
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Fee Settings</h3>
            <p className={styles.subtitle}>
              {user.name} • {user.email}
            </p>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form id="feeSettingsForm" className={styles.modalBody} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.isExempt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isExempt: e.target.checked }))
                }
                disabled={saving}
              />
              Waive monthly fee
            </label>
            <p className={styles.helpText}>If waived, fee inputs will be ignored.</p>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Currency</label>
              <div className={styles.currencyToggle}>
                <button
                  type="button"
                  className={`${styles.currencyOption} ${
                    form.currency === 'USD' ? styles.currencyActive : ''
                  }`}
                  onClick={() => !saving && !form.isExempt && setForm((p) => ({ ...p, currency: 'USD' }))}
                  disabled={saving || form.isExempt}
                >
                  USD
                </button>
                <button
                  type="button"
                  className={`${styles.currencyOption} ${
                    form.currency === 'BDT' ? styles.currencyActive : ''
                  }`}
                  onClick={() => !saving && !form.isExempt && setForm((p) => ({ ...p, currency: 'BDT' }))}
                  disabled={saving || form.isExempt}
                >
                  BDT
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="monthlyFeeAmount">Monthly Fee Amount</label>
              <input
                id="monthlyFeeAmount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                className={styles.formControl}
                placeholder="0.00"
                disabled={saving || form.isExempt}
              />
            </div>
          </div>
        </form>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnOutline}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="feeSettingsForm"
            className={styles.btnPrimary}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className={`material-icons ${styles.spinningIcon}`}>sync</span>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeSettingsModal;

