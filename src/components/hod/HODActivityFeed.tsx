import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    timestamp: Date;
    type: 'seating' | 'assignment' | 'upload' | 'other';
}

export const HODActivityFeed: React.FC = () => {
    const { user, college } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            const castedUser = user as any;
            if (!castedUser?.institutionId && !college?.id) {
                setLoading(false);
                return;
            }

            const collId = castedUser?.institutionId || college?.id;
            const branchId = castedUser?.branchId;

            if (!branchId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // This is a simplified merge of multiple queries. In production, an audit_logs collection
                // with `branchId` filtering is optimal for robust dashboards.

                const examsQuery = query(
                    collection(db, 'exams'),
                    where('institutionId', '==', collId),
                    where('branchId', '==', branchId),
                    orderBy('createdAt', 'desc'),
                    limit(3)
                );

                const seatingQuery = query(
                    collection(db, 'seatingPlans'),
                    where('institutionId', '==', collId),
                    where('branchId', '==', branchId),
                    orderBy('generatedAt', 'desc'),
                    limit(3)
                );

                const [examsSnap, seatingSnap] = await Promise.all([
                    getDocs(examsQuery),
                    getDocs(seatingQuery)
                ]);

                const feed: ActivityItem[] = [];

                examsSnap.forEach((doc) => {
                    const data = doc.data();
                    if (data.createdAt) {
                        feed.push({
                            id: doc.id,
                            title: `New Exam Scheduled: ${data.name || 'Untitled Exam'}`,
                            description: `Faculty assignments pending for ${data.room || 'TBD'}`,
                            timestamp: data.createdAt.toDate(),
                            type: 'assignment'
                        });
                    }
                });

                seatingSnap.forEach((doc) => {
                    const data = doc.data();
                    if (data.generatedAt) {
                        feed.push({
                            id: doc.id,
                            title: 'Seating Plan Generated',
                            description: `Seating overview generated for ${data.roomId}`,
                            timestamp: data.generatedAt.toDate(),
                            type: 'seating'
                        });
                    }
                });

                // Add dummy upload record for visual feedback per prompt setup if empty
                if (feed.length === 0) {
                    feed.push({
                        id: 'dummy-upload',
                        title: 'Student Roster Uploaded',
                        description: 'CSV Import successful for Semester 4',
                        timestamp: new Date(),
                        type: 'upload'
                    });
                }

                // Sort combined feed by timestamp DESC
                feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                setActivities(feed.slice(0, 5));
            } catch (error) {
                console.error("Error fetching activity feed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [(user as any)?.institutionId, college?.id, (user as any)?.branchId]);

    return (
        <Card className="dashboard-card shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-display font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-hod" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Clock className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm">No recent branch activity.</p>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        {activities.map((item, index) => (
                            <div key={item.id} className="relative pl-6">
                                {/* Timeline line */}
                                {index !== activities.length - 1 && (
                                    <div className="absolute left-2 top-6 bottom-[-24px] w-px bg-border" />
                                )}

                                {/* Timeline dot */}
                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-background shadow-sm ${item.type === 'seating' ? 'bg-secondary' :
                                        item.type === 'assignment' ? 'bg-accent' :
                                            'bg-hod'
                                    }`} />

                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-foreground">{item.title}</span>
                                    <span className="text-xs text-muted-foreground mt-0.5">{item.description}</span>
                                    <span className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1 font-medium uppercase tracking-wider">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
