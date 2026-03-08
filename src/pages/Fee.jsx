import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabaseClient } from '../config/supabase';
import styles from './Fee.module.css';

const FEE_START_YEAR = 2026;
const FEE_START_MONTH = 2; // February

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Fee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - FEE_START_YEAR + 1 },
    (_, i) => FEE_START_YEAR + i
  );

  const monthsForYear = useMemo(() => {
    if (selectedYear < FEE_START_YEAR) return [];
    if (selectedYear === FEE_START_YEAR) {
      return Array.from({ length: 12 - FEE_START_MONTH + 1 }, (_, i) => FEE_START_MONTH + i);
    }
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, [selectedYear]);

  useEffect(() => {
    loadUsers();
    loadFeePayments();
  }, []);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const usersData = [];
      querySnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const isWaived = !!userData.isExemptFromMonthlyFee;
        if (userData.name && userData.email && !isWaived) {
          usersData.push({
            id: docSnap.id,
            name: userData.name,
          });
        }
      });
      usersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadFeePayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('finances')
        .select('*')
        .eq('type', 'income')
        .eq('category', 'monthly_fee')
        .not('user', 'is', null);

      if (error) throw error;
      setFeePayments(data || []);
    } catch (error) {
      console.error('Error loading fee payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentByUserMonth = useMemo(() => {
    const map = new Map();
    feePayments.forEach((f) => {
      const d = f.created_at ? new Date(f.created_at) : null;
      if (!d || isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${f.user}_${y}_${m}`;
      map.set(key, {
        amount: parseFloat(f.amount) || 0,
        currency: f.currency || 'USD',
      });
    });
    return map;
  }, [feePayments]);

  const getPayment = (userId, year, month) => {
    return paymentByUserMonth.get(`${userId}_${year}_${month}`);
  };

  if (loading && feePayments.length === 0) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading fee data</h3>
          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.feeSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <button
              type="button"
              className={styles.btnBack}
              onClick={() => navigate('/finance')}
            >
              <span className="material-icons">arrow_back</span>
              Back to Finance
            </button>
            <h2>Fee</h2>
            <p>Monthly fee by user</p>
          </div>
          <div className={styles.sectionActions}>
            <div className={styles.yearFilter}>
              <label htmlFor="fee-year" className={styles.yearLabel}>Year</label>
              <select
                id="fee-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={styles.yearSelect}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={styles.btnSettings}
              onClick={() => navigate('/finance/fee-settings')}
            >
              <span className="material-icons">settings</span>
              Fee Settings
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.feeTable}>
            <thead>
              <tr>
                <th className={styles.thUser}>User</th>
                {monthsForYear.map((month) => (
                  <th key={month} className={styles.thMonth}>
                    {MONTH_NAMES[month - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.tdUser}>
                    <span className={styles.userName}>{user.name}</span>
                  </td>
                  {monthsForYear.map((month) => {
                    const payment = getPayment(user.id, selectedYear, month);
                    return (
                      <td key={month} className={styles.tdMonth}>
                        {payment ? (
                          <span className={styles.paid}>
                            {payment.currency === 'USD' ? '$' : '৳'}
                            {Math.round(payment.amount)}
                          </span>
                        ) : (
                          <span className={styles.unpaid}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className={styles.emptyState}>
            <span className="material-icons">person_off</span>
            <p>No users found. Configure fee payers in Fee Settings.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Fee;
