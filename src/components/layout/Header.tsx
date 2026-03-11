import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Menu, Search, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  toggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, college } = useAuth();

  const handleLogout = () => {
    sessionStorage.clear();
    logout();
    navigate('/', { replace: true });
  };

  const getDashboardRoute = () => {
    if (!isAuthenticated || !user) return '/';
    const role = user.role?.toLowerCase();
    const map: Record<string, string> = {
      admin: '/admin/dashboard',
      hod: '/hod/dashboard',
      faculty: '/faculty/dashboard',
      student: '/student/dashboard',
    };
    return map[role] || '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Layout Toggle & Logo */}
        <div className="flex items-center gap-4">
          {toggleSidebar && (user?.role === 'admin' || user?.role === 'hod' || user?.role === 'faculty' || user?.role === 'student') && (
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
              <Menu className="w-5 h-5 text-foreground" />
            </Button>
          )}

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(getDashboardRoute())}
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display font-bold text-lg text-foreground hidden sm:block">
                  Exam Seat Genius
                </h1>
                {user?.role === 'hod' && user?.branchId && (
                  <Badge variant="secondary" className="hidden md:inline-flex bg-primary/10 text-primary border-primary/20">
                    {user.branchId} Department
                  </Badge>
                )}
                {user?.role === 'faculty' && (
                  <Badge variant="outline" className="hidden md:inline-flex text-faculty border-faculty/30 bg-faculty/10">
                    FACULTY
                  </Badge>
                )}
                {user?.role === 'student' && (
                  <Badge variant="outline" className="hidden md:inline-flex text-panel-student border-panel-student/30 bg-panel-student/10">
                    {user.id || 'STUDENT'}
                  </Badge>
                )}
              </div>
              {college && (
                <p className="text-xs text-muted-foreground">{college.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Global Search (Admin/HOD) */}
        {isAuthenticated && (user?.role === 'admin' || user?.role === 'hod') && (
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search students, exams, faculty..."
              className="w-full pl-9 bg-muted border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated && user && (
            <>
              {['admin', 'hod', 'faculty', 'student'].includes(user.role) && (
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-2 w-2 h-2 bg-destructive rounded-full" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role.toUpperCase()}</p>
                      {user.role === 'hod' && user.branchId && (
                        <p className="text-xs text-muted-foreground mt-0.5">{user.branchId} Department</p>
                      )}
                      {college && (
                        <p className="text-xs text-muted-foreground font-semibold mt-1 truncate">{college.name}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
