import React from "react";

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-foreground mb-2" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>
      {children}
    </h1>
  );
}

export function PageSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-8" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
      {children}
    </p>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-foreground mt-12 mb-4" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
      {children}
    </h2>
  );
}

export function SubSectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3 id={id} className="text-foreground mt-8 mb-3" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
      {children}
    </h3>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-4" style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
      {children}
    </p>
  );
}

export function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 mb-6 ml-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-muted-foreground relative pl-0" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
          <span 
            className="absolute left-0 flex-shrink-0 rounded-full bg-primary" 
            style={{ 
              width: '6px', 
              height: '6px', 
              top: '0.6em'
            }}
          />
          <span className="flex-1 pl-4">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderedList({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 mb-6 ml-4 list-decimal list-inside">
      {items.map((item, i) => (
        <li key={i} className="text-muted-foreground" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
          {item}
        </li>
      ))}
    </ol>
  );
}

export function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <div className="mb-6 rounded-lg overflow-hidden border border-border">
      {language && (
        <div className="px-4 py-1.5 bg-secondary/50 border-b border-border">
          <span className="text-muted-foreground" style={{ fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{language}</span>
        </div>
      )}
      <pre className="p-4 bg-secondary overflow-x-auto">
        <code className="text-foreground/80" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{children}</code>
      </pre>
    </div>
  );
}

export function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "quote" | "success" }) {
  const colors = {
    info: "border-l-primary bg-primary/5",
    warning: "border-l-amber-500 bg-amber-500/5",
    quote: "border-l-muted-foreground bg-muted/30",
    success: "border-l-emerald-500 bg-emerald-500/5",
  };

  return (
    <div className={`border-l-4 ${colors[variant]} px-5 py-4 mb-6 rounded-r-lg`}>
      <div className="text-foreground/90" style={{ fontSize: '0.95rem', lineHeight: 1.7, fontStyle: variant === "quote" ? "italic" : "normal" }}>
        {children}
      </div>
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full" style={{ fontSize: '0.85rem' }}>
        <thead>
          <tr className="bg-secondary/50">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-foreground border-b border-border" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Divider() {
  return <hr className="border-border my-8" />;
}

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" }) {
  const colors = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-400",
    warning: "bg-amber-500/10 text-amber-400",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${colors[variant]}`} style={{ fontSize: '0.75rem', fontWeight: 500 }}>
      {children}
    </span>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-muted-foreground mb-1" style={{ fontSize: '0.8rem' }}>{label}</p>
      <p className="text-foreground" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{value}</p>
    </div>
  );
}