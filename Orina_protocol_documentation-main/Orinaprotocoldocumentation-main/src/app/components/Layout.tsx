import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { PageNavigation } from "./PageNavigation";
import { useEffect } from "react";
import { ThemeProvider } from "./ThemeProvider";

export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" id="main-content">
          <div className="max-w-4xl mx-auto px-6 py-12 lg:px-12">
            <Outlet />
            <PageNavigation />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}