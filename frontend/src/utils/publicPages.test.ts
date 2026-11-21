import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { storage } from '../services/storageService.ts';
import {
  parseUrlToRoute,
  serializeRouteToUrl,
  DEFAULT_PAGE_BY_PORTAL,
  VALID_PUBLIC_PAGES,
} from '../services/routerService.ts';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage.tsx';
import { AboutPage } from '../pages/public/AboutPage.tsx';
import { ContactPage } from '../pages/public/ContactPage.tsx';

describe('Public Marketing & Academic Site Suite (e2e-testing-patterns)', () => {
  const mockCourse = {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'Introduction to Computer Science & Python',
    description: 'Foundational programming concepts, algorithmic reasoning, control structures.',
    status: 'published' as const,
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-10-18T08:15:00Z',
  };
  const courses = [mockCourse];
  const serviceHealth = storage.getServiceHealth();

  describe('Journey 1: Public URL Routing & Deep-Linking', () => {
    it('serializeRouteToUrl produces clean semantic URLs for public routes', () => {
      assert.equal(serializeRouteToUrl('public', 'landing'), '/');
      assert.equal(serializeRouteToUrl('public', 'about'), '/about');
      assert.equal(serializeRouteToUrl('public', 'contact'), '/contact');
    });

    it('parseUrlToRoute correctly deserializes direct public routes', () => {
      const aboutRoute = parseUrlToRoute('/about');
      assert.deepEqual(aboutRoute, {
        portal: 'public',
        page: 'about',
        params: {},
      });

      const contactRoute = parseUrlToRoute('/contact');
      assert.deepEqual(contactRoute, {
        portal: 'public',
        page: 'contact',
        params: {},
      });

      // Old /courses or /course_details URLs automatically redirect to landing curriculum-grid
      const coursesRoute = parseUrlToRoute('/courses');
      assert.deepEqual(coursesRoute, {
        portal: 'public',
        page: 'landing',
        params: { scrollTo: 'curriculum-grid' },
      });

      const detailRoute = parseUrlToRoute('/course_details', '?courseId=course-cs101');
      assert.deepEqual(detailRoute, {
        portal: 'public',
        page: 'landing',
        params: { scrollTo: 'curriculum-grid', courseId: 'course-cs101' },
      });
    });

    it('parseUrlToRoute maintains root null contract for backward compatibility', () => {
      assert.equal(parseUrlToRoute('/'), null);
      assert.equal(parseUrlToRoute(''), null);
    });
  });

  describe('Journey 2: Landing Page & 3D Holographic Cortex Rendering', () => {
    it('LandingPage renders hero headline, 3D particle brain cortex container, curriculum registry, and rankings', () => {
      const html = renderToString(
        React.createElement(LandingPage, {
          courses,
          onNavigate: () => {},
          onSwitchToTeacher: () => {},
          onSwitchToAdmin: () => {},
        })
      );

      assert.ok(html.includes('Revolutionize Your'), 'Must contain hero headline');
      assert.ok(html.includes('Learning'), 'Must contain hero headline gradient');
      assert.ok(html.includes('NEURAL ENGINE ACTIVE'), 'Must show cyber telemetry badge');
      assert.ok(html.includes('Verified University Curriculum'), 'Must contain curriculum registry section');
      assert.ok(html.includes('Curriculum Registry'), 'Must contain curriculum title badge');
      assert.ok(html.includes('Top University Scholars'), 'Must contain global rankings preview');
      assert.ok(html.includes('A Platform Engineered for Verifiable Competence'), 'Must contain architectural pillars');
      assert.ok(html.includes('Teacher Studio'), 'Must contain teacher studio button');
      assert.ok(html.includes('Governance'), 'Must contain governance button');
    });

    it('LandingPage renders verified course cards with Module badges, Enroll Now and Syllabus actions', () => {
      const html = renderToString(
        React.createElement(LandingPage, {
          courses,
          onNavigate: () => {},
          onSwitchToTeacher: () => {},
          onSwitchToAdmin: () => {},
        })
      );

      assert.ok(html.includes('MODULE 01'), 'Must display module index');
      assert.ok(html.includes('Verified'), 'Must display verified status pill');
      assert.ok(html.includes('Enroll Now'), 'Must provide Enroll Now CTA');
      assert.ok(html.includes('Syllabus'), 'Must provide Syllabus CTA');
    });

    it('LandingPage reflects enrolled student session with "Active" badge and "Open Map"', () => {
      const mockEnrollments = [
        {
          id: 'enr-demo-1',
          studentId: 'student-101',
          courseId: courses[0]?.id || 'course-1',
          status: 'active' as const,
          enrolledAt: new Date().toISOString(),
          progressPercent: 45,
        },
      ];

      const html = renderToString(
        React.createElement(LandingPage, {
          courses,
          enrollments: mockEnrollments,
          currentStudent: {
            id: 'student-101',
            name: 'Alex Rivera',
            email: 'alex@learnova.edu',
            role: 'student',
            joinDate: '2026-09-01T00:00:00Z',
            preferences: { theme: 'dark', leaderboardOptIn: true, emailNotifications: true },
          },
          onNavigate: () => {},
          onSwitchToTeacher: () => {},
          onSwitchToAdmin: () => {},
        })
      );

      assert.ok(html.includes('Active'), 'Must display Active status pill for enrolled course');
      assert.ok(html.includes('Open Map'), 'Must display Open Map button for enrolled course');
      assert.ok(html.includes('Student Portal'), 'Must show Student Portal button in navbar when logged in');
    });
  });

  describe('Journey 3: About Us Full-Width Academic Experience', () => {
    it('AboutPage renders full-width layout, telemetry stats bar, 3 core pillars, and mission', () => {
      const html = renderToString(
        React.createElement(AboutPage, {
          onNavigate: () => {},
          onSwitchToTeacher: () => {},
          onSwitchToAdmin: () => {},
        })
      );

      assert.ok(html.includes('Architecting the Future of'), 'Manifesto headline check');
      assert.ok(html.includes('Adaptive Intelligence'), 'Headline gradient check');
      assert.ok(html.includes('Mastery Precision'), 'Telemetry stat 1 check');
      assert.ok(html.includes('99.8%'), 'Mastery precision value check');
      assert.ok(html.includes('Prerequisite Engine'), 'Telemetry stat 2 check');
      assert.ok(html.includes('0 Cycles'), 'DAG cycles value check');
      assert.ok(html.includes('How Learnova Works'), '3 Pillars section check');
      assert.ok(html.includes('Bayesian Knowledge Tracing'), 'Pillar 1 check');
      assert.ok(html.includes('Directed Acyclic Graphs (DAG)'), 'Pillar 2 check');
      assert.ok(html.includes('Faculty Governance &amp; Rigor') || html.includes('Faculty Governance & Rigor'), 'Pillar 3 check');
      assert.ok(html.includes('Empowering Students with Sovereign Mastery'), 'Mission section check');
      assert.ok(html.includes('Platform Safeguards'), 'Platform safeguards checklist check');
      assert.ok(html.includes('w-full'), 'Full width container check');
    });
  });

  describe('Journey 4: Contact Us Full-Width Operations Gateway', () => {
    it('ContactPage renders full-width layout, departmental channel cards, transmission form, and 2-column FAQs', () => {
      const html = renderToString(
        React.createElement(ContactPage, {
          serviceHealth,
          onNavigate: () => {},
          onSwitchToTeacher: () => {},
          onSwitchToAdmin: () => {},
        })
      );

      assert.ok(html.includes('Get in Touch with'), 'Heading check');
      assert.ok(html.includes('Academic Operations'), 'Heading gradient check');
      assert.ok(html.includes('Admissions &amp; Learning Advisory') || html.includes('Admissions & Learning Advisory'), 'Card 1 check');
      assert.ok(html.includes('Faculty Studio &amp; Curriculum Research') || html.includes('Faculty Studio & Curriculum Research'), 'Card 2 check');
      assert.ok(html.includes('Institutional Licensing &amp; Security') || html.includes('Institutional Licensing & Security'), 'Card 3 check');
      assert.ok(html.includes('Direct Departmental Transmission'), 'Form header check');
      assert.ok(html.includes('Transmit Message'), 'Submit button check');
      assert.ok(html.includes('Frequently Addressed Queries'), 'FAQ section check');
      assert.ok(html.includes('How does Learnova verify my topic mastery?'), 'FAQ 1 question check');
      assert.ok(html.includes('w-full'), 'Full width layout check');
    });
  });

  describe('Journey 5: BKT Mathematical Invariants Verification', () => {
    it('Bayesian Knowledge Tracing update formula yields exact predicted probabilities', () => {
      const P_L0 = 0.20;
      const P_TRANSIT = 0.15;
      const P_SLIP = 0.10;
      const P_GUESS = 0.20;

      // First observation: Correct answer (obs = 1)
      const num1 = P_L0 * (1 - P_SLIP); // 0.20 * 0.90 = 0.18
      const den1 = num1 + (1 - P_L0) * P_GUESS; // 0.18 + 0.80 * 0.20 = 0.34
      const posterior1 = num1 / den1; // ~0.52941
      const updated1 = posterior1 + (1 - posterior1) * P_TRANSIT; // ~0.6000

      assert.ok(Math.abs(updated1 - 0.60) < 0.01, 'Step 1 mastery should be ~60%');

      // Second observation: Correct answer (obs = 1)
      const num2 = updated1 * (1 - P_SLIP); // ~0.60 * 0.90 = 0.54
      const den2 = num2 + (1 - updated1) * P_GUESS; // 0.54 + 0.40 * 0.20 = 0.62
      const posterior2 = num2 / den2; // ~0.871
      const updated2 = posterior2 + (1 - posterior2) * P_TRANSIT; // ~0.890

      assert.ok(updated2 >= 0.80, 'Second correct answer must surpass 80% mastery threshold');
    });
  });
});
