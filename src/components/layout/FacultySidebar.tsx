import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    ClipboardCheck,
    Clock,
    History,
    FileCheck,
    User,
    LogOut,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FacultySidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FacultySidebar: React.FC<FacultySidebarProps> = ({ isOpen, onClose }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navigation = [
        {
            title: 'Overview',
            items: [
                { title: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
            ]
        },
        {
            title: 'Duties',
            items: [
                { title: 'My Schedule', path: '/faculty/schedule', icon: Calendar },
                { title: "Today's Exams", path: '/faculty/today', icon: Clock },
            ]
        },
        {
            title: 'Operations',
            items: [
                { title: 'Attendance', path: '/faculty/attendance', icon: ClipboardCheck },
            ]
        },
        {
            title: 'History',
            items: [
                { title: 'Past Duties', path: '/faculty/history/duties', icon: History },
                { title: 'Attendance Logs', path: '/faculty/history/logs', icon: FileCheck },
            ]
        },
        {
            title: 'Profile',
            items: [
                { title: 'My Profile', path: '/faculty/profile', icon: User },
            ],
            actions: [
                { title: 'Logout', onClick: handleLogout, icon: LogOut, variant: 'text-destructive hover:bg-destructive/10' }
            ]
        }
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Content */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full pt-16 lg:pt-0">
                    <div className="flex items-center justify-between px-6 py-4 lg:hidden">
                        <span className="font-semibold text-lg">Menu</span>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 py-6 px-4 space-y-8">
                        {navigation.map((section, idx) => (
                            <div key={idx}>
                                <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    {section.title}
                                </h3>
                                <nav className="space-y-1">
                                    {section.items.map((item, itemIdx) => (
                                        <NavLink
                                            key={itemIdx}
                                            to={item.path}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) onClose();
                                            }}
                                            className={({ isActive }) =>
                                                `flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${isActive
                                                    ? 'bg-faculty/10 text-faculty'
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                }`
                                            }
                                        >
                                            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                                            {item.title}
                                        </NavLink>
                                    ))}
                                    {section.actions?.map((action, actionIdx) => (
                                        <button
                                            key={`action-${actionIdx}`}
                                            onClick={action.onClick}
                                            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${action.variant || 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                                        >
                                            <action.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                                            {action.title}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </>
    );
};
