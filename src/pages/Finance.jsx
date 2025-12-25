import React, { useState, useEffect } from 'react';
import { supabaseClient, supabaseServiceClient } from '../config/supabase';
import FinanceModal from '../components/FinanceModal';
import FinanceDetailsModal from '../components/FinanceDetailsModal';
import DeleteFinanceModal from '../components/DeleteFinanceModal';
import styles from './Finance.module.css';

const Finance = () => {
  const [finances, setFinances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFinance, setSelectedFinance] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [stats, setStats] = useState({
    totalIncomeUSD: 0,
    totalIncomeBDT: 0,
    totalExpenseUSD: 0,
    totalExpenseBDT: 0,
    currentBalanceUSD: 0,
    currentBalanceBDT: 0
  });

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('finances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFinances(data || []);

      // Calculate stats
      const incomeUSD = data?.filter(f => f.type === 'income' && f.currency === 'USD')
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0;
      const incomeBDT = data?.filter(f => f.type === 'income' && f.currency === 'BDT')
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0;
      const expenseUSD = data?.filter(f => f.type === 'expense' && f.currency === 'USD')
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0;
      const expenseBDT = data?.filter(f => f.type === 'expense' && f.currency === 'BDT')
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0;

      setStats({
        totalIncomeUSD: incomeUSD,
        totalIncomeBDT: incomeBDT,
        totalExpenseUSD: expenseUSD,
        totalExpenseBDT: expenseBDT,
        currentBalanceUSD: incomeUSD - expenseUSD,
        currentBalanceBDT: incomeBDT - expenseBDT
      });
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFinance = async (formData) => {
    try {
      const receiptFile = formData.receipt;
      let receipt = null;

      if (receiptFile) {
        receipt = await imageToDataURL(receiptFile);
      }

      // Generate UUID v4
      const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const { error } = await supabaseServiceClient
        .from('finances')
        .insert({
          id,
          type: formData.type,
          currency: formData.currency,
          amount: parseFloat(formData.amount),
          description: formData.description,
          receipt,
          category: formData.category,
          created_at: formData.date
        });

      if (error) throw error;

      setShowAddModal(false);
      await loadFinanceData();
    } catch (error) {
      console.error('Error adding finance:', error);
    }
  };

  const handleEditFinance = async (id, formData) => {
    try {
      const receiptFile = formData.receipt;
      let receipt = null;

      if (receiptFile) {
        receipt = await imageToDataURL(receiptFile);
      } else {
        // Keep existing receipt if no new file is uploaded
        const { data: existingFinance } = await supabaseClient
          .from('finances')
          .select('receipt')
          .eq('id', id)
          .single();
        receipt = existingFinance?.receipt;
      }

      const { error } = await supabaseServiceClient
        .from('finances')
        .update({
          type: formData.type,
          currency: formData.currency,
          amount: parseFloat(formData.amount),
          description: formData.description,
          receipt,
          category: formData.category,
          created_at: formData.date
        })
        .eq('id', id);

      if (error) throw error;

      setSelectedFinance(null);
      await loadFinanceData();
    } catch (error) {
      console.error('Error updating finance:', error);
    }
  };

  const handleDeleteFinance = async (id) => {
    try {
      const { error } = await supabaseServiceClient
        .from('finances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedFinance(null);
      await loadFinanceData();
    } catch (error) {
      console.error('Error deleting finance:', error);
    }
  };

  const imageToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Filter finances
  const filteredFinances = finances.filter(f => {
    const matchesSearch = !searchQuery || 
      (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.amount || '').toString().includes(searchQuery);
    const matchesType = filterType === 'all' || f.type === filterType;
    const matchesCurrency = filterCurrency === 'all' || f.currency === filterCurrency;
    return matchesSearch && matchesType && matchesCurrency;
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Finance Data</h3>
          <p>Please wait while we fetch the finance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.financeSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Finance Management</h2>
            <p>Manage all the finance of ITCPR</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnAddFinance} onClick={() => setShowAddModal(true)}>
              <span className="material-icons">add</span>
              Add Finance
            </button>
            <button className={styles.btnRefresh} onClick={loadFinanceData}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.overviewContainer}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>attach_money</span>
              <span className={styles.statTitle}>Total Income</span>
            </div>
            <div className={styles.statValue}>$ {stats.totalIncomeUSD.toFixed(2)}</div>
            <div className={styles.statValue}>৳ {stats.totalIncomeBDT.toFixed(2)}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>payments</span>
              <span className={styles.statTitle}>Total Expense</span>
            </div>
            <div className={styles.statValue}>$ {stats.totalExpenseUSD.toFixed(2)}</div>
            <div className={styles.statValue}>৳ {stats.totalExpenseBDT.toFixed(2)}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>account_balance</span>
              <span className={styles.statTitle}>Current Balance</span>
            </div>
            <div className={`${styles.statValue} ${stats.currentBalanceUSD >= 0 ? styles.positive : styles.negative}`}>
              $ {stats.currentBalanceUSD.toFixed(2)}
            </div>
            <div className={`${styles.statValue} ${stats.currentBalanceBDT >= 0 ? styles.positive : styles.negative}`}>
              ৳ {stats.currentBalanceBDT.toFixed(2)}
            </div>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Search by description, category, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.statusFilter}>
            <button
              className={filterType === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={filterType === 'income' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('income')}
            >
              Income
            </button>
            <button
              className={filterType === 'expense' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterType('expense')}
            >
              Expense
            </button>
          </div>
          <div className={styles.currencyFilter}>
            <button
              className={filterCurrency === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterCurrency('all')}
            >
              All Currencies
            </button>
            <button
              className={filterCurrency === 'USD' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterCurrency('USD')}
            >
              USD
            </button>
            <button
              className={filterCurrency === 'BDT' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterCurrency('BDT')}
            >
              BDT
            </button>
          </div>
        </div>

        <div className={styles.financeList}>
          {filteredFinances.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">inbox</span>
              <h3>No Finance Records Found</h3>
              <p>{searchQuery || filterType !== 'all' || filterCurrency !== 'all' ? 'Try adjusting your filters or search query.' : 'No finance records have been added yet.'}</p>
            </div>
          ) : (
            filteredFinances.map((finance) => (
              <div 
                key={finance.id} 
                className={`${styles.financeItem} ${styles[finance.type]}`}
                onClick={() => setSelectedFinance(finance)}
              >
                <div className={styles.financeDescription}>
                  {finance.description?.slice(0, 60)}{finance.description?.length > 60 ? '...' : ''}
                </div>
                <div className={styles.financeAmount}>
                  {finance.currency === 'USD' ? '$' : '৳'} {parseFloat(finance.amount || 0).toFixed(2)}
                </div>
                <div className={styles.financeDate}>
                  {formatDateTime(finance.created_at)}
                </div>
                <div className={styles.financeTypeBadge}>
                  <span className={`${styles.typeBadge} ${styles[finance.type]}`}>
                    {finance.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showAddModal && (
        <FinanceModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddFinance}
        />
      )}

      {selectedFinance && !showDeleteModal && (
        <FinanceDetailsModal
          finance={selectedFinance}
          onClose={() => setSelectedFinance(null)}
          onEdit={(finance) => setSelectedFinance({ ...finance, isEdit: true })}
          onDelete={() => setShowDeleteModal(true)}
          formatDateTime={formatDateTime}
        />
      )}

      {selectedFinance && selectedFinance.isEdit && (
        <FinanceModal
          finance={selectedFinance}
          onClose={() => setSelectedFinance(null)}
          onSave={(formData) => handleEditFinance(selectedFinance.id, formData)}
        />
      )}

      {showDeleteModal && selectedFinance && (
        <DeleteFinanceModal
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedFinance(null);
          }}
          onConfirm={() => handleDeleteFinance(selectedFinance.id)}
        />
      )}
    </div>
  );
};

export default Finance;
