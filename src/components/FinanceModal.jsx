import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabaseClient } from '../config/supabase';
import styles from './FinanceModal.module.css';

const FinanceModal = ({ finance, onClose, onSave }) => {
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    amount: '',
    category: '',
    description: '',
    account: '',
    user: '',
    receipt: null
  });

  useEffect(() => {
    loadStaff();
    loadUsers();
  }, []);

  useEffect(() => {
    if (finance && !finance.isEdit) {
      // View mode - don't populate form
      return;
    }
    if (finance && finance.isEdit) {
      // Edit mode - populate form
      const date = finance.created_at ? new Date(finance.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setFormData({
        type: finance.type || 'income',
        date: date,
        currency: finance.currency || 'USD',
        amount: finance.amount || '',
        category: finance.category || '',
        description: finance.description || '',
        account: finance.account || '',
        user: finance.user || '',
        receipt: null
      });
    }
  }, [finance]);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('position', '==', 'staff'));
      const querySnapshot = await getDocs(q);
      
      const staffData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.name) {
          staffData.push({
            id: doc.id,
            name: userData.name
          });
        }
      });
      
      staffData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const usersData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.name && userData.email) {
          usersData.push({
            id: doc.id,
            name: userData.name,
            email: userData.email
          });
        }
      });
      
      usersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAllUsers(usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filterUsersForMonthlyFee = async () => {
    if (formData.category !== 'monthly_fee' || !formData.date) {
      setUsers(allUsers);
      return;
    }

    try {
      // Get year and month from the selected date
      const selectedDate = new Date(formData.date);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1; // getMonth() returns 0-11
      
      // Get start and end of the month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      
      const startISO = startOfMonth.toISOString();
      const endISO = endOfMonth.toISOString();

      // Fetch existing monthly fee entries for this month
      let query = supabaseClient
        .from('finances')
        .select('id, user, created_at')
        .eq('category', 'monthly_fee')
        .eq('type', 'income')
        .not('user', 'is', null)
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      // Exclude current finance record if editing
      if (finance && finance.isEdit && finance.id) {
        query = query.neq('id', finance.id);
      }

      const { data: monthlyEntries, error } = await query;

      if (error) throw error;

      // Get unique user names that already have entries for this month
      const usedUserNames = new Set();
      (monthlyEntries || []).forEach(entry => {
        if (entry.user) {
          usedUserNames.add(entry.user);
        }
      });

      // Filter out users who already have entries for this month
      // But always include the current user if editing
      const availableUsers = allUsers.filter(user => {
        if (finance && finance.isEdit && finance.user === user.name) {
          return true; // Always include current user when editing
        }
        return !usedUserNames.has(user.name);
      });
      setUsers(availableUsers);
    } catch (error) {
      console.error('Error filtering users for monthly fee:', error);
      setUsers(allUsers); // Fallback to all users on error
    }
  };

  useEffect(() => {
    if (allUsers.length > 0) {
      filterUsersForMonthlyFee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category, formData.date, allUsers.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      // Reset user field when category changes away from monthly_fee
      if (name === 'category' && value !== 'monthly_fee') {
        newData.user = '';
      }
      return newData;
    });
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      receipt: e.target.files[0] || null
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.type || !formData.date || !formData.currency || !formData.amount || !formData.description || !formData.category || !formData.account) {
      return;
    }
    // Require user field when category is monthly_fee
    if (formData.category === 'monthly_fee' && !formData.user) {
      return;
    }
    onSave(formData);
  };

  const isEdit = finance && finance.isEdit;

  const incomeCategories = [
    { value: 'monthly_fee', label: 'Monthly Fee' },
    { value: 'individual_donations', label: 'Individual Donations' },
    { value: 'corporate_sponsorships', label: 'Corporate Sponsorships' },
    { value: 'research_grants', label: 'Research Grants' },
    { value: 'industry_partnerships', label: 'Industry Partnerships' },
    { value: 'academic_institutions', label: 'Academic Institution Support' }
  ];

  const expenseCategories = [
    { value: 'research_traveling', label: 'Research Traveling' },
    { value: 'publication', label: 'Publication' },
    { value: 'facility_maintenance', label: 'Facility Maintenance' },
    { value: 'server_maintenance', label: 'Server Maintenance' },
    { value: 'educational_programs', label: 'Educational Programs' },
    { value: 'student_support', label: 'Student Support' },
    { value: 'community_engagement', label: 'Community Engagement' },
    { value: 'promotional_activity', label: 'Promotional Activity' }
  ];

  const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Add'} Finance</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit} id="financeForm">
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="type">Type *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="currency">Currency *</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                >
                  <option value="USD">USD</option>
                  <option value="BDT">BDT</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="amount">Amount *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={styles.formControl}
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="category">{formData.type === 'income' ? 'Income' : 'Expense'} Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                >
                  <option value="">Select {formData.type === 'income' ? 'Income' : 'Expense'} Category</option>
                  {formData.type === 'income' ? (
                    <optgroup label="Funding Sources">
                      {incomeCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </optgroup>
                  ) : (
                    <>
                      <optgroup label="Research Expenditures">
                        {expenseCategories.filter(c => ['research_traveling', 'publication'].includes(c.value)).map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Operational Costs">
                        {expenseCategories.filter(c => ['facility_maintenance', 'server_maintenance'].includes(c.value)).map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Educational Initiatives">
                        {expenseCategories.filter(c => ['educational_programs', 'student_support'].includes(c.value)).map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Outreach & Communication">
                        {expenseCategories.filter(c => ['community_engagement', 'promotional_activity'].includes(c.value)).map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="account">Account *</label>
                <select
                  id="account"
                  name="account"
                  value={formData.account}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                  disabled={loadingStaff}
                >
                  <option value="">Select {formData.type === 'income' ? 'Receiving' : 'Spending'} Account</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.type === 'income' && formData.category === 'monthly_fee' && (
              <div className={styles.formGroup}>
                <label htmlFor="user">User *</label>
                <select
                  id="user"
                  name="user"
                  value={formData.user}
                  onChange={handleChange}
                  className={styles.formControl}
                  required
                  disabled={loadingUsers}
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              <label htmlFor="receipt">Receipt</label>
              <input
                type="file"
                id="receipt"
                name="receipt"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.formControl}
              />
              {finance && finance.receipt && !formData.receipt && (
                <p className={styles.currentReceipt}>
                  Current receipt: <a href={finance.receipt} target="_blank" rel="noopener noreferrer">View</a>
                </p>
              )}
            </div>
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button type="submit" form="financeForm" className={styles.btnPrimary}>
            {isEdit ? 'Save Changes' : 'Add Finance'}
          </button>
          <button type="button" className={styles.btnOutline} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceModal;

