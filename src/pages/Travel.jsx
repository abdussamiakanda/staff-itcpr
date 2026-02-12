import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabaseServiceClient } from '../config/supabase';
import toast from 'react-hot-toast';
import { sendEmail, getEmailTemplate } from '../utils/email';
import styles from './Travel.module.css';

const STATUS_LABELS = {
  submitted: 'Submitted',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
};

const STATUS_STYLES = {
  submitted: styles.statusSubmitted,
  approved: styles.statusApproved,
  paid: styles.statusPaid,
  rejected: styles.statusRejected,
};

const TRIP_TYPES = [
  { value: 'conference', label: 'Conference / Seminar' },
  { value: 'research', label: 'Research / Fieldwork' },
  { value: 'training', label: 'Training / Workshop' },
  { value: 'professional', label: 'Professional development' },
  { value: 'other', label: 'Other' },
];

const FUNDING_SOURCES = [
  { value: 'grant', label: 'ITCPR Grant' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

const Travel = () => {
  const [requests, setRequests] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const map = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = { name: data.name || data.displayName || 'Unknown', email: data.email || '' };
      });
      setUserMap(map);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      await loadUsers();
      const { data, error } = await supabaseServiceClient
        .from('travel_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading travel requests:', err);
      toast.error('Failed to load travel requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const formatDateForEmail = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'long' }) : '—';

  const updateStatus = async (id, status) => {
    const req = requests.find((r) => r.id === id);
    const submitter = req && userMap[req.user_id];
    setUpdatingId(id);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabaseServiceClient
        .from('travel_requests')
        .update({ status, updated_at: nowIso })
        .eq('id', id);
      if (error) throw error;
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      if (selectedRequest?.id === id) setSelectedRequest((s) => (s ? { ...s, status } : null));
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);

      if ((status === 'approved' || status === 'rejected') && submitter?.email) {
        const destination = req.destination || 'your trip';
        const dates = `${formatDateForEmail(req.start_date)} – ${formatDateForEmail(req.end_date)}`;
        const subject =
          status === 'approved'
            ? 'Travel request approved – ITCPR'
            : 'Travel request update – ITCPR';
        const message =
          status === 'approved'
            ? `
          <p>Your travel authorization request has been <strong>approved</strong>.</p>
          <p><b>Trip:</b> ${destination}<br>
          <b>Dates:</b> ${dates}</p>
          <p>You can view the status of your travel requests at <a href="https://account.itcpr.org/travel">account.itcpr.org/travel</a>.</p>
        `
            : `
          <p>Your travel authorization request has been <strong>rejected</strong>.</p>
          <p><b>Trip:</b> ${destination}<br>
          <b>Dates:</b> ${dates}</p>
          <p>If you have questions, please contact us at info@itcpr.org.</p>
        `;
        const sent = await sendEmail(
          submitter.email,
          subject,
          getEmailTemplate(submitter.name || 'User', message)
        );
        if (sent) toast.success(`Notification email sent to ${submitter.email}`);
        else toast.error('Status updated but email could not be sent');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

  const getTripTypeLabel = (v) => TRIP_TYPES.find((t) => t.value === v)?.label || v || '—';
  const getFundingLabel = (v) => FUNDING_SOURCES.find((f) => f.value === v)?.label || v || '—';

  const filteredRequests = requests.filter((req) => {
    const matchStatus =
      filterStatus === 'all' || (req.status && req.status === filterStatus);
    const submitter = userMap[req.user_id];
    const name = (submitter?.name || '').toLowerCase();
    const email = (submitter?.email || '').toLowerCase();
    const dest = (req.destination || '').toLowerCase();
    const purpose = (req.purpose || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q || name.includes(q) || email.includes(q) || dest.includes(q) || purpose.includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading travel requests</h3>
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
            <h2>Travel requests</h2>
            <p>Review and approve travel authorization requests from members</p>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Search by name, email, destination, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.statusFilters}>
            {['all', 'submitted', 'approved', 'paid', 'rejected'].map((status) => (
              <button
                key={status}
                type="button"
                className={`${styles.filterChip} ${filterStatus === status ? styles.filterChipActive : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'All' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.cardList}>
          {filteredRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">flight_takeoff</span>
              <p>
                {requests.length === 0
                  ? 'No travel requests yet'
                  : 'No requests match your filters'}
              </p>
            </div>
          ) : (
            <ul className={styles.list}>
              {filteredRequests.map((req) => {
                const submitter = userMap[req.user_id];
                const isUpdating = updatingId === req.id;
                return (
                  <li key={req.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>
                          {req.destination || 'Untitled trip'}
                        </h3>
                        <p className={styles.cardSubmitter}>
                          {submitter?.name || 'Unknown'}
                          {submitter?.email ? ` · ${submitter.email}` : ''}
                        </p>
                      </div>
                      <span
                        className={`${styles.statusBadge} ${STATUS_STYLES[req.status] || styles.statusSubmitted}`}
                      >
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      {req.trip_type && (
                        <span className={styles.cardMetaItem}>
                          {getTripTypeLabel(req.trip_type)}
                        </span>
                      )}
                      <span className={styles.cardMetaItem}>
                        {formatDate(req.start_date)} – {formatDate(req.end_date)}
                      </span>
                    </div>
                    {req.purpose && (
                      <p className={styles.cardPurpose}>{req.purpose}</p>
                    )}
                    <div className={styles.cardFinance}>
                      <span className="material-icons">payments</span>
                      {formatCurrency(req.estimated_amount, req.currency)}
                      {req.funding_source && (
                        <span className={styles.cardFunding}>
                          · {getFundingLabel(req.funding_source)}
                        </span>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.btnDetail}
                        onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                      >
                        <span className="material-icons">
                          {selectedRequest?.id === req.id ? 'expand_less' : 'expand_more'}
                        </span>
                        {selectedRequest?.id === req.id ? 'Less' : 'Details'}
                      </button>
                      {req.status === 'submitted' && (
                        <>
                          <button
                            type="button"
                            className={styles.btnApprove}
                            onClick={() => updateStatus(req.id, 'approved')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className={`material-icons ${styles.spinningIcon}`}>sync</span>
                            ) : (
                              <>
                                <span className="material-icons">check</span>
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.btnReject}
                            onClick={() => updateStatus(req.id, 'rejected')}
                            disabled={isUpdating}
                          >
                            <span className="material-icons">close</span>
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          type="button"
                          className={styles.btnPaid}
                          onClick={() => updateStatus(req.id, 'paid')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <span className={`material-icons ${styles.spinningIcon}`}>sync</span>
                          ) : (
                            <>
                              <span className="material-icons">payments</span>
                              Mark as paid
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {selectedRequest?.id === req.id && (
                      <div className={styles.cardDetail}>
                        {req.travel_notes && (
                          <div className={styles.detailBlock}>
                            <h4>Itinerary / notes</h4>
                            <p>{req.travel_notes}</p>
                          </div>
                        )}
                        {req.finance_notes && (
                          <div className={styles.detailBlock}>
                            <h4>Budget / finance notes</h4>
                            <p>{req.finance_notes}</p>
                          </div>
                        )}
                        <p className={styles.detailMeta}>
                          Submitted: {formatDate(req.submitted_at || req.created_at)}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default Travel;
