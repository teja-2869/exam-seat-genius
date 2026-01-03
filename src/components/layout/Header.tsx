import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, college } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">
              ExamSeat Pro
            </h1>
            {college && (
              <p className="text-xs text-muted-foreground">{college.name}</p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user && (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
