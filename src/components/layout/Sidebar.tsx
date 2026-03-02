import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Network,
    Users,
    GraduationCap,
    PlusCircle,
    Calendar,
    ClipboardList,
    Sparkles,
    FileCheck,
    UserCheck,
    Settings,
    UserCog,
    History,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    title: string;
    path: string;
    icon: React.ElementType;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const navigation: NavSection[] = [
    {
        title: 'Overview',
        items: [
            { title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        ]
    },
    {
        title: 'Institution',
        items: [
            { title: 'Rooms & Blocks', path: '/admin/rooms', icon: Building2 },
            { title: 'Branch Management', path: '/admin/branches', icon: Network },
            { title: 'Faculty Management', path: '/admin/faculty', icon: GraduationCap },
            { title: 'Student Management', path: '/admin/students', icon: Users },
        ]
    },
    {
        title: 'Exams',
        items: [
            { title: 'Create Exam', path: '/admin/exams/create', icon: PlusCircle },
            { title: 'Exam Schedule', path: '/admin/exams/schedule', icon: Calendar },
            { title: 'Seating Plans', path: '/admin/exams/seating-plans', icon: ClipboardList },
            { title: 'Generate Seating AI', path: '/admin-generate-seating', icon: Sparkles },
        ]
    },
    {
        title: 'Operations',
        items: [
            { title: 'Attendance Reports', path: '/admin/operations/attendance', icon: FileCheck },
            { title: 'Invigilation Duties', path: '/admin/operations/invigilation', icon: UserCheck },
        ]
    },
    {
        title: 'Settings',
        items: [
            { title: 'Institution Settings', path: '/admin/settings/institution', icon: Settings },
            { title: 'Account Settings', path: '/admin/settings/account', icon: UserCog },
            { title: 'Audit Logs', path: '/admin/settings/audit', icon: History },
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
                                                // Close sidebar on mobile after navigating
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
