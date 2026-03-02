import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { HODSidebar } from '@/components/layout/HODSidebar';

interface HODLayoutProps {
    children: React.ReactNode;
}

export const HODLayout: React.FC<HODLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <div className="flex pt-16 h-screen overflow-hidden">
                <HODSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                    {children}
                </main>
            </div>
        </div>
    );
};
