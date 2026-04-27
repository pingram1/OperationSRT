/**
 * Route prefetcher.
 *
 * The router uses React.lazy() to code-split each page. The default behavior
 * is to download the chunk only when the user navigates to that route, which
 * makes the first interaction feel slower than necessary.
 *
 * This module exposes a stable map from URL path → dynamic-import factory and
 * a prefetchRoute(path) helper that we wire to onMouseEnter / onFocus on
 * sidebar links, so the chunk download overlaps the user's reaction time.
 *
 * Vite/Rollup deduplicate identical dynamic-import targets, so the import
 * factories in this file resolve to the same chunks declared in App.jsx.
 *
 * Behavior:
 *   - prefetchRoute(path) returns immediately and is safe to spam.
 *   - We dedupe per-path via a Map of in-flight promises.
 *   - We respect the Save-Data hint and 2g/slow-2g connections to avoid
 *     pulling unnecessary bytes on metered networks.
 */

const pendingPrefetches = new Map();

const ROUTE_TO_IMPORT = {
    '/dashboard': () => import('../pages/Dashboard'),
    '/settings': () => import('../pages/Settings'),
    '/assessment': () => import('../pages/LearningStyleAssessment'),
    '/classroom': () => import('../pages/Classroom'),
    '/appointments': () => import('../pages/AppointmentPage'),
    '/tutor-appointments': () => import('../pages/TutorAppointmentsPage'),
    '/my-students': () => import('../pages/MyStudentsPage'),
    '/earnings': () => import('../pages/TutorEarningsPage'),
    '/parent-portal': () => import('../pages/ParentPortal'),
    '/student-billing-history': () => import('../pages/StudentBillingHistory.jsx'),
    '/progress-reports': () => import('../pages/ProgressReportsPage'),
    '/resources': () => import('../pages/ResourcesPage'),
    '/challenges': () => import('../pages/ChallengesPage'),
    '/scholarship-fund': () => import('../pages/ScholarshipFundPage'),
    '/admin-panel': () => import('../pages/AdminPanel.jsx'),
    '/admin-bookings': () => import('../pages/AdminBookingPage.jsx'),
    '/analytics': () => import('../pages/AnalyticsPage.jsx'),
    '/tutor-management': () => import('../pages/HRpage.jsx'),
    '/announcements': () => import('../pages/AnnouncementsPage.jsx'),
    '/content-management': () => import('../pages/ContentManagement.jsx'),
    '/financials': () => import('../pages/FinancialBMPage.jsx'),
    '/system-config': () => import('../pages/SystemConfig.jsx'),
    '/match-analysis': () => import('../pages/MatchAnalysisPage.jsx'),
    '/schools-admin': () => import('../pages/SchoolsAdminPage.jsx'),
};

function shouldRespectSaveData() {
    if (typeof navigator === 'undefined') return false;
    const conn =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection ||
        null;
    if (!conn) return false;
    if (conn.saveData) return true;
    const slowTypes = ['slow-2g', '2g'];
    return Boolean(conn.effectiveType && slowTypes.includes(conn.effectiveType));
}

/**
 * Trigger a prefetch for the chunk that backs `path`. No-ops on unknown
 * paths and on metered networks.
 *
 * @param {string} path Route path (e.g. "/dashboard").
 * @returns {Promise<unknown> | null} Pending promise, or null if skipped.
 */
export function prefetchRoute(path) {
    if (!path || typeof path !== 'string') return null;
    if (shouldRespectSaveData()) return null;

    const importFn = ROUTE_TO_IMPORT[path];
    if (!importFn) return null;

    if (pendingPrefetches.has(path)) {
        return pendingPrefetches.get(path);
    }

    const promise = importFn().catch((err) => {
        // Drop the failed promise so a future navigation can retry.
        pendingPrefetches.delete(path);
        throw err;
    });
    pendingPrefetches.set(path, promise);
    return promise;
}

export default prefetchRoute;
