import type { ReactNode } from 'react';

type StatusPageProps = {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
};

/** Shared layout for "not found" and "something broke" screens. */
export function StatusPage({ icon, title, body, action }: StatusPageProps) {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-muted [&>svg]:size-6">
        {icon}
      </div>
      <h1 className="mt-6 font-display text-2xl font-medium text-ink">{title}</h1>
      <p className="mt-3 max-w-md text-muted">{body}</p>
      <div className="mt-8">{action}</div>
    </div>
  );
}
