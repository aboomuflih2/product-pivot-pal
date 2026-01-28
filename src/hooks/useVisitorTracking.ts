import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "./useAdminCheck";

const VISITOR_ID_KEY = "911_visitor_id";

/**
 * Generates or retrieves a unique anonymous visitor ID
 */
const getVisitorId = (): string => {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);

    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }

    return visitorId;
};

/**
 * Hook to track site visitors (excludes admin users)
 * Should be used at the App root level
 */
export const useVisitorTracking = () => {
    const location = useLocation();
    const { isAdmin, loading: adminLoading } = useAdminCheck();
    const lastTrackedPath = useRef<string>("");
    const lastTrackedTime = useRef<number>(0);

    useEffect(() => {
        // Skip if still checking admin status
        if (adminLoading) return;

        // Skip tracking for admin users
        if (isAdmin) return;

        // Skip admin routes entirely
        if (location.pathname.startsWith("/admin")) return;

        // Debounce: Don't track same path within 5 seconds
        const now = Date.now();
        if (
            location.pathname === lastTrackedPath.current &&
            now - lastTrackedTime.current < 5000
        ) {
            return;
        }

        const trackVisit = async () => {
            try {
                const visitorId = getVisitorId();

                // Use 'any' type cast since site_visits table may not be in generated types yet
                await (supabase as any).from("site_visits").insert({
                    visitor_id: visitorId,
                    page_path: location.pathname,
                    user_agent: navigator.userAgent,
                    referrer: document.referrer || null,
                });

                lastTrackedPath.current = location.pathname;
                lastTrackedTime.current = now;
            } catch (error) {
                // Silently fail - visitor tracking shouldn't break the app
                console.error("Failed to track visit:", error);
            }
        };

        trackVisit();
    }, [location.pathname, isAdmin, adminLoading]);
};
