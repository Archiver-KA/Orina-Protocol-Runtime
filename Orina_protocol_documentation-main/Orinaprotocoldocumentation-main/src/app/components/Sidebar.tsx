import { NavLink } from "react-router";
import { useState } from "react";
import {
  BookOpen, ChevronDown, ChevronRight, Menu, X,
  PlayCircle, Users, ShoppingCart, HelpCircle, Terminal, FileText, Shield
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

interface NavSection {
  title: string;
  items: { label: string; path: string; icon: React.ReactNode }[];
}

const sections: NavSection[] = [
  {
    title: "Documentation",
    items: [
      { label: "Introduction", path: "/", icon: <BookOpen className="w-4 h-4" /> },
      { label: "Getting Started", path: "/getting-started", icon: <PlayCircle className="w-4 h-4" /> },
      { label: "Buyer Guide", path: "/buyer-guide", icon: <ShoppingCart className="w-4 h-4" /> },
      { label: "Seller Guide", path: "/seller-guide", icon: <Users className="w-4 h-4" /> },
      { label: "FAQ", path: "/faq", icon: <HelpCircle className="w-4 h-4" /> },
      { label: "App Architecture", path: "/app-architecture", icon: <Terminal className="w-4 h-4" /> },
    ],
  },
  {
    title: "Legal & Policy",
    items: [
      { label: "Terms of Use", path: "/terms", icon: <FileText className="w-4 h-4" /> },
      { label: "Listing Policy", path: "/listing-policy", icon: <Shield className="w-4 h-4" /> },
      { label: "Privacy Policy", path: "/privacy", icon: <Shield className="w-4 h-4" /> },
    ],
  },
];

export function Sidebar() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((s) => [s.title, true]))
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useTheme();

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <svg width="32" height="32" viewBox="0 0 138 138" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M138 69.0595C138 30.8982 107.088 0 68.9107 0C65.6349 0 62.3591 0.238136 59.2024 0.654875L59.262 0.595341C52.1744 1.60742 45.4441 3.69111 39.2499 6.66782C39.1308 6.72735 39.0712 6.72735 38.9521 6.78689C38.5352 6.96549 38.1778 7.14409 37.8205 7.38223C26.8019 12.9189 17.451 21.3727 10.7803 31.6721C10.7208 31.6721 10.8399 31.6721 10.7803 31.6721C3.87139 42.4478 0 55.1881 0 68.9405C0 107.102 30.9115 138 69.0893 138C72.3651 138 75.6409 137.762 78.7976 137.345L78.738 137.405C85.8256 136.393 92.5559 134.309 98.7501 131.332C98.8692 131.273 98.9288 131.273 99.0479 131.213C99.4648 131.035 99.8222 130.856 100.18 130.618C111.198 125.081 120.549 116.627 127.22 106.328C127.16 106.328 127.101 106.328 127.041 106.328C133.95 95.6117 138 82.8119 138 69.0595ZM26.2063 69.2381C26.2063 65.4875 26.6828 61.8559 27.6357 58.3434C47.7074 61.7964 62.9547 79.2399 62.9547 100.255C62.9547 104.006 62.4782 107.638 61.5252 111.15C41.4536 107.757 26.2063 90.2537 26.2063 69.2381ZM89.3992 106.447C89.5779 104.304 89.697 102.16 89.697 100.017C89.697 69.9525 70.4592 44.3529 43.5978 34.887C44.7294 34.0535 45.861 33.2796 47.0522 32.5651C47.1713 32.5056 47.2309 32.4461 47.35 32.3865C47.5287 32.2675 47.7669 32.1484 48.0052 32.0293C54.0803 28.6359 61.1083 26.7308 68.5533 26.7308C92.0794 26.7308 111.139 45.7817 111.139 69.2977C111.198 85.3123 102.383 99.1838 89.3992 106.447C89.3992 106.506 89.3992 106.506 89.3992 106.447Z" fill={theme === "dark" ? "white" : "#1a1a2e"}/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 600 }}>Orina Protocol</h1>
            <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>Documentation v2.0</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full px-3 py-2 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
              style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}
            >
              <span>{section.title}</span>
              {expandedSections[section.title] ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {expandedSections[section.title] && (
              <div className="ml-1 space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                      }`
                    }
                    style={{ fontSize: '0.85rem' }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <ThemeToggle />
        <p className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>
          Orina Protocol &copy; 2025
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full w-72 bg-sidebar border-r border-sidebar-border z-40 transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}