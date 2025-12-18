import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, database } from '../config/firebase';
import styles from './Technicals.module.css';

const Technicals = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const syncUsersToRealtimeDB = async () => {
    setSyncing(true);
    setSyncStatus('Starting synchronization...');

    try {
      // Get all users from Firestore
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);

      if (querySnapshot.empty) {
        setSyncStatus('No users found in Firestore.');
        setSyncing(false);
        return;
      }

      let processedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Process each user
      for (const userDoc of querySnapshot.docs) {
        try {
          const userData = userDoc.data();
          const uid = userDoc.id;

          // Determine user type - exactly as in original JS
          let userType = 'user'; // default
          if (userData.type) {
            userType = userData.type;
          } else if (userData.position === 'staff') {
            userType = 'staff';
          } else if (userData.type === 'admin') {
            userType = 'admin';
          }

          // Update Realtime Database - only sync the type field
          const userRef = ref(database, `users/${uid}`);
          await set(userRef, {
            type: userType
          });

          updatedCount++;
          processedCount++;

          // Update status
          setSyncStatus(`Processed ${processedCount}/${querySnapshot.docs.length} users...`);
        } catch (error) {
          console.error(`Error processing user ${userDoc.id}:`, error);
          errorCount++;
          processedCount++;
          // Continue with next user even if one fails
        }
      }

      // Final status update
      if (errorCount === 0) {
        setSyncStatus(`✓ Sync Complete! Processed: ${processedCount} users, Updated: ${updatedCount} users. All user types have been synchronized to Firebase Realtime Database.`);
      } else {
        setSyncStatus(`⚠ Sync Complete! Processed: ${processedCount} users, Updated: ${updatedCount} users, Errors: ${errorCount} users. ${errorCount > 0 ? 'Check Firebase Realtime Database security rules.' : ''}`);
      }
    } catch (error) {
      console.error('Error syncing users:', error);
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        setSyncStatus(`✗ Permission Denied: Please check Firebase Realtime Database security rules to allow writes to /users/ path.`);
      } else {
        setSyncStatus(`✗ Error: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container">
      <section className={styles.technicalsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Technical Management</h2>
            <p>Manage technical infrastructure, services, and tools</p>
          </div>
        </div>

        <div className={styles.syncSection}>
          <div className={styles.syncCard}>
            <div className={styles.syncHeader}>
              <span className="material-icons">sync</span>
              <h3>User Data Synchronization</h3>
            </div>
            <p className={styles.syncDescription}>
              Sync user data from Firestore to Firebase Realtime Database. This ensures that user information is available in both databases for different use cases.
            </p>
            <button
              className={styles.syncButton}
              onClick={syncUsersToRealtimeDB}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <span className="material-icons">hourglass_empty</span>
                  Syncing...
                </>
              ) : (
                <>
                  <span className="material-icons">sync</span>
                  Sync Users to Realtime DB
                </>
              )}
            </button>
            {syncStatus && (
              <div className={`${styles.syncStatus} ${syncStatus.startsWith('✓') ? styles.success : syncStatus.startsWith('✗') ? styles.error : styles.info}`}>
                {syncStatus}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Technicals;


