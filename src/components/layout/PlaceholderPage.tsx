import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  breadcrumb: string[];
  title: string;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  breadcrumb,
  title,
  description,
  icon,
  children,
}) => {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Breadcrumb */}
      <div>
        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Content or Placeholder */}
      {children || (
        <Card className="dashboard-card">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              {icon || <Construction className="w-8 h-8 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This page is under development. The UI structure is ready for customization.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
