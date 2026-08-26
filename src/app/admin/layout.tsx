"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type NavItem = { name: string; href: string; icon: string; external?: boolean };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "EMPLOYEE",
    items: [
      { name: "Mark Attendance", href: "/", icon: "✅", external: true },
    ],
  },
  {
    label: "ADMIN PORTAL",
    items: [
      { name: "Dashboard",            href: "/admin/dashboard",      icon: "📊" },
      { name: "Employees",            href: "/admin/employees",       icon: "👥" },
      { name: "Attendance Logs",      href: "/admin/attendance",      icon: "📋" },
      { name: "Admin Users",          href: "/admin/admins",          icon: "🔑" },
      { name: "Shift Schedule",       href: "/admin/shifts",          icon: "⚙️" },
      { name: "Shift Change Requests",href: "/admin/shift-requests",  icon: "🔄" },
      { name: "Leave & Holidays",     href: "/admin/leave",           icon: "🏖️" },
      { name: "Export Attendance",    href: "/admin/export",          icon: "📥" },
      { name: "Settings",             href: "/admin/settings",        icon: "🛠️" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("Admin Panel");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/admin/login"); return; }
      setEmail(user.email ?? "Admin");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const allItems = NAV_SECTIONS.flatMap(s => s.items);
    const match = allItems.find(i => i.href === pathname);
    if (match) setPageTitle(match.name);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          <div className="hint">Loading admin portal…</div>
        </div>
      </div>
    );
  }

  const avatarLetter = email ? email[0].toUpperCase() : "A";

  return (
    <div className="admin-wrapper">
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">IV</div>
          <div>
            <div className="sidebar-brand-name">IV ATTENDANCE</div>
            <div className="sidebar-brand-sub">Admin Portal</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(item =>
                item.external ? (
                  <Link key={item.href} href={item.href} target="_blank" className="sidebar-item">
                    <span className="sidebar-item-icon">{item.icon}</span>
                    {item.name}
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-item ${pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}`}
                  >
                    <span className="sidebar-item-icon">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">👤 {email}</div>
          <button className="btn btn-danger btn-sm w-full" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-title">{pageTitle}</div>
          <div className="admin-topbar-right">
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div className="admin-topbar-user">
              <div className="admin-topbar-avatar">{avatarLetter}</div>
              <span className="admin-topbar-email">{email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          {children}
        </main>

        {/* Footer */}
        <footer className="admin-footer">
          © {new Date().getFullYear()} IV Attendance Tracker — Internal HR System · All rights reserved
        </footer>
      </div>
    </div>
  );
}
