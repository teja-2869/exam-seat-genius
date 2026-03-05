import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { LayoutBuilder } from '@/components/classroom/LayoutBuilder';

const HODLayoutBuilderPage: React.FC = () => {
    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span>
                        <span>/</span>
                        <span>Classing</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">Layout Builder</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        Dynamic Classroom Architecture
                    </h1>
                    <p className="text-muted-foreground">
                        Configure block matrices and seating layouts structurally.
                    </p>
                </div>

                <LayoutBuilder />
            </div>
        </HODLayout>
    );
};

export default HODLayoutBuilderPage;
