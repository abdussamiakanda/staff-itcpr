import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import styles from './Staff.module.css';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('position', '==', 'staff'));
      const querySnapshot = await getDocs(q);
      
      const staffData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        staffData.push({
          id: doc.id,
          uid: doc.id,
          name: userData.name,
          group: userData.group,
          email: userData.email,
          position_title: userData.position_title,
          photoURL: userData.photoURL,
          phone: userData.phone,
          office: userData.office,
          expertise: userData.expertise || [],
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        });
      });
      
      staffData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const mapGroup = (group) => {
    if (!group) return '';
    return group.charAt(0).toUpperCase() + group.slice(1);
  };

  if (loading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading Staff</h3>
          <p>Please wait while we fetch the staff directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className={styles.staffSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>Our Team</h2>
            <p>Meet the team that makes ITCPR possible</p>
          </div>
          <div className={styles.staffCount}>
            {staff.length} {staff.length === 1 ? 'member' : 'members'}
          </div>
        </div>

        <div className={styles.staffGrid}>
          {staff.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-icons">people</span>
              <h3>No Staff Members Found</h3>
              <p>No staff members have been added yet.</p>
            </div>
          ) : (
            staff.map((member) => {
              const initials = getInitials(member.name);
              return (
                <div 
                  key={member.id} 
                  className={styles.staffCard}
                >
                  <div className={styles.staffHeader}>
                    <div className={styles.staffAvatar}>
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.name} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className={styles.staffInfo}>
                      <h3 className={styles.staffName}>{member.name}</h3>
                      <span className={styles.staffRole}>{mapGroup(member.group)}</span>
                    </div>
                  </div>
                  <div className={styles.staffDetails}>
                    {member.position_title && (
                      <div className={styles.staffDetailItem}>
                        <span className="material-icons">business</span>
                        <span>{member.position_title}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className={styles.staffDetailItem}>
                        <span className="material-icons">email</span>
                        <a href={`mailto:${member.email}`}>
                          {member.email}
                        </a>
                      </div>
                    )}
                    {member.phone && (
                      <div className={styles.staffDetailItem}>
                        <span className="material-icons">phone</span>
                        <a href={`tel:${member.phone}`}>
                          {member.phone}
                        </a>
                      </div>
                    )}
                    {member.office && (
                      <div className={styles.staffDetailItem}>
                        <span className="material-icons">location_on</span>
                        <span>{member.office}</span>
                      </div>
                    )}
                  </div>
                  {member.expertise && member.expertise.length > 0 && (
                    <div className={styles.staffExpertise}>
                      <h4>Expertise</h4>
                      <div className={styles.expertiseTags}>
                        {member.expertise.slice(0, 3).map((skill, index) => (
                          <span key={index} className={styles.expertiseTag}>{skill}</span>
                        ))}
                        {member.expertise.length > 3 && (
                          <span className={styles.expertiseTag}>+{member.expertise.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Staff;
