import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
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
  }, [isAuthenticated, user, allowedRoles, navigate]);

  if (!isAuthenticated) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
