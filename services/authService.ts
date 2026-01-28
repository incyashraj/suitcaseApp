import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { User } from "../types";

// Helper to map Firebase User to our App User
export const mapFirebaseUser = (fbUser: FirebaseUser): User => {
  return {
    id: fbUser.uid,
    email: fbUser.email || "",
    name: fbUser.displayName || "Traveler",
  };
};

export const authService = {
  
  signup: async (name: string, email: string, password: string): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the display name in Firebase
      await updateProfile(userCredential.user, {
        displayName: name
      });

      return mapFirebaseUser({ ...userCredential.user, displayName: name });
    } catch (error: any) {
      console.error("Signup Error:", error);
      throw new Error(cleanFirebaseError(error.code));
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error("Login Error:", error);
      throw new Error(cleanFirebaseError(error.code));
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error", error);
    }
  },

  // Note: Current user is now handled via the onAuthStateChanged listener in App.tsx
  // This helper is for synchronous checks if needed, but listeners are preferred in React.
  getCurrentUser: (): User | null => {
    const fbUser = auth.currentUser;
    return fbUser ? mapFirebaseUser(fbUser) : null;
  }
};

// Helper to make Firebase error codes human-readable
const cleanFirebaseError = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'Authentication failed. Please try again.';
  }
};