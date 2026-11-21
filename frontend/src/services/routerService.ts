/**
 * Browser History & URL Routing Synchronization Service.
 * Translates between application state (portalMode, activePage, navParams)
 * and semantic browser URLs (/portal/page?params, /courses, /about, etc.).
 * Enables native Chrome Back/Forward button navigation and direct URL deep-linking.
 */

export type PortalMode = 'student' | 'teacher' | 'admin' | 'public';

export type PublicNavigationPage = 'landing' | 'about' | 'contact';

export interface AppRouteState {
  portal: PortalMode;
  page: string;
  params: Record<string, string>;
}

export const DEFAULT_PAGE_BY_PORTAL: Record<PortalMode, string> = {
  student: 'dashboard',
  teacher: 'overview',
  admin: 'dashboard',
  public: 'landing',
};

export const VALID_PUBLIC_PAGES = new Set([
  'landing',
  'about',
  'contact',
]);

const VALID_STUDENT_PAGES = new Set([
  'dashboard',
  'catalog',
  'course_details',
  'my_learning',
  'course_map',
  'lesson',
  'diagnostic_intro',
  'diagnostic_player',
  'practice_player',
  'exam_player',
  'results',
  'progress',
  'analytics',
  'achievements',
  'xp_history',
  'leaderboard',
  'profile',
  'sign_in',
  'register',
]);

const VALID_TEACHER_PAGES = new Set([
  'overview',
  'courses',
  'course_overview',
  'curriculum',
  'prerequisites',
  'resources',
  'questions',
  'question_editor',
  'ai_review',
  'assessments',
  'assessment_editor',
  'analytics',
]);

const VALID_ADMIN_PAGES = new Set([
  'dashboard',
  'users',
  'user_details',
  'roles',
  'audit',
  'health',
  'oversight',
  'profile',
  'access_denied',
]);

/**
 * Serialize an application route state into a clean browser URL pathname + search query.
 */
export function serializeRouteToUrl(portal: PortalMode, page: string, params?: Record<string, string>): string {
  const cleanPage = page.toLowerCase().trim();
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, String(val));
      }
    });
  }

  const queryString = searchParams.toString();
  const querySuffix = queryString ? `?${queryString}` : '';

  if (portal === 'public') {
    if (cleanPage === 'landing') {
      return `/${querySuffix}`;
    }
    return `/${cleanPage}${querySuffix}`;
  }

  return `/${portal}/${cleanPage}${querySuffix}`;
}

/**
 * Parse browser URL (pathname and search) into structured application route state.
 * Returns null if the URL is root (/) or unmapped.
 */
export function parseUrlToRoute(pathname: string, search = ''): AppRouteState | null {
  const cleanPath = pathname.trim().replace(/\/+$/, ''); // remove trailing slash
  const segments = cleanPath.split('/').filter(Boolean);

  const searchParams = new URLSearchParams(search);
  const params: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    params[key] = val;
  });

  if (segments.length === 0) {
    return null;
  }

  const rawPortal = segments[0]?.toLowerCase();

  if (rawPortal === 'student') {
    let page = segments[1]?.toLowerCase() || DEFAULT_PAGE_BY_PORTAL.student;
    if (page === 'analytics') page = 'progress';
    return {
      portal: 'student',
      page: VALID_STUDENT_PAGES.has(page) ? page : DEFAULT_PAGE_BY_PORTAL.student,
      params,
    };
  }

  if (rawPortal === 'teacher') {
    const page = segments[1]?.toLowerCase() || DEFAULT_PAGE_BY_PORTAL.teacher;
    return {
      portal: 'teacher',
      page: VALID_TEACHER_PAGES.has(page) ? page : DEFAULT_PAGE_BY_PORTAL.teacher,
      params,
    };
  }

  if (rawPortal === 'admin') {
    const page = segments[1]?.toLowerCase() || DEFAULT_PAGE_BY_PORTAL.admin;
    return {
      portal: 'admin',
      page: VALID_ADMIN_PAGES.has(page) ? page : DEFAULT_PAGE_BY_PORTAL.admin,
      params,
    };
  }

  if (rawPortal === 'public') {
    const page = segments[1]?.toLowerCase() || DEFAULT_PAGE_BY_PORTAL.public;
    return {
      portal: 'public',
      page: VALID_PUBLIC_PAGES.has(page) ? page : DEFAULT_PAGE_BY_PORTAL.public,
      params,
    };
  }

  // Redirect removed separate course pages to landing curriculum grid
  if (rawPortal === 'courses' || rawPortal === 'course_details') {
    return {
      portal: 'public',
      page: 'landing',
      params: { scrollTo: 'curriculum-grid', ...params },
    };
  }

  // Direct public routes: /about, /contact
  if (VALID_PUBLIC_PAGES.has(rawPortal)) {
    return {
      portal: 'public',
      page: rawPortal,
      params,
    };
  }

  // Backward compatibility: If URL is e.g. /catalog or /dashboard directly
  if (VALID_STUDENT_PAGES.has(segments[0])) {
    return {
      portal: 'student',
      page: segments[0],
      params,
    };
  }

  return null;
}

/**
 * Push a new state entry to browser history stack and update the address bar.
 */
export function pushHistoryState(portal: PortalMode, page: string, params?: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.history) return;

  const url = serializeRouteToUrl(portal, page, params);
  const currentUrl = window.location.pathname + window.location.search;

  if (currentUrl === url) return;

  const state: AppRouteState = {
    portal,
    page,
    params: params || {},
  };

  try {
    window.history.pushState(state, '', url);
  } catch (err) {
    console.warn('Failed to push history state:', err);
  }
}

/**
 * Replace the current history state without creating a new entry.
 * Useful for initial mount sync, portal switches, and auth redirection.
 */
export function replaceHistoryState(portal: PortalMode, page: string, params?: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.history) return;

  const url = serializeRouteToUrl(portal, page, params);
  const state: AppRouteState = {
    portal,
    page,
    params: params || {},
  };

  try {
    window.history.replaceState(state, '', url);
  } catch (err) {
    console.warn('Failed to replace history state:', err);
  }
}
