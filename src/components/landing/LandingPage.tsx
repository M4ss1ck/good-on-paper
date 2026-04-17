import { useEffect, useRef, type ComponentType } from "react";
import { Link } from "react-router";
import { Pencil, Bot, GitFork, Lock, type LucideProps } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { loadCatalog, type AppLocale } from "../../i18n";

function useScrollFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.querySelectorAll<HTMLElement>(".fade-section");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const features: { icon: ComponentType<LucideProps>; titleKey: string; descKey: string }[] = [
  {
    icon: Pencil,
    titleKey: "Edit anything",
    descKey:
      "Sections, bullets, skills, education. Drag to reorder. Toggle visibility. No templates to fight.",
  },
  {
    icon: Bot,
    titleKey: "AI assist (BYOK)",
    descKey:
      "Generate summaries, improve bullets, tailor to job descriptions. Bring your own API key.",
  },
  {
    icon: GitFork,
    titleKey: "Fork & compare",
    descKey:
      "Create variants for different roles. Compare versions side by side with visual diffs.",
  },
  {
    icon: Lock,
    titleKey: "Free forever",
    descKey:
      "Your data stays in your browser. No account, no cloud, no tracking. Open source.",
  },
];

const steps = [
  { num: "1", titleKey: "Fill in", descKey: "Add your experience, skills, and education." },
  { num: "2", titleKey: "Preview", descKey: "See your CV rendered in real time." },
  { num: "3", titleKey: "Download", descKey: "Export as PDF, ready to send." },
];

export function LandingPage() {
  const containerRef = useScrollFadeIn();
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as AppLocale;
  const toggleLocale = () => {
    const next: AppLocale = currentLocale === "en" ? "es" : "en";
    loadCatalog(next);
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#0f1a2e] text-white overflow-x-hidden relative"
    >
      {/* GitHub ribbon */}
      <a
        href="https://github.com/M4ss1ck/good-on-paper"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-0 right-0 z-10"
      >
        <div className="w-36 h-36 overflow-hidden absolute top-0 right-0">
          <div className="absolute top-6.5 -right-8.5 w-42.5 text-center rotate-45 bg-accent text-white text-xs font-semibold py-1.5 shadow-md">
            GitHub
          </div>
        </div>
      </a>
      {/* Top bar */}
      <nav className="flex items-center justify-between pl-6 pr-20 py-4 max-w-6xl mx-auto">
        <span className="text-sm font-semibold tracking-wide text-white/70">
          Good on Paper
        </span>
        <button
          onClick={toggleLocale}
          className="px-2.5 py-1 text-xs font-medium rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
        >
          {currentLocale === "en" ? "ES" : "EN"}
        </button>
      </nav>

      {/* Hero */}
      <section className="fade-section px-6 pt-20 pb-28 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl sm:text-7xl font-bold leading-tight tracking-tight font-display text-white">
          Good on Paper
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
          <Trans>The CV builder that gets out of your way.</Trans>
        </p>
        <Link
          to="/editor"
          className="inline-block mt-10 px-8 py-3.5 rounded-lg bg-accent text-white font-medium text-base hover:bg-accent/90 transition-colors shadow-lg shadow-accent/25"
        >
          <Trans>Start building</Trans> →
        </Link>
      </section>

      {/* Features */}
      <section className="fade-section px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center font-display mb-16">
          <Trans>Everything you need, nothing you don't.</Trans>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-colors"
            >
              <f.icon className="w-6 h-6 text-accent" />
              <h3 className="mt-3 text-lg font-semibold text-white">
                <FeatureTitle k={f.titleKey} />
              </h3>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                <FeatureDesc k={f.descKey} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="fade-section px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center font-display mb-16">
          <Trans>How it works</Trans>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {steps.map((s, i) => (
            <div key={i}>
              <div className="w-14 h-14 mx-auto rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xl font-bold text-accent">
                {s.num}
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                <StepTitle k={s.titleKey} />
              </h3>
              <p className="mt-2 text-sm text-white/50">
                <StepDesc k={s.descKey} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-xs text-white/30 border-t border-white/5">
        © {new Date().getFullYear()}{" "}
        <a
          href="https://massick.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white/60 transition-colors"
        >
          @M4ss1ck
        </a>
      </footer>
    </div>
  );
}

/* Translatable feature/step text components */

function FeatureTitle({ k }: { k: string }) {
  switch (k) {
    case "Edit anything":
      return <Trans>Edit anything</Trans>;
    case "AI assist (BYOK)":
      return <Trans>AI assist (BYOK)</Trans>;
    case "Fork & compare":
      return <Trans>Fork & compare</Trans>;
    case "Free forever":
      return <Trans>Free forever</Trans>;
    default:
      return <>{k}</>;
  }
}

function FeatureDesc({ k }: { k: string }) {
  switch (k) {
    case "Sections, bullets, skills, education. Drag to reorder. Toggle visibility. No templates to fight.":
      return (
        <Trans>
          Sections, bullets, skills, education. Drag to reorder. Toggle
          visibility. No templates to fight.
        </Trans>
      );
    case "Generate summaries, improve bullets, tailor to job descriptions. Bring your own API key.":
      return (
        <Trans>
          Generate summaries, improve bullets, tailor to job descriptions. Bring
          your own API key.
        </Trans>
      );
    case "Create variants for different roles. Compare versions side by side with visual diffs.":
      return (
        <Trans>
          Create variants for different roles. Compare versions side by side
          with visual diffs.
        </Trans>
      );
    case "Your data stays in your browser. No account, no cloud, no tracking. Open source.":
      return (
        <Trans>
          Your data stays in your browser. No account, no cloud, no tracking.
          Open source.
        </Trans>
      );
    default:
      return <>{k}</>;
  }
}

function StepTitle({ k }: { k: string }) {
  switch (k) {
    case "Fill in":
      return <Trans>Fill in</Trans>;
    case "Preview":
      return <Trans>Preview</Trans>;
    case "Download":
      return <Trans>Download</Trans>;
    default:
      return <>{k}</>;
  }
}

function StepDesc({ k }: { k: string }) {
  switch (k) {
    case "Add your experience, skills, and education.":
      return <Trans>Add your experience, skills, and education.</Trans>;
    case "See your CV rendered in real time.":
      return <Trans>See your CV rendered in real time.</Trans>;
    case "Export as PDF, ready to send.":
      return <Trans>Export as PDF, ready to send.</Trans>;
    default:
      return <>{k}</>;
  }
}
