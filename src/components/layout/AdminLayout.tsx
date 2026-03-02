import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Header handles its own left button for mobile sidebar toggle */}
            <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                    {children}
                </main>
            </div>
        </div>
    );
};
