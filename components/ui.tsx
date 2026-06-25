import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-bold mb-3">{children}</h2>;
}

export function EmptyState({
  icon = "🍲",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center bg-surface border border-border rounded-[var(--radius-app)] px-6 py-10">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const btnSize = "px-5 py-3 text-[15px]";

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${btnBase} ${btnSize} bg-primary text-white active:bg-primary/90`}
    >
      {children}
    </Link>
  );
}

export function primaryBtnClass(extra = "") {
  return `${btnBase} ${btnSize} bg-primary text-white active:bg-primary/90 ${extra}`;
}

export function softBtnClass(extra = "") {
  return `${btnBase} ${btnSize} bg-primary-soft text-primary active:bg-primary-soft/70 ${extra}`;
}

export function outlineBtnClass(extra = "") {
  return `${btnBase} ${btnSize} bg-surface border border-border text-foreground active:bg-background ${extra}`;
}
