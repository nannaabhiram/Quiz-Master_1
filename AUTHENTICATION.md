# Firebase Authentication Setup

This application now includes Firebase Authentication with the following features:

## Features
- ✅ Email/Password Authentication
- ✅ Google Sign-In
- ✅ Protected Routes
- ✅ User Profile Display
- ✅ Logout Functionality
- ✅ Password Reset (ready to implement)

## Available Routes

### Public Routes
- `/` - Home page with authentication status
- `/login` - Login page with email/password and Google sign-in
- `/signup` - Registration page for new users

### Protected Routes (require authentication)
You can protect any route by wrapping it with the `ProtectedRoute` component:

```tsx
import ProtectedRoute from '../components/ProtectedRoute';

export default function AdminRoute() {
  return (
    <ProtectedRoute>
      <AdminPanel />
    </ProtectedRoute>
  );
}
```

## Usage

### Using Authentication in Components

```tsx
import { useAuth } from '../contexts/AuthContext';

export default function MyComponent() {
  const { user, logout, login, signup } = useAuth();
  
  // user object contains: email, displayName, uid, photoURL, etc.
  
  return (
    <div>
      {user ? (
        <p>Welcome, {user.displayName || user.email}!</p>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

### Available Auth Methods

- `user` - Current authenticated user (null if not signed in)
- `loading` - Boolean indicating if auth state is loading
- `login(email, password)` - Sign in with email/password
- `signup(email, password, displayName?)` - Create new account
- `loginWithGoogle()` - Sign in with Google popup
- `logout()` - Sign out current user
- `resetPassword(email)` - Send password reset email

## Firebase Console Setup

### Enable Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `quiz-master-98d6b-9629b`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the following providers:
   - **Email/Password** ✅
   - **Google** ✅

### Google Sign-In Setup

For Google Sign-In to work:
1. Enable Google provider in Firebase Console
2. Add authorized domains:
   - `localhost` (for development)
   - Your production domain (when deploying)

### Security Rules (Optional)

You can add Firestore security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Environment Variables

Firebase configuration is stored in `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Note:** The `.env` file should be added to `.gitignore` to keep credentials secure.

## Example: Protecting Routes

To protect the admin panel:

```tsx
// client/app/routes/admin.tsx
import ProtectedRoute from '../components/ProtectedRoute';
import AdminPanel from '../components/AdminPanel';

export default function AdminRoute() {
  return (
    <ProtectedRoute>
      <AdminPanel />
    </ProtectedRoute>
  );
}
```

## Next Steps

1. ✅ Authentication is set up and ready to use
2. 🔄 Enable Email/Password and Google in Firebase Console
3. 🔄 Add ProtectedRoute to admin, host, and other sensitive pages
4. 🔄 (Optional) Add forgot password functionality
5. 🔄 (Optional) Store user profiles in Firestore
6. 🔄 (Optional) Add role-based access control (admin, teacher, student)

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click "Sign In" → "Sign up" to create an account
4. Test login with email/password
5. Test Google Sign-In (requires Firebase Console setup)

Enjoy your authenticated  application! 🎉
