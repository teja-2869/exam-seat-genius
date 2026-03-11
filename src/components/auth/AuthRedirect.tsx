import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Wraps auth pages (login/verify) to redirect already-authenticated users to their dashboard.
 */
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardMap: Record<string, string> = {
        admin: '/admin/dashboard',
        ADMIN: '/admin/dashboard',
        hod: '/hod/dashboard',
        HOD: '/hod/dashboard',
        faculty: '/faculty/dashboard',
        student: '/student/dashboard',
      };
      navigate(dashboardMap[user.role] || '/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) return null;
  return <>{children}</>;
};

export default AuthRedirect;
