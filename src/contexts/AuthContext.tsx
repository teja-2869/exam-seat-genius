import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  suppressAutoLogin: React.MutableRefObject<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Restore persisted session for non-Firebase roles (faculty/student)
  const getPersistedSession = (): { user: User; college: College } | null => {
    try {
      const raw = localStorage.getItem('userSession');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const persisted = getPersistedSession();
  const [user, setUser] = useState<User | null>(persisted?.user ?? null);
  const [college, setCollege] = useState<College | null>(persisted?.college ?? null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(persisted?.user?.role ?? null);
  const [loading, setLoading] = useState(persisted ? false : true);
  const suppressAutoLogin = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !suppressAutoLogin.current) {
        try {
          await firebaseUser.getIdToken(true);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const rawUserData = userDoc.data() as User & {
              uid?: string;
              institutionId?: string;
              institutionName?: string;
            };

            const normalizedUser = {
              ...rawUserData,
              id: rawUserData.id || rawUserData.uid || firebaseUser.uid,
              collegeId: rawUserData.collegeId || rawUserData.institutionId || '',
            } as User;

            setUser(normalizedUser);
            setCurrentRole(normalizedUser.role);

            const activeCollegeId = normalizedUser.collegeId;
            if (activeCollegeId) {
              const collegeDoc = await getDoc(doc(db, 'institutions', activeCollegeId));
              if (collegeDoc.exists()) {
                const collegeData = { id: activeCollegeId, ...collegeDoc.data() } as College;
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
      } else if (!firebaseUser && !suppressAutoLogin.current) {
        // Firebase signed out and we're not in OTP flow — clear state
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback((user: User, college: College) => {
    suppressAutoLogin.current = false;
    setUser(user);
    setCollege(college);
    setCurrentRole(user.role);
    // Persist session for non-Firebase auth roles (faculty/student)
    if (user.role === 'faculty' || user.role === 'student') {
      localStorage.setItem('userSession', JSON.stringify({ user, college }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setCollege(null);
      setCurrentRole(null);
      sessionStorage.clear();
      localStorage.removeItem('userSession');
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
        suppressAutoLogin,
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
