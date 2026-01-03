import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { UserRole } from '@/types';

interface PanelCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  role: UserRole;
  route: string;
  delay?: number;
}

const panelStyles: Record<UserRole, { bg: string; iconBg: string; variant: 'admin' | 'hod' | 'faculty' | 'student' }> = {
  admin: {
    bg: 'from-primary/10 to-primary/5',
    iconBg: 'bg-primary/20 text-primary',
    variant: 'admin',
  },
  hod: {
    bg: 'from-secondary/10 to-secondary/5',
    iconBg: 'bg-secondary/20 text-secondary',
    variant: 'hod',
  },
  faculty: {
    bg: 'from-accent/10 to-accent/5',
    iconBg: 'bg-accent/20 text-accent',
    variant: 'faculty',
  },
  student: {
    bg: 'from-panel-student/10 to-panel-student/5',
    iconBg: 'bg-panel-student/20 text-panel-student',
    variant: 'student',
  },
};

export const PanelCard: React.FC<PanelCardProps> = ({
  title,
  description,
  icon: Icon,
  role,
  route,
  delay = 0,
}) => {
  const navigate = useNavigate();
  const styles = panelStyles[role];

  return (
    <div
      className={`panel-card animate-slide-up bg-gradient-to-br ${styles.bg}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Icon className="w-full h-full" />
      </div>

      <div className="relative z-10">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl ${styles.iconBg} flex items-center justify-center mb-6`}>
          <Icon className="w-8 h-8" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-display font-bold text-foreground mb-3">
          {title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {description}
        </p>

        {/* Enter Button */}
        <Button
          variant={styles.variant}
          size="lg"
          className="w-full"
          onClick={() => navigate(route)}
        >
          Enter {title}
        </Button>
      </div>
    </div>
  );
};
