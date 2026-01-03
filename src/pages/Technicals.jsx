import React, { useState } from 'react';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, set, get, remove } from 'firebase/database';
import { db, database, auth } from '../config/firebase';
import { supabaseServiceClient } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import styles from './Technicals.module.css';

const Technicals = () => {
  const { user, userData } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanStatus, setCleanStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState('');

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

      // Final status update for sync
      if (errorCount === 0) {
        setSyncStatus(`✓ Sync Complete! Processed: ${processedCount} users, Updated: ${updatedCount} users. Starting cleanup...`);
      } else {
        setSyncStatus(`⚠ Sync Complete! Processed: ${processedCount} users, Updated: ${updatedCount} users, Errors: ${errorCount} users. Starting cleanup...`);
      }

      // Now clean up users in Realtime DB that don't exist in Firestore
      // Also clean up empty user documents from Firestore
      setSyncStatus('Cleaning up Realtime Database and Firestore...');

      try {
        // Get all users from Realtime DB
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        let cleanedCount = 0;
        let firestoreDeletedCount = 0;
        let cleanErrorCount = 0;

        if (snapshot.exists()) {
          const realtimeUsers = snapshot.val();
          const userIds = Object.keys(realtimeUsers);

          // Process each user in Realtime DB
          for (const uid of userIds) {
            try {
              let shouldKeep = false;

              // Check if user exists in Firestore (users collection)
              const userRef = doc(db, 'users', uid);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                const userData = userSnap.data();
                // Check if document has meaningful data (not just empty or subcollections)
                // A valid user should have at least one of: email, name, role, or group
                if (userData && (userData.email || userData.name || userData.role || userData.group)) {
                  // User exists in Firestore with valid data, keep in Realtime DB
                  shouldKeep = true;
                } else {
                  // Document exists but has no meaningful data, remove from both Firestore and Realtime DB
                  await deleteDoc(userRef);
                  firestoreDeletedCount++;
                  const userRealtimeRef = ref(database, `users/${uid}`);
                  await remove(userRealtimeRef);
                  cleanedCount++;
                  continue; // Skip to next user
                }
              }

              // Check if user exists in terminated_users collection
              // Terminated users should NOT exist in Realtime DB, so we don't set shouldKeep = true
              const terminatedUserRef = doc(db, 'terminated_users', uid);
              const terminatedUserSnap = await getDoc(terminatedUserRef);

              if (terminatedUserSnap.exists()) {
                // User is terminated, remove from Realtime DB
                const userRealtimeRef = ref(database, `users/${uid}`);
                await remove(userRealtimeRef);
                cleanedCount++;
                continue; // Skip to next user
              }

              // If user doesn't exist or has no meaningful data, remove from Realtime DB
              if (!shouldKeep) {
                const userRealtimeRef = ref(database, `users/${uid}`);
                await remove(userRealtimeRef);
                cleanedCount++;
              }
            } catch (error) {
              console.error(`Error processing user ${uid} during cleanup:`, error);
              cleanErrorCount++;
              // Continue with next user even if one fails
            }
          }
        }

        // Also check all Firestore users for empty documents
        setSyncStatus('Checking Firestore for empty user documents...');
        const firestoreUsersRef = collection(db, 'users');
        const firestoreSnapshot = await getDocs(firestoreUsersRef);

        for (const userDoc of firestoreSnapshot.docs) {
          try {
            const userData = userDoc.data();
            const uid = userDoc.id;

            // Check if document has meaningful data
            if (!userData || !(userData.email || userData.name || userData.role || userData.group)) {
              // Empty document, delete from Firestore
              await deleteDoc(doc(db, 'users', uid));
              firestoreDeletedCount++;

              // Also remove from Realtime DB if it exists there
              try {
                const userRealtimeRef = ref(database, `users/${uid}`);
                const realtimeSnap = await get(userRealtimeRef);
                if (realtimeSnap.exists()) {
                  await remove(userRealtimeRef);
                  cleanedCount++;
                }
              } catch (rtError) {
                // Ignore errors if user doesn't exist in Realtime DB
              }
            }
          } catch (error) {
            console.error(`Error checking Firestore user ${userDoc.id}:`, error);
            cleanErrorCount++;
          }
        }

        // Final status update
        if (errorCount === 0 && cleanErrorCount === 0) {
          let statusMsg = `✓ Complete! Synced: ${updatedCount} users`;
          if (cleanedCount > 0 || firestoreDeletedCount > 0) {
            statusMsg += `, Removed: ${cleanedCount} users from Realtime Database`;
            if (firestoreDeletedCount > 0) {
              statusMsg += `, Deleted: ${firestoreDeletedCount} empty users from Firestore`;
            }
          }
          statusMsg += `. All user types have been synchronized and cleanup completed.`;
          setSyncStatus(statusMsg);
        } else {
          let statusMsg = `⚠ Complete! Synced: ${updatedCount} users`;
          if (cleanedCount > 0 || firestoreDeletedCount > 0) {
            statusMsg += `, Removed: ${cleanedCount} users from Realtime Database`;
            if (firestoreDeletedCount > 0) {
              statusMsg += `, Deleted: ${firestoreDeletedCount} empty users from Firestore`;
            }
          }
          statusMsg += `. Sync Errors: ${errorCount}, Cleanup Errors: ${cleanErrorCount}.`;
          setSyncStatus(statusMsg);
        }
      } catch (cleanError) {
        console.error('Error during cleanup:', cleanError);
        if (cleanError.message && cleanError.message.includes('PERMISSION_DENIED')) {
          setSyncStatus(`⚠ Sync Complete! Cleanup failed: Permission Denied. Please check Firebase Realtime Database security rules.`);
        } else {
          setSyncStatus(`⚠ Sync Complete! Cleanup failed: ${cleanError.message || 'Unknown error occurred'}`);
        }
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

  const cleanupWebmail = async () => {
    setCleaning(true);
    setCleanStatus('Starting webmail cleanup...');

    try {
      // Get all users from Firestore
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);

      // Create a Set of all valid user UIDs from Firestore
      const validUserIds = new Set();
      
      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        const uid = userDoc.id;
        
        // Only include users with meaningful data
        if (userData && (userData.email || userData.name || userData.role || userData.group)) {
          validUserIds.add(uid);
        }
      }

      setCleanStatus(`Found ${validUserIds.size} valid users in Firestore. Checking Realtime Database emails...`);

      // Get all email entries from Realtime Database
      const emailsRef = ref(database, 'emails');
      const emailsSnapshot = await get(emailsRef);

      if (!emailsSnapshot.exists()) {
        setCleanStatus('No email entries found in Realtime Database.');
        setCleaning(false);
        return;
      }

      const emails = emailsSnapshot.val();
      const emailUserIds = Object.keys(emails);

      let processedCount = 0;
      let removedCount = 0;
      let errorCount = 0;

      // Process each email entry
      for (const uid of emailUserIds) {
        try {
          processedCount++;
          setCleanStatus(`Checking ${processedCount}/${emailUserIds.length} email entries...`);

          // Check if this UID exists in valid Firestore users
          if (!validUserIds.has(uid)) {
            // User doesn't exist in Firestore, remove from emails
            const emailRef = ref(database, `emails/${uid}`);
            await remove(emailRef);
            removedCount++;
          }
        } catch (error) {
          console.error(`Error processing email entry ${uid}:`, error);
          errorCount++;
          // Continue with next entry even if one fails
        }
      }

      // Final status update
      if (errorCount === 0) {
        setCleanStatus(`✓ Cleanup Complete! Processed: ${processedCount} email entries, Removed: ${removedCount} entries that don't have matching users in Firestore.`);
      } else {
        setCleanStatus(`⚠ Cleanup Complete! Processed: ${processedCount} email entries, Removed: ${removedCount} entries. Errors: ${errorCount}.`);
      }
    } catch (error) {
      console.error('Error cleaning up webmail:', error);
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        setCleanStatus(`✗ Permission Denied: Please check Firebase Realtime Database security rules to allow writes to /emails/ path.`);
      } else {
        setCleanStatus(`✗ Error: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setCleaning(false);
    }
  };

  const updateAccessCodeJson = async () => {
    setUpdating(true);
    setUpdateStatus('Starting access code update...');

    try {
      // Get all users from Firestore
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const accessCodes = {};

      setUpdateStatus('Processing users from Firestore...');

      usersSnapshot.docs.forEach(doc => {
        const serverUserData = doc.data();
        const userName = serverUserData.name;
        const ip = serverUserData.ip;
        const ssh_folder = serverUserData.ssh_folder;

        if (serverUserData.serverCode && ip) {
          accessCodes[serverUserData.serverCode] = {
            name: userName,
            ip: ip,
            ssh_folder: ssh_folder
          };
        }
      });

      const codeCount = Object.keys(accessCodes).length;
      setUpdateStatus(`Found ${codeCount} access codes. Uploading to server...`);

      const jsonString = JSON.stringify(accessCodes, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob, 'access_codes.json');

      const API_ACCESS_URL = import.meta.env.VITE_API_ACCESS_URL;
      if (!API_ACCESS_URL) {
        throw new Error('VITE_API_ACCESS_URL is not defined in environment variables');
      }

      const response = await fetch(API_ACCESS_URL, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        setUpdateStatus(`✓ Access codes uploaded successfully! Processed ${codeCount} access codes.`);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error updating access codes:', error);
      setUpdateStatus(`✗ Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setUpdating(false);
    }
  };

  const syncUsersToSupabase = async () => {
    setSyncingSupabase(true);
    setSupabaseStatus('Starting synchronization to Supabase...');

    try {
      // Get all users from Firestore
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);

      if (querySnapshot.empty) {
        setSupabaseStatus('No users found in Firestore.');
        setSyncingSupabase(false);
        return;
      }

      let processedCount = 0;
      let insertedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Get existing records from Supabase to check for updates
      setSupabaseStatus('Fetching existing records from Supabase...');
      const { data: existingRecords, error: fetchError } = await supabaseServiceClient
        .from('itcpr_people')
        .select('id, name');

      if (fetchError) {
        throw new Error(`Failed to fetch existing records: ${fetchError.message}`);
      }

      // Create a map of lowercase names to record IDs for efficient lookup
      const nameToIdMap = new Map();
      existingRecords?.forEach(record => {
        if (record.name) {
          const nameLower = record.name.toLowerCase().trim();
          nameToIdMap.set(nameLower, record.id);
        }
      });

      setSupabaseStatus(`Found ${nameToIdMap.size} existing records. Processing Firestore users...`);

      // Process each user
      for (const userDoc of querySnapshot.docs) {
        try {
          const userData = userDoc.data();
          
          // Only process users with meaningful data (at least a name)
          if (!userData || !userData.name) {
            processedCount++;
            continue;
          }

          // Helper function to clean and validate values
          const cleanValue = (value) => {
            if (value === undefined || value === null || value === '') return null;
            return typeof value === 'string' ? value.trim() || null : value;
          };

          // Helper function to capitalize first letter
          const capitalizeFirst = (str) => {
            if (!str || typeof str !== 'string') return str;
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
          };

          // Map Firestore user data to Supabase table structure
          // Only include fields with actual values (exclude null/empty)
          const rawData = {
            name: cleanValue(userData.name),
            role: cleanValue(userData.role),
            url: cleanValue(userData.googleScholar), // Firebase stores as 'googleScholar'
            group: cleanValue(userData.group),
            image: cleanValue(userData.photoURL || userData.image),
            position: cleanValue(userData.position),
            position_title: cleanValue(userData.position_title),
            institute: cleanValue(userData.university) // Firebase stores as 'university'
          };

          // Ensure name is not null (required for matching)
          if (!rawData.name) {
            processedCount++;
            continue;
          }

          // Build record - use empty string as default for null values
          // Use '#' for url when empty
          // Capitalize first letter of role and group
          // If position is "staff", use position_title instead (keep position_title as-is, no capitalization)
          // Allow null for position
          let roleValue = rawData.role;
          let positionValue = rawData.position;
          let isPositionTitle = false; // Track if we're using position_title
          
          // Determine position value: use position_title if position is "staff"
          if (positionValue && positionValue.toLowerCase() === 'staff' && rawData.position_title) {
            positionValue = rawData.position_title;
            isPositionTitle = true; // Mark that we're using position_title
          }
          
          // Format position: keep position_title as-is, capitalize others
          let formattedPosition = null;
          if (positionValue) {
            if (isPositionTitle) {
              formattedPosition = positionValue; // Keep position_title as-is
            } else {
              formattedPosition = capitalizeFirst(positionValue);
            }
          }
          
          const supabaseRecord = {
            name: rawData.name || '', // Required
            role: roleValue ? capitalizeFirst(roleValue) : null,
            url: rawData.url || '#',
            group: rawData.group ? capitalizeFirst(rawData.group) : null,
            image: rawData.image || '',
            position: formattedPosition, // Allow null
            institute: rawData.institute || null // Allow null
          };

          // Check if record exists (by name, case-insensitive)
          const nameLower = supabaseRecord.name.toLowerCase().trim();
          const existingId = nameToIdMap.get(nameLower);

          if (existingId && existingId !== 'new') {
            // Update existing record by ID
            const { data, error: updateError } = await supabaseServiceClient
              .from('itcpr_people')
              .update(supabaseRecord)
              .eq('id', existingId)
              .select();

            if (updateError) {
              console.error(`Update error for user ${userDoc.id} (${supabaseRecord.name}):`, updateError);
              throw new Error(`Update failed: ${updateError.message || JSON.stringify(updateError)}`);
            }
            updatedCount++;
          } else {
            // Insert new record
            const { data, error: insertError } = await supabaseServiceClient
              .from('itcpr_people')
              .insert([supabaseRecord])
              .select();

            if (insertError) {
              console.error(`Insert error for user ${userDoc.id} (${supabaseRecord.name}):`, insertError);
              throw new Error(`Insert failed: ${insertError.message || JSON.stringify(insertError)}`);
            }
            
            // Add the new record's ID to the map
            if (data && data[0] && data[0].id) {
              nameToIdMap.set(nameLower, data[0].id);
            }
            insertedCount++;
          }

          processedCount++;
          setSupabaseStatus(`Processed ${processedCount}/${querySnapshot.docs.length} users...`);
        } catch (error) {
          console.error(`Error processing user ${userDoc.id}:`, error);
          errorCount++;
          processedCount++;
          // Continue with next user even if one fails
        }
      }

      // Final status update
      if (errorCount === 0) {
        setSupabaseStatus(`✓ Sync Complete! Processed: ${processedCount} users, Inserted: ${insertedCount} new records, Updated: ${updatedCount} existing records.`);
      } else {
        setSupabaseStatus(`⚠ Sync Complete! Processed: ${processedCount} users, Inserted: ${insertedCount} new records, Updated: ${updatedCount} existing records. Errors: ${errorCount}.`);
      }
    } catch (error) {
      console.error('Error syncing users to Supabase:', error);
      setSupabaseStatus(`✗ Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setSyncingSupabase(false);
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
              Sync user data from Firestore to Firebase Realtime Database and remove users from Realtime Database that no longer exist in Firestore. This ensures data consistency between both databases.
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

          <div className={styles.syncCard}>
            <div className={styles.syncHeader}>
              <span className="material-icons">email</span>
              <h3>Webmail Cleanup</h3>
            </div>
            <p className={styles.syncDescription}>
              Check email entries in Firebase Realtime Database and remove entries that don't have a corresponding user in Firestore. This ensures webmail data consistency.
            </p>
            <button
              className={styles.syncButton}
              onClick={cleanupWebmail}
              disabled={cleaning}
            >
              {cleaning ? (
                <>
                  <span className="material-icons">hourglass_empty</span>
                  Cleaning...
                </>
              ) : (
                <>
                  <span className="material-icons">email</span>
                  Cleanup Webmail
                </>
              )}
            </button>
            {cleanStatus && (
              <div className={`${styles.syncStatus} ${cleanStatus.startsWith('✓') ? styles.success : cleanStatus.startsWith('✗') ? styles.error : styles.info}`}>
                {cleanStatus}
              </div>
            )}
          </div>

          <div className={styles.syncCard}>
            <div className={styles.syncHeader}>
              <span className="material-icons">code</span>
              <h3>Update Access Codes</h3>
            </div>
            <p className={styles.syncDescription}>
              Generate and upload access_codes.json file to the server. This file contains server access codes mapped to user information (name, IP, SSH folder) from Firestore users.
            </p>
            <button
              className={styles.syncButton}
              onClick={updateAccessCodeJson}
              disabled={updating}
            >
              {updating ? (
                <>
                  <span className="material-icons">hourglass_empty</span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="material-icons">code</span>
                  Update Access Codes
                </>
              )}
            </button>
            {updateStatus && (
              <div className={`${styles.syncStatus} ${updateStatus.startsWith('✓') ? styles.success : updateStatus.startsWith('✗') ? styles.error : styles.info}`}>
                {updateStatus}
              </div>
            )}
          </div>

          <div className={styles.syncCard}>
            <div className={styles.syncHeader}>
              <span className="material-icons">storage</span>
              <h3>Sync to Supabase</h3>
            </div>
            <p className={styles.syncDescription}>
              Sync user data from Firestore to Supabase itcpr_people table. This will insert new users and update existing ones based on name matching.
            </p>
            <button
              className={styles.syncButton}
              onClick={syncUsersToSupabase}
              disabled={syncingSupabase}
            >
              {syncingSupabase ? (
                <>
                  <span className="material-icons">hourglass_empty</span>
                  Syncing...
                </>
              ) : (
                <>
                  <span className="material-icons">storage</span>
                  Sync to Supabase
                </>
              )}
            </button>
            {supabaseStatus && (
              <div className={`${styles.syncStatus} ${supabaseStatus.startsWith('✓') ? styles.success : supabaseStatus.startsWith('✗') ? styles.error : styles.info}`}>
                {supabaseStatus}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Technicals;


