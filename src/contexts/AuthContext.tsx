import React, { createContext, useContext, useState, useCallback } from 'react';
import { UserRole, User, College } from '@/types';

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

  const login = useCallback((user: User, college: College) => {
    setUser(user);
    setCollege(college);
    setCurrentRole(user.role);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCollege(null);
    setCurrentRole(null);
  }, []);

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
