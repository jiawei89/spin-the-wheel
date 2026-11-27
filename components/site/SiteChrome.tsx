"use client";

// The shared chrome: header (brand, grouped nav, the wheel-title entry the
// owner asked for) and footer (config groups, note, credit). Pages pass the
// site config in as a prop — a client component never imports
// lib/site-config at run time (the type import below is erased at build).

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SiteConfig } from "@/lib/site-config";
import type { UiStrings } from "@/lib/ui-strings";
import { trackPageView } from "@/lib/analytics";

// Trailing-slash-insensitive route compare, so "/pricing/" and "/pricing"
// both mark the nav link as the current page.
const sameRoute = (href: string, pathname: string) => {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return norm(href) === norm(pathname);
};

export function SiteHeader({
  config,
  t,
  currentPath,
}: {
  config: SiteConfig;
  t: UiStrings;
  currentPath?: string;
}) {
  const pathname = usePathname();
  const activePath = currentPath ?? pathname ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    trackPageView();
  }, []);

  const openTitle = useCallback(() => {
    let current = "";
    try {
      current = localStorage.getItem("stw:title") ?? "";
    } catch {
      current = "";
    }
    setTitleDraft(current);
    setMenuOpen(false);
    titleDialogRef.current?.showModal();
  }, []);

  // The title lives above the wheel: saved locally, then announced to the
  // page's wheel through a window event (WheelSpinner listens for it).
  const commitTitle = useCallback((value: string) => {
    const v = value.trim().slice(0, 80);
    try {
      if (v) localStorage.setItem("stw:title", v);
      else localStorage.removeItem("stw:title");
    } catch {
      /* private mode: the title still shows for this visit */
    }
    window.dispatchEvent(new CustomEvent<string>("stw:title", { detail: v }));
    titleDialogRef.current?.close();
  }, []);

  const navLinks = config.nav.map((item) => (
    <a key={item.href} href={item.href} aria-current={sameRoute(item.href, activePath) ? "page" : undefined}>
      {item.label}
    </a>
  ));

  return (
    <header className="site-header">
      <a className="brand" href="/">
        {config.brandLogo ? (
          <img className="brand-logo" src={config.brandLogo} width={30} height={30} alt="" />
        ) : null}
        {config.brandName}
      </a>
      <nav className="site-nav" aria-label={config.brandName}>
        {navLinks}
      </nav>
      <div className="header-actions">
        <button className="title-set" id="titleBtn" type="button" onClick={openTitle}>
          {t.setWheelTitle}
        </button>
      </div>
      <button
        className="menu-btn"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobileNav"
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? t.menuClose : t.menuOpen}
      </button>
      <div className={menuOpen ? "mobile-nav open" : "mobile-nav"} id="mobileNav">
        {navLinks}
        <button className="title-set" type="button" onClick={openTitle}>
          {t.setWheelTitle}
        </button>
      </div>

      <dialog className="dialog" ref={titleDialogRef} aria-labelledby="wheelTitleDialogHeading">
        <h2 id="wheelTitleDialogHeading">{t.wheelTitleLabel}</h2>
        <div className="setting">
          <label htmlFor="wheelTitleInput">{t.wheelTitleLabel}</label>
          <input
            id="wheelTitleInput"
            type="text"
            value={titleDraft}
            maxLength={80}
            placeholder={t.wheelTitlePlaceholder}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle(titleDraft);
              }
            }}
          />
        </div>
        <div className="dialog-actions">
          <button className="btn-secondary" type="button" onClick={() => commitTitle("")}>
            {t.wheelTitleRemove}
          </button>
          <button className="btn-primary" type="button" onClick={() => commitTitle(titleDraft)}>
            {t.wheelTitleSave}
          </button>
        </div>
      </dialog>
    </header>
  );
}

export function SiteFooter({ config, t }: { config: SiteConfig; t: UiStrings }) {
  return (
    <footer className="site-footer">
      <div className="footer-groups">
        {(config.footerGroups ?? []).map((group) => (
          <div className="footer-group" key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="footer-note">{config.footerNote ?? ""}</p>
      <p className="footer-credit">
        © {new Date().getFullYear()} {config.brandName}. {t.madeWith}{" "}
        <a href="https://shipsite.ai">ShipSite.ai</a>
      </p>
    </footer>
  );
}
