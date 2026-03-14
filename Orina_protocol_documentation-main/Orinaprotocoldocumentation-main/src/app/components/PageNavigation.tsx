import { Link, useLocation } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

const pages = [
  { label: "Introduction", path: "/" },
  { label: "Getting Started", path: "/getting-started" },
  { label: "Buyer Guide", path: "/buyer-guide" },
  { label: "Seller Guide", path: "/seller-guide" },
  { label: "FAQ", path: "/faq" },
  { label: "App Architecture", path: "/architecture" },
];

export function PageNavigation() {
  const { pathname } = useLocation();
  const currentIndex = pages.findIndex((p) => p.path === pathname);

  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const next = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  return (
    <nav className="mt-16 pt-8 border-t border-border print:hidden">
      <div className="flex items-stretch justify-between gap-4">
        {/* Previous */}
        {prev ? (
          <Link
            to={prev.path}
            className="group flex-1 flex items-center gap-3 px-5 py-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all min-w-0"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            <div className="min-w-0">
              <span
                className="block text-muted-foreground"
                style={{ fontSize: "0.75rem" }}
              >
                Previous
              </span>
              <span
                className="block text-foreground group-hover:text-primary truncate transition-colors"
                style={{ fontSize: "0.9rem", fontWeight: 500 }}
              >
                {prev.label}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {/* Next */}
        {next ? (
          <Link
            to={next.path}
            className="group flex-1 flex items-center justify-end gap-3 px-5 py-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all min-w-0 text-right"
          >
            <div className="min-w-0">
              <span
                className="block text-muted-foreground"
                style={{ fontSize: "0.75rem" }}
              >
                Next
              </span>
              <span
                className="block text-foreground group-hover:text-primary truncate transition-colors"
                style={{ fontSize: "0.9rem", fontWeight: 500 }}
              >
                {next.label}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </nav>
  );
}