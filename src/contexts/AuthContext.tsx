import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UserRole, User, College } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  college: College | null;
  isAuthenticated: boolean;
  currentRole: UserRole | null;
  login: (user: User, college: College) => void;
  logout: () => void;
  setCurrentRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser(userData);
            setCurrentRole(userData.role);
            if (userData.collegeId) {
              const collegeDoc = await getDoc(doc(db, 'colleges', userData.collegeId));
              if (collegeDoc.exists()) {
                const collegeData = collegeDoc.data() as College;
                if (collegeData.createdAt && typeof (collegeData.createdAt as any).toDate === 'function') {
                  collegeData.createdAt = (collegeData.createdAt as any).toDate();
                }
                setCollege(collegeData);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // Only clear if auth state actually changes to null
        // Keep current state if we manually set it without firebase password auth (like faculty pseudo-login)
        // Wait, if it's faculty pseudo-login, there's no firebaseUser, so it evaluates here immediately on mount.
        // It's safe to not clear user if firebaseUser is null on mount, we'll let `login` set it.
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback((user: User, college: College) => {
    setUser(user);
    setCollege(college);
    setCurrentRole(user.role);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setCollege(null);
      setCurrentRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading session...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        college,
        isAuthenticated: !!user,
        currentRole,
        login,
        logout,
        setCurrentRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
