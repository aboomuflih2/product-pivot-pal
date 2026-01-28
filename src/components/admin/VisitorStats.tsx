import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CalendarDays, CalendarRange, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VisitorStats {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    allTime: number;
}

const VisitorStats = () => {
    const [stats, setStats] = useState<VisitorStats>({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        thisYear: 0,
        allTime: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVisitorStats();
    }, []);

    const fetchVisitorStats = async () => {
        try {
            const now = new Date();

            // Start of today
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Start of this week (Sunday)
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

            // Start of this month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Start of this year
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            // Use type cast since site_visits may not be in generated types yet
            const db = supabase as any;

            // Fetch unique visitors for each period
            const [todayData, weekData, monthData, yearData, allTimeData] = await Promise.all([
                // Today - count unique visitor_ids
                db.from("site_visits")
                    .select("visitor_id")
                    .gte("visited_at", startOfToday.toISOString()),

                // This week
                db.from("site_visits")
                    .select("visitor_id")
                    .gte("visited_at", startOfWeek.toISOString()),

                // This month
                db.from("site_visits")
                    .select("visitor_id")
                    .gte("visited_at", startOfMonth.toISOString()),

                // This year
                db.from("site_visits")
                    .select("visitor_id")
                    .gte("visited_at", startOfYear.toISOString()),

                // All time
                db.from("site_visits")
                    .select("visitor_id"),
            ]);

            // Count unique visitors for each period
            const countUnique = (data: { visitor_id: string }[] | null) => {
                if (!data) return 0;
                return new Set(data.map((d: any) => d.visitor_id)).size;
            };

            setStats({
                today: countUnique(todayData.data),
                thisWeek: countUnique(weekData.data),
                thisMonth: countUnique(monthData.data),
                thisYear: countUnique(yearData.data),
                allTime: countUnique(allTimeData.data),
            });
        } catch (error) {
            console.error("Error fetching visitor stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({
        title,
        value,
        icon: Icon,
        description
    }: {
        title: string;
        value: number;
        icon: React.ElementType;
        description: string;
    }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                )}
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Site Visitors</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    title="Today"
                    value={stats.today}
                    icon={Calendar}
                    description="Unique visitors today"
                />
                <StatCard
                    title="This Week"
                    value={stats.thisWeek}
                    icon={CalendarDays}
                    description="Since Sunday"
                />
                <StatCard
                    title="This Month"
                    value={stats.thisMonth}
                    icon={CalendarRange}
                    description="Since 1st of month"
                />
                <StatCard
                    title="This Year"
                    value={stats.thisYear}
                    icon={Users}
                    description="Since Jan 1"
                />
                <StatCard
                    title="All Time"
                    value={stats.allTime}
                    icon={History}
                    description="Total unique visitors"
                />
            </div>
        </div>
    );
};

export default VisitorStats;
