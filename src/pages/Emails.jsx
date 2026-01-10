import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabaseClient } from '../config/supabase';
import { sendEmail, getEmailTemplate, markdownToHtml } from '../utils/email';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './Emails.module.css';

const Emails = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [subscriberSubgroups, setSubscriberSubgroups] = useState([]);
  const [formData, setFormData] = useState({
    emailList: '',
    subject: '',
    body: '',
    emailTo: '',
    emailName: '',
    subscriberSubgroup: ''
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loadUsers();
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      const { data: subscribersData, error } = await supabaseClient
        .from('subscribers')
        .select('email, title, location');

      if (error) {
        console.error('Error fetching subscribers:', error);
        return;
      }

      setSubscribers(subscribersData || []);
      
      // Extract unique titles with their locations for subgroups
      const titleMap = new Map();
      (subscribersData || [])
        .filter(sub => sub.title && sub.title.trim() !== '')
        .forEach(sub => {
          const title = sub.title.trim();
          const location = sub.location ? sub.location.trim() : '';
          if (!titleMap.has(title)) {
            titleMap.set(title, location);
          }
        });
      
      const uniqueSubgroups = Array.from(titleMap.entries())
        .map(([title, location]) => ({ title, location }))
        .sort((a, b) => a.title.localeCompare(b.title));
      
      setSubscriberSubgroups(uniqueSubgroups);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      // Reset subscriberSubgroup when emailList changes away from subscribers
      if (name === 'emailList' && value !== 'subscribers') {
        newData.subscriberSubgroup = '';
      }
      return newData;
    });
  };

  const clearForm = () => {
    setFormData({
      emailList: '',
      subject: '',
      body: '',
      emailTo: '',
      emailName: '',
      subscriberSubgroup: ''
    });
  };

  const sendBulkEmails = async () => {
    const { emailList, subject, body, emailTo, emailName } = formData;

    if (!emailList || !subject || !body) {
      console.error('Please fill in all required fields.');
      return;
    }

    let targetUsers = [];

    if (emailList === 'all') {
      targetUsers = users.filter(user => user.email);
    } else if (emailList === 'interns') {
      targetUsers = users.filter(user => user.role === 'intern' && user.email);
    } else if (emailList === 'members') {
      targetUsers = users.filter(user => user.role !== 'intern' && user.email);
    } else if (emailList === 'directors') {
      targetUsers = users.filter(user => user.position === 'staff' && user.email);
    } else if (emailList === 'server') {
      targetUsers = users.filter(user => user.zerotierId && user.email);
    } else if (emailList === 'subscribers') {
      try {
        let filteredSubscribers = subscribers;
        
        // Filter by subgroup if selected
        if (formData.subscriberSubgroup) {
          filteredSubscribers = subscribers.filter(
            sub => sub.title && sub.title.trim() === formData.subscriberSubgroup
          );
        }

        // Ensure unique emails (database can have same email multiple times)
        const uniqueEmails = new Set();
        targetUsers = filteredSubscribers
          .filter(subscriber => {
            const email = subscriber.email?.toLowerCase().trim();
            if (!email || uniqueEmails.has(email)) {
              return false;
            }
            uniqueEmails.add(email);
            return true;
          })
          .map(subscriber => ({
            email: subscriber.email,
            name: 'Subscriber'
          }));
      } catch (error) {
        console.error('Error fetching subscribers:', error);
        return;
      }
    } else if (emailList === 'single') {
      if (!emailTo) {
        console.error('Please enter an email address.');
        return;
      }
      targetUsers = [{ email: emailTo, name: emailName || 'User' }];
    } else {
      targetUsers = users.filter(user => user.group === emailList && user.email);
    }

    if (targetUsers.length === 0) {
      console.error('No users found for the selected group.');
      return;
    }

    setPendingAction(() => () => {
      setSending(true);
      executeSendEmails(targetUsers, emailList, subject, body);
    });
    setShowConfirmDialog(true);
  };

  const executeSendEmails = async (targetUsers, emailList, subject, body) => {
    setSending(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const user of targetUsers) {
        try {
          const isSubscriber = emailList === 'subscribers';
          const result = await sendEmail(
            user.email,
            subject,
            getEmailTemplate(user.name || 'User', markdownToHtml(body), isSubscriber)
          );
          if (result) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Failed to send email to ${user.email}:`, error);
          failCount++;
        }
      }

      if (successCount === targetUsers.length) {
        toast.success(`Email sent successfully to all ${successCount} recipients.`);
      } else {
        toast.success(`Email sent to ${successCount} out of ${targetUsers.length} recipients. ${failCount > 0 ? `${failCount} failed.` : ''}`);
      }
      if (successCount > 0) {
        clearForm();
      }
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast.error('Error sending emails. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Get unique groups from users
  const groups = [...new Set(
    users
      .filter(user => user.group && user.group.trim() !== '')
      .map(user => user.group.trim())
  )].sort();

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Email Manager</h3>
          <p>Please wait while we fetch user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.emailsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Send Bulk Emails</h2>
            <p>Send emails to users and groups</p>
          </div>
        </div>

        <div className={styles.emailsContent}>
          <form className={styles.emailForm} onSubmit={(e) => { e.preventDefault(); sendBulkEmails(); }}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="emailList">Email Group</label>
                <select
                  id="emailList"
                  name="emailList"
                  value={formData.emailList}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select email group</option>
                  <option value="single">Single User</option>
                  <option value="all">All Users</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{capitalize(group)} Group</option>
                  ))}
                  <option value="interns">Interns</option>
                  <option value="members">Members</option>
                  <option value="directors">Directors</option>
                  <option value="server">Server Users</option>
                  <option value="subscribers">Subscribers</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter email subject"
                  required
                />
              </div>
            </div>

            {formData.emailList === 'single' && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="emailTo">To</label>
                  <input
                    type="email"
                    id="emailTo"
                    name="emailTo"
                    value={formData.emailTo}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="emailName">Name</label>
                  <input
                    type="text"
                    id="emailName"
                    name="emailName"
                    value={formData.emailName}
                    onChange={handleChange}
                    placeholder="Enter name"
                  />
                </div>
              </div>
            )}

            {formData.emailList === 'subscribers' && subscriberSubgroups.length > 0 && (
              <div className={styles.formGroup}>
                <label htmlFor="subscriberSubgroup">Subscriber Subgroup (Optional)</label>
                <select
                  id="subscriberSubgroup"
                  name="subscriberSubgroup"
                  value={formData.subscriberSubgroup}
                  onChange={handleChange}
                >
                  <option value="">All Subscribers</option>
                  {subscriberSubgroups.map((subgroup, index) => (
                    <option key={index} value={subgroup.title}>
                      {subgroup.location ? `${subgroup.title} (${subgroup.location})` : subgroup.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="body">Body</label>
              <textarea
                id="body"
                name="body"
                value={formData.body}
                onChange={handleChange}
                placeholder="Enter email body (markdown supported)"
                rows="12"
                required
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnClear}
                onClick={clearForm}
                disabled={sending}
              >
                Clear
              </button>
              <button
                type="submit"
                className={styles.btnSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <span className="material-icons">hourglass_empty</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="material-icons">send</span>
                    Send Emails
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        title="Confirm Send Emails"
        message={`Are you sure you want to send emails to ${
          formData.emailList === 'single' 
            ? '1 user' 
            : formData.emailList === 'subscribers' && formData.subscriberSubgroup
            ? `subscribers in "${formData.subscriberSubgroup}" subgroup`
            : 'multiple users'
        }?`}
      />
    </div>
  );
};

export default Emails;


