import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  GitBranch,
  Brain,
  Award,
  Users,
  Compass,
  CheckCircle2,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  GraduationCap,
  Layers,
  Terminal,
  Zap,
  Menu,
  X
} from 'lucide-react';

import { StudentUser } from '../../types';
import { UserResponse } from '../../services/api/authApi';

export interface AboutPageProps {
  currentStudent?: StudentUser | null;
  currentUser?: UserResponse | null;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSwitchToTeacher: () => void;
  onSwitchToAdmin: () => void;
  onEnterPortal?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  currentStudent,
  currentUser,
  onNavigate,
  onSwitchToTeacher,
  onSwitchToAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#03050C] text-[#F8FAFC] selection:bg-white/20 selection:text-white relative w-full overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[750px] h-[750px] bg-gradient-to-tr from-cyan-950/20 via-blue-950/20 to-transparent rounded-full blur-[160px] opacity-60" />
        <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-blue-950/15 rounded-full blur-[140px] opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06)_0%,transparent_60%)]" />
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#03050C]/85 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 lg:px-20 xl:px-28 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('landing')}
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

        {/* Clean, Page-Only Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="relative py-1 hover:text-white transition-colors cursor-pointer"
          >
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('landing', { scrollTo: 'curriculum-grid' })}
            className="relative py-1 hover:text-white transition-colors cursor-pointer"
          >
            <span>Courses</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="relative py-1 text-white transition-colors cursor-pointer"
          >
            <span>About</span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="relative py-1 hover:text-white transition-colors cursor-pointer"
          >
            <span>Contact</span>
          </button>
        </nav>

        {/* Right CTA */}
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

          {/* Mobile Menu Button */}
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
                  onNavigate('landing');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-white hover:text-cyan-400 border-b border-white/5"
              >
                01. Home
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('landing', { scrollTo: 'curriculum-grid' });
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
                className="text-left py-2 text-cyan-300 border-b border-white/5"
              >
                03. About Us
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
      {/* ABOUT HERO SECTION (Expansive Full-Width Layout)                          */}
      {/* ========================================================================= */}
      <section className="relative pt-36 sm:pt-44 pb-20 px-6 sm:px-12 lg:px-20 xl:px-28 2xl:px-36 w-full z-10">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-400/30 backdrop-blur-md text-[11px] font-mono text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
          <span>LEARNOVA ACADEMIC COMPUTING & COGNITIVE LABS</span>
        </div>

        <h1 className="font-sans text-[clamp(1.75rem,3.8vw,3.25rem)] font-bold tracking-tight text-white leading-[1.1] w-full max-w-6xl">
          Architecting the Future of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-white">
            Adaptive Intelligence
          </span>
        </h1>

        <p className="mt-8 text-base sm:text-lg lg:text-xl text-white/70 font-normal leading-relaxed w-full max-w-5xl">
          Learnova was founded to dismantle the rigid, one-size-fits-all model of modern education. By synthesizing <span className="text-white font-medium">Bayesian Knowledge Tracing</span> with <span className="text-white font-medium">Directed Acyclic Prerequisite Graphs</span>, we create personalized cognitive pathways that adapt to every student in real time.
        </p>

        {/* Expansive Full-Width Telemetry Stats Bar */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8 sm:p-10 rounded-3xl bg-[#060813]/80 border border-white/10 backdrop-blur-xl w-full shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-r border-white/5">
            <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">Mastery Precision</span>
            <div className="text-2xl sm:text-4xl font-bold text-white mt-2">99.8%</div>
            <p className="text-xs text-white/40 mt-1.5">BKT probabilistic certainty</p>
          </div>
          <div className="p-4 border-r border-white/5">
            <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">Prerequisite Engine</span>
            <div className="text-2xl sm:text-4xl font-bold text-white mt-2">0 Cycles</div>
            <p className="text-xs text-white/40 mt-1.5">Strict DAG topological order</p>
          </div>
          <div className="p-4 border-r border-white/5">
            <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">Faculty Rigor</span>
            <div className="text-2xl sm:text-4xl font-bold text-white mt-2">100%</div>
            <p className="text-xs text-white/40 mt-1.5">Audited university curriculum</p>
          </div>
          <div className="p-4">
            <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">Active Learners</span>
            <div className="text-2xl sm:text-4xl font-bold text-white mt-2">12,400+</div>
            <p className="text-xs text-white/40 mt-1.5">Across 18 accredited domains</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3 CORE PILLARS (Expansive Full-Width Grid)                                */}
      {/* ========================================================================= */}
      <section className="relative py-24 px-6 sm:px-12 lg:px-20 xl:px-28 2xl:px-36 w-full z-10 border-t border-white/10">
        <div className="max-w-4xl mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Our Foundation</span>
          <h2 className="font-sans text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-white mt-2 tracking-tight">
            How Learnova Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/60 leading-relaxed">
            Every feature in Learnova is mathematically modeled to maximize retention and eliminate cognitive bottlenecks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Pillar 1 */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0B0F1F] to-[#04060E] border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Pillar 01</span>
              <h3 className="font-sans text-2xl font-bold text-white mt-2 mb-4 group-hover:text-cyan-300 transition-colors">
                Bayesian Knowledge Tracing
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                Our BKT inference engine dynamically calculates the probability that a student has genuinely mastered a concept versus guessed correctly. As you solve questions, your cognitive state updates in real time.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0B0F1F] to-[#04060E] border border-blue-500/20 hover:border-blue-400/50 transition-all duration-300 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-400/10 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <GitBranch className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Pillar 02</span>
              <h3 className="font-sans text-2xl font-bold text-white mt-2 mb-4 group-hover:text-blue-300 transition-colors">
                Directed Acyclic Graphs (DAG)
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                Knowledge is a network, not a straight line. Our DAG topological engine prevents cognitive dead ends by strictly sequencing foundational concepts before unlocking advanced domains, ensuring solid foundations.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0B0F1F] to-[#04060E] border border-amber-500/20 hover:border-amber-400/50 transition-all duration-300 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Pillar 03</span>
              <h3 className="font-sans text-2xl font-bold text-white mt-2 mb-4 group-hover:text-amber-300 transition-colors">
                Faculty Governance & Rigor
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                We reject unverified AI generation. Every question, rubric, and prerequisite mapping is audited, approved, and maintained by university faculty in the Teacher Studio, guaranteeing verifiable academic credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PHILOSOPHY & VISION (Expansive 2-Column Full Width)                       */}
      {/* ========================================================================= */}
      <section className="relative py-24 px-6 sm:px-12 lg:px-20 xl:px-28 2xl:px-36 w-full z-10 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
          <div className="lg:col-span-7">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Our Mission</span>
            <h2 className="font-sans text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-white mt-2 tracking-tight">
              Empowering Students with Sovereign Mastery
            </h2>
            <p className="mt-6 text-base sm:text-lg text-white/70 leading-relaxed">
              Traditional education tests students on fixed exam dates, regardless of whether their neural pathways have consolidated the knowledge. In Learnova, time is variable, but mastery is constant.
            </p>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
              Whether you are a career switcher tackling complex systems architecture or an undergraduate solidifying algorithms, our adaptive engine personalizes practice sets, diagnoses weaknesses, and rewards relentless consistency.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('landing', { scrollTo: 'curriculum-grid' })}
                className="px-8 py-3.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Curricula</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="px-8 py-3.5 rounded-full border border-white/20 hover:border-white/40 text-white font-medium text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Get in Touch
              </button>
            </div>
          </div>

          {/* Interactive Feature Checklist */}
          <div className="lg:col-span-5 space-y-4 p-8 sm:p-10 rounded-3xl bg-[#060813] border border-white/10 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            <h3 className="font-sans text-xl font-bold text-white mb-6 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Platform Safeguards</span>
            </h3>

            {[
              'Zero Hallucination AI Sandbox: LLM answers verified by professors',
              'Server-Authoritative Evaluation: Tamper-proof test results',
              'Mathematical DAG Validation: Instant circular dependency detection',
              'Bayesian Slip & Guess Calibration: Robust anti-cheat metrics',
              'Multi-Role Governance: Admin, Teacher, and Student RBAC security',
              'Gamification Ledger: Idempotent XP transactions and cryptographic badges'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-white/80 leading-snug">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER (Full Width)                                                      */}
      {/* ========================================================================= */}
      <footer className="relative z-10 border-t border-white/10 px-6 sm:px-12 lg:px-20 xl:px-28 2xl:px-36 py-12 w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-widest text-white">Learnova</span>
          <span>&copy; {new Date().getFullYear()} University Adaptive Learning & Governance Platform.</span>
        </div>

        <div className="flex items-center gap-6">
          <button type="button" onClick={() => onNavigate('landing')} className="hover:text-white transition cursor-pointer">Home</button>
          <button type="button" onClick={() => onNavigate('landing', { scrollTo: 'curriculum-grid' })} className="hover:text-white transition cursor-pointer">Courses</button>
          <button type="button" onClick={() => onNavigate('about')} className="text-white cursor-pointer">About</button>
          <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white transition cursor-pointer">Contact</button>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
