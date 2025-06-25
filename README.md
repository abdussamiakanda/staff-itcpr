# ITCPR Staff Directory

A modern, responsive staff directory for the Institute for Technology and Computer Programming Research (ITCPR) that integrates with Firebase Firestore for real-time staff data management.

## Features

### 🔐 Authentication
- SSO (Single Sign-On) integration with ITCPR portal
- Secure authentication using Firebase Auth
- Automatic session management

### 👥 Staff Management
- **Firestore Integration**: Fetches staff data from Firestore `users` collection
- **Real-time Updates**: Staff data is loaded dynamically from the database
- **Smart Filtering**: Search by name, role, department, or expertise
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 🛠️ Admin Panel
- **User Selection**: Select from existing users to assign staff positions
- **Staff Assignment**: Assign users the "staff" position with detailed information
- **Staff Management**: View, edit, and remove staff members
- **Responsibilities Management**: Define and assign responsibilities to staff members
- **Real-time Updates**: All changes are immediately reflected in the directory

### 🎨 User Interface
- Modern, clean design with consistent ITCPR branding
- Interactive staff cards with hover effects
- Detailed staff modal with comprehensive information
- Loading states and smooth animations
- Accessible design with proper ARIA labels

### 🔍 Search & Filter
- Real-time search functionality
- Filter by role (Faculty, Researcher, Administrative, Support Staff, Staff Member)
- Filter by department (Computer Science, AI, Data Science, Administration, General)
- Combined search and filter capabilities

## Firestore Data Structure

### Users Collection
The application expects staff data in the Firestore `users` collection with the following structure:

```javascript
{
  uid: "user_id",
  position: "staff", // Required: must be "staff" to appear in directory
  displayName: "Full Name", // or name, firstName + lastName
  email: "user@itcpr.org",
  role: "faculty|researcher|admin|support|staff",
  department: "cs|ai|data|admin|general",
  title: "Job Title",
  phone: "+1 (555) 123-4567",
  office: "Building A, Room 301",
  photoURL: "https://example.com/avatar.jpg", // or avatar
  bio: "Staff member biography",
  expertise: ["Skill 1", "Skill 2", "Skill 3"], // or skills
  education: "PhD in Computer Science from MIT",
  website: "https://personal-website.com", // or websiteUrl
  responsibilities: "List of responsibilities and duties",
  isActive: true, // Optional: defaults to true
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Responsibilities Collection
The admin panel manages responsibilities in a separate `responsibilities` collection:

```javascript
{
  id: "responsibility_id",
  title: "Responsibility Title",
  description: "Detailed description of the responsibility",
  assignedTo: "staff_member_name", // Optional
  department: "cs|ai|data|admin|general", // Optional
  priority: "high|medium|low", // Optional
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Required Fields
- `position`: Must be set to "staff" for the user to appear in the directory
- `email`: User's email address

### Optional Fields
- `displayName`, `name`, or `firstName` + `lastName`: User's display name
- `role`: User's role (mapped to display values)
- `department`: User's department (mapped to display values)
- `title`: Job title
- `phone` or `phoneNumber`: Contact number
- `office` or `location`: Office location
- `photoURL` or `avatar`: Profile picture URL
- `bio` or `description`: Biography
- `expertise` or `skills`: Array of skills/expertise
- `education`: Educational background
- `website` or `websiteUrl`: Personal website
- `responsibilities`: Staff member's responsibilities and duties
- `isActive`: Whether the user is active (defaults to true)

## Setup & Configuration

### Prerequisites
- Firebase project with Firestore enabled
- Firebase Authentication configured
- SSO integration with ITCPR portal

### Installation
1. Clone the repository
2. Update Firebase configuration in `js/config.js`
3. Ensure Firestore security rules allow reading users with `position === "staff"`
4. Deploy to your web server

### Firebase Configuration
Update the Firebase configuration in `js/config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id",
    measurementId: "your-measurement-id"
};
```

### Firestore Security Rules
Ensure your Firestore security rules allow appropriate access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read staff data
    match /users/{userId} {
      allow read: if request.auth != null && resource.data.position == "staff";
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read responsibilities
    match /responsibilities/{responsibilityId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Add admin role check as needed
    }
  }
}
```

## Usage

### For Staff Members
1. Sign in using SSO
2. Browse the staff directory
3. Use search and filters to find specific staff members
4. Click on staff cards to view detailed information including responsibilities
5. Use the refresh button to reload staff data

### For Administrators
1. Sign in using SSO
2. Click the "Admin" button in the header
3. Use the "Add Staff" tab to:
   - Select users from the system
   - Assign them the "staff" position
   - Add detailed information including responsibilities
4. Use the "Manage Staff" tab to:
   - View all current staff members
   - Edit staff information
   - Remove staff members from the directory
5. Use the "Responsibilities" tab to:
   - View all defined responsibilities
   - Add new responsibilities
   - Edit or delete existing responsibilities

### Admin Features
- **Add Staff**: Select users and assign them staff positions with detailed information
- **Manage Staff**: View, edit, and remove staff members
- **Responsibilities**: Define and manage staff responsibilities
- **Real-time Updates**: All changes are immediately reflected
- **Form Validation**: Ensures required fields are completed
- **Error Handling**: Graceful error handling with user feedback

## Security

- Only authenticated users can access the staff directory
- Admin panel is available to authenticated users (can be restricted further)
- Staff data is read-only from the frontend for non-admin users
- Firestore security rules should restrict access appropriately
- SSO integration ensures secure authentication

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

© 2025 ITCPR. All rights reserved.

## Support

For technical support or questions, contact the ITCPR development team.
