import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { StudentSidebar } from '@/components/layout/StudentSidebar';

interface StudentLayoutProps {
    children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <div className="flex pt-16 flex-1 overflow-hidden">
                <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-8 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    );
};
