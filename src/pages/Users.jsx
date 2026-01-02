import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { collection, query, getDocs, doc, getDoc, deleteDoc, setDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendEmail, getEmailTemplate } from '../utils/email';
import UserDetailsModal from '../components/UserDetailsModal';
import AddUserModal from '../components/AddUserModal';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './Users.module.css';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [terminatedUsers, setTerminatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTerminateUserId, setPendingTerminateUserId] = useState(null);
  const [terminatingUserId, setTerminatingUserId] = useState(null);
  const [changingStatusUserId, setChangingStatusUserId] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    flagged: 0,
    terminated: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Load active users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const activeUsers = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        activeUsers.push({
          uid: doc.id,
          id: doc.id,
          ...userData
        });
      });

      // Load terminated users
      const terminatedRef = collection(db, 'terminated_users');
      const terminatedSnapshot = await getDocs(terminatedRef);
      
      const terminated = [];
      terminatedSnapshot.forEach((doc) => {
        const userData = doc.data();
        terminated.push({
          uid: doc.id,
          id: doc.id,
          ...userData
        });
      });

      setUsers(activeUsers);
      setTerminatedUsers(terminated);
      
      // Calculate stats
      const active = activeUsers.filter(u => u.status === 'active').length;
      const flagged = activeUsers.filter(u => u.status === 'flagged').length;
      
      setStats({
        total: activeUsers.length,
        active,
        flagged,
        terminated: terminated.length
      });
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const capitalize = (str) => {
    if (!str) return 'N/A';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewUser = async (userId, userType = 'active') => {
    try {
      let userDetails = null;

      if (userType === 'terminated') {
        const terminatedUserRef = doc(db, 'terminated_users', userId);
        const terminatedUserSnap = await getDoc(terminatedUserRef);
        if (terminatedUserSnap.exists()) {
          userDetails = { ...terminatedUserSnap.data(), uid: terminatedUserSnap.id };
        }
      } else {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userDetails = { ...userSnap.data(), uid: userSnap.id };
        }
      }

      if (userDetails) {
        setSelectedUser({ ...userDetails, userType });
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const deauthenticateZeroTierMember = async (memberId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_ZEROTIER_URL;
      if (!apiUrl) {
        console.warn('VITE_API_ZEROTIER_URL is not defined, skipping Zerotier deauthentication');
        return;
      }

      const response = await fetch(`${apiUrl}/deauthenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_id: memberId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error de-authenticating member: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log(`Member ${memberId} de-authenticated successfully:`, data);
    } catch (error) {
      console.error('De-authentication failed:', error);
    }
  };

  const removeDiscordUser = async (userId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_DISCORD_URL;
      if (!apiUrl) {
        console.warn('VITE_API_DISCORD_URL is not defined, skipping Discord user removal');
        return;
      }

      const response = await fetch(`${apiUrl}/remove_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("User removed successfully from Discord:", result.message);
      } else {
        console.error("Failed to remove user from Discord:", result.error);
      }
    } catch (error) {
      console.error("Error removing user from Discord:", error);
    }
  };

  const removePortalUser = async (uid, idToken) => {
    try {
      const apiUrl = import.meta.env.VITE_API_PORTAL_REMOVE_URL;
      if (!apiUrl) {
        console.warn('VITE_API_PORTAL_REMOVE_URL is not defined, skipping portal user removal');
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ uid })
      });

      const result = await response.json();

      if (response.ok && result.status === 'user_deleted') {
        console.log("User removed from portal:", result.uid);
      } else {
        console.error("Error removing user from portal:", result.error);
      }
    } catch (error) {
      console.error("Request failed:", error);
    }
  };

  const handleTerminateUser = async (userId) => {
    setPendingTerminateUserId(userId);
    setShowConfirmDialog(true);
  };

  const executeTerminateUser = async (userId) => {
    setTerminatingUserId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return;
      }

      const userDetails = userSnap.data();

      // Deauthenticate Zerotier member if they have a zerotierId
      if (userDetails.zerotierId) {
        await deauthenticateZeroTierMember(userDetails.zerotierId);
      }

      // Remove from Discord if they have a discordId
      if (userDetails.discordId) {
        await removeDiscordUser(userDetails.discordId);
      }

      // Remove from portal
      if (user) {
        const idToken = await user.getIdToken();
        await removePortalUser(userId, idToken);
      }
      
      // Move to terminated_users
      const terminatedUserRef = doc(db, 'terminated_users', userId);
      await setDoc(terminatedUserRef, {
        ...userDetails,
        terminatedAt: serverTimestamp(),
        terminatedBy: user?.uid || 'unknown',
        originalRole: userDetails.role
      });

      // Delete from users
      await deleteDoc(userRef);

      // Send termination email if available
      if (userDetails.pemail) {
        try {
          const message = `
            <p>
              We are informing you that your position at ITCPR Research Institute has been terminated. To get
              more information about your termination, please contact us at info@itcpr.org.
            </p>
            <p>
              We appreciate your contributions to our research and wish you the best in your future endeavors.
            </p>
          `;
          await sendEmail(userDetails.pemail, 'Position Status at ITCPR Research Institute', getEmailTemplate(userDetails.name, message));
        } catch (error) {
          console.error('Error sending termination email:', error);
        }
      }

      await loadUsers();
      setSelectedUser(null);
      toast.success('User terminated successfully');
    } catch (error) {
      console.error('Error terminating user:', error);
      toast.error('Error terminating user. Please try again.');
    } finally {
      setTerminatingUserId(null);
    }
  };

  const handleChangeStatus = async (userId) => {
    setChangingStatusUserId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return;
      }

      const userDetails = userSnap.data();
      const newStatus = userDetails.status === 'active' ? 'flagged' : 'active';
      const isReinstating = newStatus === 'active' && userDetails.status === 'flagged';
      const isFlagging = newStatus === 'flagged' && userDetails.status === 'active';

      await updateDoc(userRef, { status: newStatus });

      // Send flag email if user is being flagged
      if (isFlagging && userDetails.email) {
        try {
          const message = `
            <p>
              Despite prior reminders, there have been ongoing issues regarding your compliance with the required responsibilities and expectations of the ITCPR program. These include failures to meet assigned obligations and/or lack of participation without proper notice.
            </p>
            <p>
              As a result, you have been officially flagged in the ITCPR records.
            </p>
            <p>
              This flag will remain active until the next evaluation cycle. Please note that any further instance of non-compliance, including but not limited to missed responsibilities, unexcused absence, or failure to follow program guidelines, will result in immediate termination from the program.
            </p>
            <p>
              This action is taken in accordance with ITCPR's accountability and professionalism policies and is considered final.
            </p>
            <p>
              If you believe this notice has been issued in error, you must contact your designated mentor or group instructor immediately. Otherwise, full compliance is expected going forward.
            </p>
          `;
          await sendEmail(userDetails.email, 'Official Notice of Non-Compliance', getEmailTemplate(userDetails.name, message));
        } catch (error) {
          console.error('Error sending flag email:', error);
        }
      }

      // Send reinstatement email if user is being reinstated
      if (isReinstating && userDetails.email) {
        try {
          const message = `
            <p>
              Following a review of your recent status, we confirm that your flag in the ITCPR records has been removed, and your participation in the program has been reinstated effective immediately.
            </p>
            <p>
              This reinstatement reflects our expectation that all responsibilities, communication standards, and program guidelines will be followed consistently going forward. Maintaining regular participation and timely completion of assigned tasks is essential to ensure smooth collaboration within the group.
            </p>
            <p>
              Please treat this reinstatement as an opportunity to move forward with renewed focus and professionalism. If you have any questions about expectations or require clarification, you are encouraged to contact your designated mentor or group instructor.
            </p>
          `;
          await sendEmail(userDetails.email, 'Reinstatement Notice', getEmailTemplate(userDetails.name, message));
        } catch (error) {
          console.error('Error sending reinstatement email:', error);
        }
      }

      await loadUsers();
      setSelectedUser(null);
      toast.success(`User status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error changing user status:', error);
      toast.error('Error changing user status. Please try again.');
    } finally {
      setChangingStatusUserId(null);
    }
  };

  const handleAddUser = async (userData) => {
    setAddingUser(true);
    try {
      const email = await generateEmail(userData.name);

      if (!user) {
        throw new Error("User not logged in");
      }

      const idToken = await user.getIdToken();

      const apiUrl = import.meta.env.VITE_API_NEWUSER_URL;
      if (!apiUrl) {
        throw new Error('VITE_API_NEWUSER_URL is not defined in environment variables');
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unknown error");
      }

      const newUserData = {
        email: email,
        name: userData.name,
        role: userData.role,
        group: userData.group,
        pemail: userData.email,
        photoURL: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541",
        createdAt: serverTimestamp(),
        uid: result.uid,
        university: userData.university || '',
        status: 'active',
        major: userData.major || ''
      };

      await setDoc(doc(db, 'users', result.uid), newUserData);

      // Send welcome email
      const message = `
        <b>Your New ITCPR Email Credentials</b>
        <ul>
        <li>Email Address: ${email}</li>
        <li>Temporary Password: itcprnewuser</li>
        </ul>
        <b>What You Need to Do</b>
        <ul>
        <li>Visit the portal: https://portal.itcpr.org</li>
        <li>Log in using the email and temporary password above</li>
        <li>After logging in, you will be prompted to join our Discord server</li>
        <li>Create a new account on Discord with your gmail address, if you don't have one already</li>
        <li>Click Join button on the portal and join the server</li>
        <li>Download Discord desktop app and the mobile app to join the server</li>
        <li>Click on the person icon on the top right corner in the portal.</li>
        <li>Click on change password, and change your password immediately</li>
        <li>You can now start using the portal and other services</li>
        </ul>
        <b>Explore our services to be familiar with the portal. All our communication is done through Discord and the webmail.</b>
      `;
      const subject = `Welcome to ITCPR Portal`;
      await sendEmail(userData.email, subject, getEmailTemplate(userData.name, message));

      setShowAddModal(false);
      await loadUsers();
      toast.success('User added successfully');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error adding user. Please try again.');
    } finally {
      setAddingUser(false);
    }
  };

  const generateEmail = async (name) => {
    const parts = name.trim().toLowerCase().split(/\s+/);
  
    if (parts.length === 0) return '';
  
    const initials = parts.slice(0, -1).map(part => part[0] || '').join('');
    const lastName = parts[parts.length - 1];
  
    const email = (initials + lastName).replace(/[^a-z0-9]/g, '') + '@mail.itcpr.org';
    const userRef = collection(db, 'users');
    const q = query(userRef, where('email', '==', email));
    const qSnap = await getDocs(q);
    
    if (qSnap.empty) {
      return email;
    }
    return await generateEmail(name + '1');
  };

  // Filter users
  const allUsers = [...users, ...terminatedUsers.map(u => ({ ...u, isTerminated: true }))];
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = !searchQuery || 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && u.status === 'active' && !u.isTerminated) ||
      (filterStatus === 'flagged' && u.status === 'flagged' && !u.isTerminated) ||
      (filterStatus === 'terminated' && u.isTerminated);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Users</h3>
          <p>Please wait while we fetch the user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.usersSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>User Management</h2>
            <p>Manage user accounts and permissions</p>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.btnAddUser} onClick={() => setShowAddModal(true)}>
              <span className="material-icons">person_add</span>
              Add User
            </button>
            <button 
              className={styles.btnRefresh} 
              onClick={() => loadUsers(true)}
              disabled={refreshing}
            >
              <i className={`fas fa-sync-alt ${refreshing ? styles.spinning : ''}`}></i>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className={styles.overviewContainer}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>people</span>
              <span className={styles.statTitle}>Total Users</span>
            </div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statSubtitle}>Active Accounts</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>check_circle</span>
              <span className={styles.statTitle}>Active</span>
            </div>
            <div className={styles.statValue}>{stats.active}</div>
            <div className={styles.statSubtitle}>Currently Active</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>flag</span>
              <span className={styles.statTitle}>Flagged</span>
            </div>
            <div className={styles.statValue}>{stats.flagged}</div>
            <div className={styles.statSubtitle}>Requires Attention</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={`material-icons ${styles.statIcon}`}>cancel</span>
              <span className={styles.statTitle}>Terminated</span>
            </div>
            <div className={styles.statValue}>{stats.terminated}</div>
            <div className={styles.statSubtitle}>Removed Users</div>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.statusFilter}>
            <button
              className={filterStatus === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={filterStatus === 'active' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </button>
            <button
              className={filterStatus === 'flagged' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('flagged')}
            >
              Flagged
            </button>
            <button
              className={filterStatus === 'terminated' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterStatus('terminated')}
            >
              Terminated
            </button>
          </div>
        </div>

        <div className={styles.usersTableContainer}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Group</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyState}>
                    <span className="material-icons">people_outline</span>
                    <h3>No Users Found</h3>
                    <p>{searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters or search query.' : 'No users have been added yet.'}</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => (
                  <tr 
                    key={userItem.uid} 
                    className={userItem.isTerminated ? styles.terminatedRow : styles.activeRow}
                  >
                    <td>{userItem.name || 'Unknown'}</td>
                    <td>{userItem.email || 'No email'}</td>
                    <td>{capitalize(userItem.group || 'N/A')}</td>
                    <td>{userItem.isTerminated ? 'Terminated' : capitalize(userItem.role || 'N/A')}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[userItem.isTerminated ? 'terminated' : (userItem.status || 'active')]}`}>
                        {userItem.isTerminated ? 'Terminated' : capitalize(userItem.status || 'active')}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={styles.btnView}
                        onClick={() => handleViewUser(userItem.uid, userItem.isTerminated ? 'terminated' : 'active')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onTerminate={handleTerminateUser}
          onChangeStatus={handleChangeStatus}
          capitalize={capitalize}
          formatDate={formatDate}
          terminating={terminatingUserId === selectedUser.uid}
          changingStatus={changingStatusUserId === selectedUser.uid}
        />
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddUser}
          adding={addingUser}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingTerminateUserId(null);
        }}
        onConfirm={() => {
          setShowConfirmDialog(false);
          if (pendingTerminateUserId) {
            executeTerminateUser(pendingTerminateUserId);
            setPendingTerminateUserId(null);
          }
        }}
        title="Terminate User"
        message="Are you sure you want to terminate this user? This action cannot be undone."
      />
    </div>
  );
};

export default Users;
