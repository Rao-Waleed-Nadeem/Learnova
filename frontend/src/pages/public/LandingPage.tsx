import React, { useState, useEffect, useRef } from 'react';
import { Course, Enrollment, StudentUser, LeaderboardEntry } from '../../types';
import { UserResponse } from '../../services/api/authApi';
import { gamificationApi } from '../../services/api/gamificationApi';
import {
  ArrowRight,
  BookOpen,
  Search,
  CheckCircle,
  Layers,
  Sparkles,
  Award,
  Grid,
  ChevronDown,
  Compass,
  BarChart2,
  Trophy,
  ShieldCheck,
  ArrowUpRight,
  Menu,
  X
} from 'lucide-react';

import { DalaParticleBrain } from '../../components/public/DalaParticleBrain';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Reusable section wrapper with bidirectional scroll-triggered fade in & fade out animation
 */
const FadeInSection: React.FC<{
  children: React.ReactNode;
  id?: string;
  className?: string;
}> = ({ children, id, className = '' }) => {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const el = domRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Fade in when visible, smoothly fade out when scrolled out of view
        setVisible(entry.isIntersecting);
      },
      {
        threshold: 0.08,
        rootMargin: '20px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      id={id}
      className={`transition-all duration-700 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-10 scale-[0.99]'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface LandingPageProps {
  courses: Course[];
  enrollments?: Enrollment[];
  leaderboard?: LeaderboardEntry[];
  currentUser?: UserResponse | null;
  currentStudent?: StudentUser | null;
  navParams?: Record<string, string>;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSwitchToTeacher: () => void;
  onSwitchToAdmin: () => void;
  onEnrollCourse?: (courseId: string) => void;
  topics?: any[];
  lessons?: any[];
  onEnterPortal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  courses,
  enrollments = [],
  leaderboard,
  currentUser,
  currentStudent,
  navParams,
  onNavigate,
  onSwitchToTeacher,
  onSwitchToAdmin,
  onEnrollCourse,
}) => {
  const [topScholars, setTopScholars] = useState<Array<{ rank: number; name: string; xp: number; topicsMastered?: number }>>(() => {
    if (leaderboard && leaderboard.length > 0) {
      return leaderboard.slice(0, 3).map((e, idx) => ({
        rank: e.rank || idx + 1,
        name: e.displayName || 'Scholar',
        xp: e.xp || 0,
        topicsMastered: e.earnedBadgesCount || Math.floor((e.xp || 0) / 200),
      }));
    }
    return [
      { rank: 1, name: 'Sophia Lin', xp: 4850, topicsMastered: 24 },
      { rank: 2, name: 'Marcus Vance', xp: 4210, topicsMastered: 21 },
      { rank: 3, name: 'Elena Rostova', xp: 3980, topicsMastered: 19 },
    ];
  });

  useEffect(() => {
    if (leaderboard && leaderboard.length > 0) {
      setTopScholars(
        leaderboard.slice(0, 3).map((e, idx) => ({
          rank: e.rank || idx + 1,
          name: e.displayName || 'Scholar',
          xp: e.xp || 0,
          topicsMastered: e.earnedBadgesCount || Math.floor((e.xp || 0) / 200),
        }))
      );
    }
  }, [leaderboard]);

  useEffect(() => {
    gamificationApi.getLeaderboard(undefined, 3).then((res) => {
      const list = res.entries || res.leaderboard || [];
      if (list.length > 0) {
        setTopScholars(
          list.slice(0, 3).map((e, idx) => ({
            rank: e.rank || idx + 1,
            name: e.display_name || 'Scholar',
            xp: e.xp || 0,
            topicsMastered: e.earned_badges_count ? e.earned_badges_count * 4 : Math.floor((e.xp || 0) / 200),
          }))
        );
      }
    }).catch(() => {});
  }, []);
  const effectiveStudent = currentStudent || (currentUser ? {
    id: currentUser.id,
    name: currentUser.full_name || currentUser.email,
    email: currentUser.email,
    avatar: currentUser.profile?.avatar_url || undefined,
    role: (currentUser.role || 'student') as any,
    joinDate: currentUser.created_at || new Date().toISOString(),
    preferences: {
      theme: 'dark' as const,
      leaderboardOptIn: true,
      emailNotifications: true,
    },
  } : null);

  const rawRole = currentUser?.role || (currentStudent ? 'student' : null);
  const portalLabel =
    rawRole === 'teacher'
      ? 'Teacher Portal'
      : rawRole === 'administrator'
      ? 'Admin Portal'
      : rawRole === 'student'
      ? 'Student Portal'
      : null;

  const handlePortalButtonClick = () => {
    if (rawRole === 'teacher') {
      if (onSwitchToTeacher) onSwitchToTeacher();
      else onNavigate('teacher_portal');
    } else if (rawRole === 'administrator') {
      if (onSwitchToAdmin) onSwitchToAdmin();
      else onNavigate('admin_portal');
    } else {
      onNavigate('dashboard');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DALA 3D PARTICLE BRAIN ENGINE — Pinterest Pin 418905202857789895 Inspired
  // Interactive WebGL 3D Holographic Brain Cortex with 4,800 iridescent particles,
  // floating wireframe prisms, mouse parallax, and 1:1 scroll turntable rotation
  // ══════════════════════════════════════════════════════════════════════════
  const heroProgressRef = useRef<number>(0);
  const ribbonRef       = useRef<HTMLDivElement | null>(null);

  const [activeStage, setActiveStage]       = useState(0);
  const activeStageRef                       = useRef(0);
  const [searchQuery, setSearchQuery]        = useState('');
  const [mobileMenuOpen, setMobileMenuOpen]  = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const heroRef       = useRef<HTMLDivElement>(null);
  const heroTrackRef  = useRef<HTMLDivElement>(null);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const publishedCourses  = courses.filter((c) => c.status === 'published' || !c.status);
  const filteredCourses   = publishedCourses.filter((course) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return course.title.toLowerCase().includes(q) ||
        (course.description && course.description.toLowerCase().includes(q));
    }
    return true;
  });

  // Smooth scroll to curriculum grid when requested via navParams
  useEffect(() => {
    if (navParams?.scrollTo === 'curriculum-grid') {
      const timer = setTimeout(() => {
        const gridEl = document.getElementById('curriculum-grid');
        gridEl?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [navParams]);

  // ── GSAP ScrollTrigger: scrub:true drives 3D turntable particle rotation ──
  useEffect(() => {
    const track = heroTrackRef.current;
    if (!track) return;

    const st = ScrollTrigger.create({
      trigger : track,
      start   : 'top top',
      end     : 'bottom bottom',
      scrub   : true,
      onUpdate: (self) => {
        const p = self.progress;
        heroProgressRef.current = p;

        if (ribbonRef.current)
          ribbonRef.current.style.opacity = String(0.35 + p * 0.65);

        setIsScrolledPastHero(p > 0.95);
        const stage = p < 0.33 ? 0 : p < 0.67 ? 1 : 2;
        if (stage !== activeStageRef.current) {
          activeStageRef.current = stage;
          setActiveStage(stage);
        }
      },
    });
    return () => { st.kill(); };
  }, []);

  // ── KEYBOARD NAVIGATION ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const track = heroTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const totalScroll = track.offsetHeight - window.innerHeight;
      const scrollProgress = totalScroll > 0 ? window.scrollY / totalScroll : 0;
      if (['ArrowDown', 'PageDown', ' '].includes(e.key) && scrollProgress < 0.985) {
        e.preventDefault();
        const nextY = Math.min(totalScroll, window.scrollY + 180);
        window.scrollTo({ top: nextY, behavior: 'smooth' });
      } else if (['ArrowUp', 'PageUp'].includes(e.key) && scrollProgress > 0.015) {
        e.preventDefault();
        const prevY = Math.max(0, window.scrollY - 180);
        window.scrollTo({ top: prevY, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectStage = (stageIdx: number) => {
    const track = heroTrackRef.current;
    if (!track) return;
    const totalScroll = track.offsetHeight - window.innerHeight;
    const targets = [0.0, 0.5, 1.0];
    const targetY = (targets[stageIdx] ?? 0) * totalScroll;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const scrollToCurriculum = () => {
    setMobileMenuOpen(false);
    const gridEl = document.getElementById('curriculum-grid');
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToRankings = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('rankings-preview');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('leaderboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#03050C] text-[#F8FAFC] selection:bg-white/20 selection:text-white relative">
      
      {/* Background Ambient Cybernetic Obsidian Space Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[800px] h-[700px] bg-gradient-to-tr from-cyan-950/20 via-blue-950/20 to-transparent rounded-full blur-[160px] opacity-60" />
        <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-blue-950/15 rounded-full blur-[140px] opacity-50" />
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL FIXED GLASSMORPHIC NAVBAR                                          */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#03050C]/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 lg:px-14 h-16 sm:h-20 flex items-center justify-between transition-all">
        {/* Brand Title */}
        <div
          onClick={() => selectStage(0)}
          className="cursor-pointer group flex items-center gap-3 shrink-0"
        >
          <img
            src="/learnova-logo.png"
            alt="Learnova"
            className="h-8 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          />
          <span className="font-sans text-sm sm:text-base font-bold tracking-[0.25em] uppercase text-white group-hover:text-cyan-300 transition-colors">
            Learnova
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
          <button
            type="button"
            onClick={() => selectStage(0)}
            className={`relative py-1 transition-colors cursor-pointer ${
              !isScrolledPastHero ? 'text-white' : 'hover:text-white'
            }`}
          >
            <span>Home</span>
            {!isScrolledPastHero && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            )}
          </button>

          <button
            type="button"
            onClick={scrollToCurriculum}
            className="relative py-1 hover:text-white transition-colors cursor-pointer"
          >
            <span>Courses</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="relative py-1 hover:text-white transition-colors cursor-pointer"
          >
            <span>About</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="relative py-1 hover:text-white transition-colors cursor-pointer"
          >
            <span>Contact</span>
          </button>
        </nav>

        {/* Right Auth / Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {portalLabel ? (
            <button
              type="button"
              onClick={handlePortalButtonClick}
              className="px-5 py-2.5 rounded-full text-xs font-bold btn-primary-pill flex items-center gap-2 cursor-pointer"
            >
              <span>{portalLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('sign_in')}
                className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] hover:text-white px-3 py-1.5 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all cursor-pointer backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.06)]"
              >
                Get Started
              </button>
            </>
          )}

          {/* Quick Curriculum Shortcut */}
          <button
            type="button"
            onClick={scrollToCurriculum}
            className="hidden sm:block p-2 text-white/60 hover:text-white transition cursor-pointer"
            title="Jump to Curriculum Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/5 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#03050C]/95 backdrop-blur-xl pt-20 px-6 pb-8 flex flex-col justify-between lg:hidden animate-fade-in">
          <div className="space-y-4 pt-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82F6]">Navigation</span>
            <div className="flex flex-col space-y-3 text-sm font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => {
                  selectStage(0);
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-white hover:text-cyan-400 border-b border-white/5"
              >
                01. Home
              </button>
              <button
                type="button"
                onClick={() => {
                  scrollToCurriculum();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-white hover:text-cyan-400 border-b border-white/5"
              >
                02. Courses
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('about');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-white hover:text-cyan-400 border-b border-white/5"
              >
                03. About
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('contact');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-white hover:text-cyan-400 border-b border-white/5"
              >
                04. Contact Us
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-3">
            {!portalLabel ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('sign_in');
                    setMobileMenuOpen(false);
                  }}
                  className="py-3 text-center rounded-xl border border-white/20 text-xs font-semibold uppercase tracking-wider text-white"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('register');
                    setMobileMenuOpen(false);
                  }}
                  className="py-3 text-center rounded-xl bg-[#2563EB] text-xs font-semibold uppercase tracking-wider text-white shadow-md shadow-blue-600/40"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handlePortalButtonClick();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 text-center rounded-xl bg-[#2563EB] text-xs font-semibold uppercase tracking-wider text-white shadow-md shadow-blue-600/40"
              >
                Enter {portalLabel} →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HERO SECTION: FULL-SCREEN CYBERNETIC MUSEUM VIEWPORT                     */}
      {/* 250vh Native Sticky Scroll Track for 120 FPS hardware-accelerated 3D turn */}
      {/* ========================================================================= */}
      <div ref={heroTrackRef} className="relative h-[250vh] w-full">
        <div
          ref={heroRef}
          className="sticky top-0 h-screen min-h-[700px] w-full flex flex-col justify-between pt-20 sm:pt-24 pb-0 px-4 sm:px-10 lg:px-16 overflow-hidden bg-[#03050C] z-10"
        >
        {/* Fullscreen Subtle Architectural Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-6 pointer-events-none opacity-10">
          <div className="border-r border-white/15 h-full" />
          <div className="border-r border-white/15 h-full" />
          <div className="border-r border-white/15 h-full" />
          <div className="border-r border-white/15 h-full" />
          <div className="border-r border-white/15 h-full" />
          <div className="h-full" />
        </div>

        {/* Cyber Laser Scanline Beam drifting vertically across hero */}
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent pointer-events-none animate-scanline z-10" />

        {/* Ambient Neural Backlight Gradient — Focused solely on right quadrant */}
        <div className="absolute right-[-5%] top-[15%] w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] rounded-full pointer-events-none blur-[140px] bg-[radial-gradient(circle,rgba(34,211,238,0.10)_0%,rgba(37,99,235,0.05)_50%,transparent_75%)]" />

        {/* Deep Dark Protective Backdrop for Left Text Column */}
        <div className="absolute inset-y-0 left-0 w-full sm:w-3/4 lg:w-3/5 pointer-events-none z-22 bg-gradient-to-r from-[#03050C] via-[#03050C]/95 via-60% to-transparent" />

        {/* Left Vertical Pagination Indicator */}
        <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3.5">
          <button
            type="button"
            onClick={() => selectStage(0)}
            className={`transition-all duration-300 cursor-pointer ${
              activeStage === 0
                ? 'w-7 h-1 bg-white rounded-full shadow-[0_0_8px_white]'
                : 'w-2 h-2 rounded-full bg-white/25 hover:bg-white/60'
            }`}
            title="Stage 1: Overview"
          />
          <button
            type="button"
            onClick={() => selectStage(1)}
            className={`transition-all duration-300 cursor-pointer ${
              activeStage === 1
                ? 'w-7 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]'
                : 'w-2 h-2 rounded-full bg-white/25 hover:bg-white/60'
            }`}
            title="Stage 2: Methodology"
          />
          <button
            type="button"
            onClick={() => selectStage(2)}
            className={`transition-all duration-300 cursor-pointer ${
              activeStage === 2
                ? 'w-7 h-1 bg-white rounded-full shadow-[0_0_8px_white]'
                : 'w-2 h-2 rounded-full bg-white/25 hover:bg-white/60'
            }`}
            title="Stage 3: Capability & Action"
          />
        </div>

        {/* ===================================================================== */}
        {/* FLOATING STARDUST & COSMIC PARTICLES (Surrounding Space)              */}
        {/* ===================================================================== */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-15">
          <div className="absolute top-[18%] right-[36%] w-1.5 h-1.5 rounded-full bg-white/90 shadow-[0_0_10px_white] animate-stardust" style={{ animationDelay: '0s' }} />
          <div className="absolute top-[28%] right-[26%] w-1 h-1 rounded-full bg-cyan-300/80 shadow-[0_0_8px_#22d3ee] animate-stardust" style={{ animationDelay: '1.2s' }} />
          <div className="absolute top-[48%] right-[32%] w-1.5 h-1.5 rounded-full bg-white/75 shadow-[0_0_8px_white] animate-stardust" style={{ animationDelay: '2.5s' }} />
          <div className="absolute top-[22%] right-[16%] w-1.5 h-1.5 rounded-full bg-amber-300/85 shadow-[0_0_8px_#f59e0b] animate-stardust" style={{ animationDelay: '1.8s' }} />
          <div className="absolute top-[62%] right-[18%] w-2 h-2 rounded-full bg-cyan-400/90 shadow-[0_0_12px_#22d3ee] animate-stardust" style={{ animationDelay: '3.6s' }} />
          <div className="absolute top-[38%] right-[8%] w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_8px_white] animate-stardust" style={{ animationDelay: '4.2s' }} />
          <div className="absolute top-[72%] right-[28%] w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_6px_#f59e0b] animate-stardust" style={{ animationDelay: '2.9s' }} />
          <div className="absolute top-[14%] right-[22%] w-2 h-2 rounded-full bg-white/95 shadow-[0_0_12px_white] animate-stardust" style={{ animationDelay: '5s' }} />
        </div>

        {/* ================================================================== */}
        {/* DALA 3D PARTICLE BRAIN — WebGL Holographic Cortex                 */}
        {/* Multi-spectral 3D brain with glowing particles and turntable rotation */}
        {/* ================================================================== */}
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
          {/* Ethereal luminous energy ribbon wave */}
          <div
            ref={ribbonRef}
            className="absolute right-[5%] top-[20%] w-[420px] h-[300px] rounded-full blur-3xl pointer-events-none animate-ribbon-wave bg-gradient-to-r from-blue-600/15 via-cyan-500/20 to-purple-600/10"
            style={{ opacity: 0.35 }}
          />

          {/* Three.js Holographic Brain Canvas Container */}
          <div className="w-full h-full relative">
            <DalaParticleBrain progressRef={heroProgressRef} />
          </div>
        </div>

        {/* ===================================================================== */}
        {/* STAGE CONTENT CONTAINERS                                              */}
        {/* ===================================================================== */}
        <div className="relative flex-1 flex items-center px-4 sm:px-10 lg:px-16 py-8 z-30">
          
          {/* STAGE 0: Overview */}
          <div
            className={`max-w-2xl pl-2 sm:pl-8 transition-all duration-500 ease-out ${
              activeStage === 0
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-6 pointer-events-none absolute'
            }`}
          >
            {/* Pill Badges with Live Cyber Telemetry */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.8)] w-fit">
                <span className="px-1.5 py-0.5 rounded-full bg-white text-[9px] font-bold text-black uppercase tracking-wider">
                  NEW
                </span>
                <span className="text-xs text-white font-medium">
                  Latest integration just arrived
                </span>
              </div>

              {/* High-tech Cyber HUD telemetry pill */}
              <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-400/40 backdrop-blur-md text-[10px] font-mono text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
                <span className="font-semibold tracking-wider">NEURAL ENGINE ACTIVE</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="font-sans text-[clamp(1.75rem,3.8vw,3.25rem)] font-extrabold tracking-tight text-white leading-[1.1] drop-shadow-[0_4px_30px_rgba(0,0,0,0.98)]">
              Revolutionize Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.5)]">
                Learning
              </span>{' '}
              with AI
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-sm sm:text-lg text-slate-100 font-normal leading-relaxed max-w-lg drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
              Experience cutting-edge solutions designed to elevate productivity and deliver results like never before.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate(effectiveStudent ? 'dashboard' : 'register')}
                className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white font-semibold text-sm transition-all duration-300 backdrop-blur-md shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2 cursor-pointer group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={scrollToCurriculum}
                className="px-7 py-3.5 rounded-full border border-white/20 hover:border-white/50 bg-white/[0.05] hover:bg-white/[0.12] text-white font-medium text-sm transition-all cursor-pointer backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              >
                Explore Curriculum
              </button>
            </div>
          </div>

          {/* STAGE 1: Synaptic Neural Methodology */}
          <div
            className={`max-w-xl pl-2 sm:pl-8 space-y-6 transition-all duration-500 ease-out ${
              activeStage === 1
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-6 pointer-events-none absolute'
            }`}
          >
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-md mb-2 w-fit shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-400 text-[9px] font-bold text-black uppercase tracking-wider">
                SYSTEM
              </span>
              <span className="text-xs text-white font-medium">
                Directed Acyclic Synaptic Graph
              </span>
            </div>

            {/* Row 1 */}
            <div className="space-y-1.5 group cursor-pointer" onClick={scrollToCurriculum}>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-cyan-400 font-mono font-bold">01</span>
                <h3 className="font-sans font-bold text-2xl sm:text-3xl text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  Prerequisite Knowledge DAG
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Concepts are sequenced mathematically. Foundational topics prevent dead ends, ensuring cognitive readiness before unlocking advanced domains.
              </p>
            </div>

            {/* Row 2 */}
            <div className="space-y-1.5 group cursor-pointer" onClick={() => onNavigate(effectiveStudent ? 'progress' : 'sign_in')}>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-cyan-400 font-mono font-bold">02</span>
                <h3 className="font-sans font-bold text-2xl sm:text-3xl text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  Bayesian Knowledge Tracing
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Server-authoritative evaluations dynamically compute probability of mastery per topic, tailoring adaptive practice to individual cognitive gaps.
              </p>
            </div>

            {/* Row 3 */}
            <div className="space-y-1.5 group cursor-pointer" onClick={onSwitchToTeacher}>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-cyan-400 font-mono font-bold">03</span>
                <h3 className="font-sans font-bold text-2xl sm:text-3xl text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  Accredited Faculty Studio
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Curriculum, assessments, and rubrics are curated and audited by practicing faculty, maintaining university rigor and credential integrity.
              </p>
            </div>
          </div>

          {/* STAGE 2: Level Up & Action View */}
          <div
            className={`max-w-2xl pl-2 sm:pl-8 transition-all duration-500 ease-out ${
              activeStage === 2
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-6 pointer-events-none absolute'
            }`}
          >
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-md mb-6 w-fit shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[9px] font-bold text-black uppercase tracking-wider">
                ACCELERATE
              </span>
              <span className="text-xs text-white font-medium">
                Elevate Your Potential
              </span>
            </div>

            <h2 className="font-sans text-[clamp(1.5rem,3vw,2.5rem)] text-white font-extrabold leading-[1.15] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              Built for career <br />
              switchers, juniors, and <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-amber-300">
                creators ready to level up.
              </span>
            </h2>
            <p className="mt-4 text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              You enter with one set of beliefs, tools, and self-perception — and leave with a verifiable new identity.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={scrollToCurriculum}
                className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white font-semibold text-sm transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] cursor-pointer flex items-center gap-2 group"
              >
                <span>Explore Course Catalog</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="px-7 py-3.5 rounded-full border border-white/20 hover:border-white/50 bg-white/[0.05] hover:bg-white/[0.12] text-white font-medium text-sm transition cursor-pointer backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              >
                Start Free Trial
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>

      {/* ========================================================================= */}
      {/* SECTION 2: VERIFIED CURRICULUM GRID (Scroll Fade In & Fade Out)           */}
      {/* ========================================================================= */}
      <div className="relative z-10 p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto">
        <FadeInSection id="curriculum-grid" className="pt-12 sm:pt-20 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                Curriculum Registry
              </span>
              <h2 className="font-sans font-bold text-2xl sm:text-4xl text-white mt-1 tracking-tight">
                Verified University Curriculum
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Filter courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[#060813] border border-white/10 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="shrink-0 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition cursor-pointer backdrop-blur-md"
              >
                All Courses
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-10">
            {filteredCourses.slice(0, 6).map((course, idx) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              return (
                <div
                  key={course.id || idx}
                  className="rounded-3xl bg-[#060813] border border-white/10 p-6 sm:p-7 hover:border-cyan-500/50 shadow-lg hover:shadow-cyan-950/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group animate-fade-in"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-[#64748B] mb-3">
                      <span>{`MODULE ${String(idx + 1).padStart(2, '0')}`}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold ${
                        isEnrolled ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-cyan-950/50 text-cyan-300 border border-cyan-800'
                      }`}>
                        {isEnrolled ? 'Active' : 'Verified'}
                      </span>
                    </div>

                    <h3
                      onClick={() => {
                        if (isEnrolled) {
                          onNavigate('course_map', { courseId: course.id });
                        } else if (effectiveStudent && onEnrollCourse) {
                          onEnrollCourse(course.id);
                        } else {
                          onNavigate('sign_in', { courseId: course.id });
                        }
                      }}
                      className="font-sans font-bold text-xl text-white group-hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {course.title}
                    </h3>

                    <p className="mt-2.5 text-xs text-[#94A3B8] line-clamp-3 leading-relaxed">
                      {course.description || 'Comprehensive curriculum covering foundational theory, guided practice modules, and real-world project mastery.'}
                    </p>
                  </div>

                  <div className="pt-5 mt-6 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEnrolled) {
                          onNavigate('course_map', { courseId: course.id });
                        } else if (effectiveStudent && onEnrollCourse) {
                          onEnrollCourse(course.id);
                        } else {
                          onNavigate('sign_in', { courseId: course.id });
                        }
                      }}
                      className="text-xs font-semibold text-[#94A3B8] hover:text-white flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{isEnrolled ? 'View Roadmap' : 'Syllabus'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isEnrolled) {
                          onNavigate('course_map', { courseId: course.id });
                        } else if (effectiveStudent && onEnrollCourse) {
                          onEnrollCourse(course.id);
                        } else {
                          onNavigate('sign_in', { courseId: course.id });
                        }
                      }}
                      className="px-4 py-2 rounded-full text-xs font-bold btn-primary-pill shadow-sm cursor-pointer"
                    >
                      {isEnrolled ? 'Open Map' : 'Enroll Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </FadeInSection>

        {/* ========================================================================= */}
        {/* SECTION 3: GLOBAL RANKINGS PREVIEW (Scroll Fade In & Fade Out)            */}
        {/* ========================================================================= */}
        <FadeInSection id="rankings-preview" className="mt-8 mb-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#060813] border border-white/10 relative overflow-hidden">
            <div className="absolute left-0 bottom-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                  Global Competence Rankings
                </span>
                <h2 className="font-sans font-bold text-2xl sm:text-3xl text-white mt-1 tracking-tight">
                  Top University Scholars
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('leaderboard')}
                className="shrink-0 px-5 py-2.5 rounded-full btn-primary-pill text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer w-fit"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 relative z-10">
              {topScholars.map((scholar, idx) => {
                const rankColor = idx === 0
                  ? 'text-amber-400 border-amber-500/30 bg-amber-500/20'
                  : idx === 1
                  ? 'text-slate-300 border-slate-400/30 bg-slate-400/20'
                  : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/20';
                const hoverBorder = idx === 0
                  ? 'hover:border-amber-500/50'
                  : idx === 1
                  ? 'hover:border-slate-400/50'
                  : 'hover:border-cyan-500/50';
                const rankText = idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-400' : 'text-cyan-400';

                return (
                  <div
                    key={idx}
                    onClick={() => onNavigate('leaderboard')}
                    className={`p-5 rounded-2xl bg-white/[0.03] border border-white/10 ${hoverBorder} transition cursor-pointer flex items-center gap-4 group`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-lg shrink-0 ${rankColor}`}>
                      {idx === 0 ? <Trophy className="w-6 h-6 text-amber-400" /> : <Award className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className={`text-[11px] font-mono ${rankText}`}>
                        {`RANK #${String(scholar.rank).padStart(2, '0')}`}
                      </div>
                      <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {scholar.name}
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        {`${(scholar.xp || 0).toLocaleString()} XP • ${scholar.topicsMastered || 0} Topics Mastered`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeInSection>

        {/* ========================================================================= */}
        {/* SECTION 4: ARCHITECTURAL PILLARS BANNER (Scroll Fade In & Fade Out)       */}
        {/* ========================================================================= */}
        <FadeInSection id="academic-governance" className="mt-8 mb-10">
          <section className="p-8 sm:p-12 rounded-3xl bg-[#060813] border border-white/10 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                Academic Integrity & Governance
              </span>
              <h2 className="font-sans font-bold text-2xl sm:text-3xl text-white mt-1 tracking-tight">
                A Platform Engineered for Verifiable Competence
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-8 relative z-10">
              <div
                onClick={scrollToCurriculum}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 transition cursor-pointer space-y-2 group"
              >
                <div className="text-[11px] font-mono text-cyan-400">01 / TOPOLOGY</div>
                <h3 className="font-sans font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">
                  Knowledge Graph DAG
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Prerequisites are validated using depth-first search cycle detection. Students always learn in prerequisite order.
                </p>
              </div>

              <div
                onClick={() => onNavigate(effectiveStudent ? 'progress' : 'sign_in')}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 transition cursor-pointer space-y-2 group"
              >
                <div className="text-[11px] font-mono text-cyan-400">02 / MASTERY</div>
                <h3 className="font-sans font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">
                  Bayesian Tracing
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Real-time probability recalibration guarantees that attempts update mastery authoritatively without browser tampering.
                </p>
              </div>

              <div
                onClick={onSwitchToTeacher}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 transition cursor-pointer space-y-2 group"
              >
                <div className="text-[11px] font-mono text-cyan-400">03 / GOVERNANCE</div>
                <h3 className="font-sans font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">
                  Faculty Studio
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Faculty verify question banks, author assessments, and inspect student progress ledgers with strict role-based access.
                </p>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ========================================================================= */}
        {/* COMPREHENSIVE FOOTER (Scroll Fade In & Fade Out)                          */}
        {/* ========================================================================= */}
        <FadeInSection className="pt-8 pb-6 border-t border-white/10 text-xs text-[#64748B]">
          <footer className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2.5">
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-white">
                  Learner Views
                </span>
                <ul className="space-y-1.5 text-xs text-[#94A3B8]">
                  <li><button onClick={() => onNavigate('dashboard')} className="hover:text-white transition cursor-pointer">Student Dashboard</button></li>
                  <li><button onClick={scrollToCurriculum} className="hover:text-white transition cursor-pointer">Course Catalog</button></li>
                  <li><button onClick={() => onNavigate('my_learning')} className="hover:text-white transition cursor-pointer">Enrolled Modules</button></li>
                  <li><button onClick={() => onNavigate('progress')} className="hover:text-white transition cursor-pointer">Mastery Analytics</button></li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-white">
                  Progression
                </span>
                <ul className="space-y-1.5 text-xs text-[#94A3B8]">
                  <li><button onClick={() => onNavigate('leaderboard')} className="hover:text-white transition cursor-pointer">Global Rankings</button></li>
                  <li><button onClick={() => onNavigate('achievements')} className="hover:text-white transition cursor-pointer">Badges & Achievements</button></li>
                  <li><button onClick={() => onNavigate('profile')} className="hover:text-white transition cursor-pointer">Account Settings</button></li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-white">
                  Faculty
                </span>
                <ul className="space-y-1.5 text-xs text-[#94A3B8]">
                  <li><button onClick={onSwitchToTeacher} className="hover:text-white transition cursor-pointer">Teacher Studio</button></li>
                  <li><button onClick={onSwitchToTeacher} className="hover:text-white transition cursor-pointer">Curriculum DAG Editor</button></li>
                  <li><button onClick={onSwitchToTeacher} className="hover:text-white transition cursor-pointer">Question Bank</button></li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-white">
                  Governance
                </span>
                <ul className="space-y-1.5 text-xs text-[#94A3B8]">
                  <li><button onClick={onSwitchToAdmin} className="hover:text-white transition cursor-pointer">System Health</button></li>
                  <li><button onClick={onSwitchToAdmin} className="hover:text-white transition cursor-pointer">Security Audit Log</button></li>
                  <li><button onClick={onSwitchToAdmin} className="hover:text-white transition cursor-pointer">Role Safeguards</button></li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="font-sans uppercase tracking-widest text-white font-bold">Learnova</span>
                <span>— University Adaptive Learning & Governance Platform</span>
              </div>
              <div className="flex items-center gap-6">
                <button type="button" onClick={() => selectStage(0)} className="hover:text-white transition">Home</button>
                <button type="button" onClick={scrollToCurriculum} className="hover:text-white transition">Courses</button>
                <button type="button" onClick={() => onNavigate('about')} className="hover:text-white transition">About</button>
                <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white transition">Contact</button>
              </div>
              <span>&copy; {new Date().getFullYear()} Learnova. All rights reserved.</span>
            </div>
          </footer>
        </FadeInSection>

      </div>
    </div>
  );
};

export default LandingPage;
