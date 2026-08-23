import type { ReactNode } from "react";
import { BookOpenText, CalendarCheck, CaretLeft, CaretRight, GearSix, House, MapPin } from "@phosphor-icons/react";
import type { AppState } from "../types";
import { createTranslator } from "../i18n";

export type AppPage = "home" | "history" | "quran" | "settings";

interface ShellProps {
  state: AppState;
  page: AppPage;
  onNavigate(page: AppPage): void;
  children: ReactNode;
}

export function Shell({ state, page, onNavigate, children }: ShellProps) {
  const language = state.settings.language ?? "en";
  const t = createTranslator(language);
  const location = state.settings.location;
  const locationLabel = location
    ? location.type === "city"
      ? `${location.city}, ${location.country}`
      : [location.city, location.country].filter(Boolean).join(", ") || t("precise")
    : t("location");

  const items: { id: AppPage; label: string; icon: typeof House }[] = [
    { id: "home", label: t("home"), icon: House },
    { id: "history", label: t("log"), icon: CalendarCheck },
    { id: "quran", label: t("quran"), icon: BookOpenText },
    { id: "settings", label: t("settings"), icon: GearSix },
  ];

  async function toggleSidebar() {
    await window.athanBuddy.updateSettings({ sidebarCollapsed: !state.settings.sidebarCollapsed });
  }

  return (
    <div className={state.settings.sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate("home")} aria-label={t("home")}>
          <span className="brand-mark"><img src="./assets/brand/athan-buddy-mark.png" alt="" /></span>
          <span className="brand-name">{t("appName")}</span>
        </button>

        <div className="sidebar-divider" />

        <button className="sidebar-collapse" onClick={toggleSidebar} aria-label={state.settings.sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")} title={state.settings.sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}>
          {state.settings.sidebarCollapsed
            ? (language === "ar" ? <CaretLeft size={19} weight="bold" /> : <CaretRight size={19} weight="bold" />)
            : (language === "ar" ? <CaretRight size={19} weight="bold" /> : <CaretLeft size={19} weight="bold" />)}
        </button>

        <nav className="primary-nav" aria-label="Primary">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? "nav-item active" : "nav-item"}
                onClick={() => onNavigate(item.id)}
                aria-current={page === item.id ? "page" : undefined}
                title={state.settings.sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={21} weight={page === item.id ? "fill" : "regular"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-location">
          <MapPin size={18} weight="fill" />
          <span>{locationLabel}</span>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
