import { FileText, Menu, Moon, Sun } from "lucide-react";

type Props = {
  initials: string;
  dark: boolean;
  mobileOpen: boolean;
  onToggleTheme: () => void;
  onToggleNav: () => void;
};

export function AppHeader({ initials, dark, mobileOpen, onToggleTheme, onToggleNav }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#home" aria-label="CVForge home"><span className="brand-mark"><FileText size={18} strokeWidth={2.2} /></span><span>cvforge<span className="brand-dot">.</span></span></a>
      <nav className={mobileOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
        <a className="nav-link active" href="#editor">My CVs <span className="nav-count">2</span></a>
        <a className="nav-link" href="#templates">Templates</a>
        <a className="nav-link" href="#pricing">Pricing</a>
      </nav>
      <div className="top-actions">
        <button className="icon-button theme-button" onClick={onToggleTheme} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        <a className="avatar-button" href="/dashboard" aria-label="Open account dashboard">{initials || "CV"}</a>
        <button className="icon-button menu-button" onClick={onToggleNav} aria-expanded={mobileOpen} aria-label="Toggle navigation"><Menu size={20} /></button>
      </div>
    </header>
  );
}
