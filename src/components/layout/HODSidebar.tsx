import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Upload,
    Building2,
    Calendar,
    Eye,
    ClipboardList,
    FileSpreadsheet,
    BarChart3,
    Settings,
    UserCog,
    X,
    UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HODSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const navigation = [
    {
        title: 'Overview',
        items: [
            { title: 'Dashboard', path: '/hod/dashboard', icon: LayoutDashboard },
        ]
    },
    {
        title: 'Department Management',
        items: [
            { title: 'Faculty List', path: '/hod/faculty', icon: UserCheck },
            { title: 'Student List', path: '/hod/students', icon: Users },
            { title: 'Upload Students', path: '/hod/students/upload', icon: Upload },
            { title: 'Department Rooms', path: '/hod/rooms', icon: Building2 },
        ]
    },
    {
        title: 'Exams',
        items: [
            { title: 'Exam Schedule', path: '/hod/exams/schedule', icon: Calendar },
            { title: 'Seating Overview', path: '/hod/exams/seating', icon: Eye },
            { title: 'Invigilation Overview', path: '/hod/operations/invigilation', icon: ClipboardList },
        ]
    },
    {
        title: 'Reports',
        items: [
            { title: 'Attendance Reports', path: '/hod/reports/attendance', icon: FileSpreadsheet },
            { title: 'Branch Performance Metrics', path: '/hod/reports/performance', icon: BarChart3 },
        ]
    },
    {
        title: 'Settings',
        items: [
            { title: 'Department Settings', path: '/hod/settings/department', icon: Settings },
            { title: 'Profile Settings', path: '/hod/settings/profile', icon: UserCog },
        ]
    }
];

export const HODSidebar: React.FC<HODSidebarProps> = ({ isOpen, onClose }) => {
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
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                }`
                                            }
                                        >
                                            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                                            {item.title}
                                        </NavLink>
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
