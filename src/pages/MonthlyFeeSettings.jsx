import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import { sendEmail, getEmailTemplate } from '../utils/email';
import FeeSettingsModal from '../components/FeeSettingsModal';
import styles from './MonthlyFeeSettings.module.css';

const MonthlyFeeSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
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
            email: userData.email,
            monthlyFeeUSD: userData.monthlyFeeUSD || '',
            monthlyFeeBDT: userData.monthlyFeeBDT || '',
            isExempt: userData.isExemptFromMonthlyFee || false
          });
        }
      });
      
      usersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openFeeModal = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setSelectedUser(user);
    setShowFeeModal(true);
  };

  const closeFeeModal = () => {
    if (savingUserId) return;
    setShowFeeModal(false);
    setSelectedUser(null);
  };

  const sendFeeSettingEmail = async (user, monthlyFeeUSD, monthlyFeeBDT, isExempt) => {
    if (!user || !user.email) return;

    try {
      let message = '';
      
      if (isExempt) {
        message = `
          <p>Your monthly fee status has been updated.</p>
          
          <b>Fee Status</b>
          <ul>
            <li><strong>Status:</strong> Waived</li>
            <li><strong>Note:</strong> You are currently exempt from paying the monthly fee.</li>
          </ul>
        `;
      } else {
        const currency = monthlyFeeUSD ? 'USD' : 'BDT';
        const amount = monthlyFeeUSD || monthlyFeeBDT;
        const currencySymbol = currency === 'USD' ? '$' : '৳';
        
        message = `
          <p>Your monthly fee has been set.</p>
          
          <b>Monthly Fee Details</b>
          <ul>
            <li><strong>Amount:</strong> ${currencySymbol} ${parseFloat(amount).toFixed(2)} ${currency}</li>
            <li><strong>Frequency:</strong> Monthly</li>
          </ul>
          
          <p>You can view your payment history and make payments at <a href="https://pay.itcpr.org" target="_blank" rel="noopener noreferrer">https://pay.itcpr.org</a>.</p>
        `;
      }
      
      message += `
        <p>If you have any questions or concerns regarding your monthly fee, please don't hesitate to contact us.</p>
      `;

      const subject = isExempt 
        ? 'Monthly Fee Status Update - Waived'
        : 'Monthly Fee Set - Payment Required';
      
      await sendEmail(user.email, subject, getEmailTemplate(user.name || 'User', message));
      console.log(`Fee setting email sent to ${user.name} (${user.email})`);
    } catch (error) {
      console.error('Error sending fee setting email:', error);
    }
  };

  const handleSaveUser = async ({ userId, monthlyFeeUSD, monthlyFeeBDT, isExempt }) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setSavingUserId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = {
        monthlyFeeUSD: monthlyFeeUSD ? parseFloat(monthlyFeeUSD) : null,
        monthlyFeeBDT: monthlyFeeBDT ? parseFloat(monthlyFeeBDT) : null,
        isExemptFromMonthlyFee: !!isExempt
      };

      await updateDoc(userRef, updateData);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                monthlyFeeUSD: monthlyFeeUSD ?? '',
                monthlyFeeBDT: monthlyFeeBDT ?? '',
                isExempt: !!isExempt,
              }
            : u
        )
      );
      
      // Send email notification
      await sendFeeSettingEmail(user, monthlyFeeUSD, monthlyFeeBDT, isExempt);
      
      toast.success(`Fee saved for ${user.name}`);
      setShowFeeModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving user fee:', error);
      toast.error(`Failed to save fee for ${user.name}`);
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return user.name.toLowerCase().includes(searchLower) ||
           user.email.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Settings</h3>
          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <button 
              className={styles.btnBack}
              onClick={() => navigate('/finance')}
            >
              <span className="material-icons">arrow_back</span>
              Back to Finance
            </button>
            <h2>Fee Settings</h2>
            <p>Configure monthly fee amounts and waived users</p>
          </div>
        </div>

        <div className={styles.settingsContainer}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <span className="material-icons">search</span>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.settingsCard}>
            <div className={styles.usersList}>
              {filteredUsers.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className="material-icons">person_off</span>
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  return (
                    <div
                      key={user.id}
                      className={`${styles.userFeeItem} ${user.isExempt ? styles.exempt : ''}`}
                    >
                      <div className={styles.userInfo}>
                        <div className={styles.userDetails}>
                          <span className={styles.userName}>{user.name}</span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                        <span className={`${styles.badge} ${user.isExempt ? styles.badgeExempt : styles.badgeActive}`}>
                          {user.isExempt ? 'Waived' : 'Paying'}
                        </span>
                      </div>
                      
                      <div className={styles.feeSummaryRow}>
                        <div className={styles.feeSummary}>
                          <span className={styles.feeLabel}>Fee</span>
                          <span className={styles.feeValue}>
                            {user.monthlyFeeUSD !== '' && user.monthlyFeeUSD !== null
                              ? `$${Number(user.monthlyFeeUSD).toFixed(2)} USD`
                              : user.monthlyFeeBDT !== '' && user.monthlyFeeBDT !== null
                              ? `৳${Number(user.monthlyFeeBDT).toFixed(2)} BDT`
                              : '—'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.btnSetFee}
                          onClick={() => openFeeModal(user.id)}
                          disabled={savingUserId === user.id}
                        >
                          {savingUserId === user.id ? (
                            <>
                              <span className={`material-icons ${styles.spinningIcon}`}>sync</span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="material-icons">edit</span>
                              Set Fee
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <FeeSettingsModal
        isOpen={showFeeModal}
        user={selectedUser}
        onClose={closeFeeModal}
        onSave={handleSaveUser}
        saving={!!savingUserId}
      />
    </div>
  );
};

export default MonthlyFeeSettings;
