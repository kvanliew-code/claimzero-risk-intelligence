import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Commercial pages (pipeline, clients, engagements) hold client contact data
 * and deal values. Only Admin and Executive may see them. The database
 * enforces this too (private.is_commercial); this is the visible half so a
 * deep link shows a clear refusal rather than an empty table.
 */
export function CommercialOnly({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === "admin" || role === "executive") return <>{children}</>;

  return (
    <div className="mx-auto mt-24 max-w-[520px] rounded-[6px] border border-cz-rule bg-cz-surface px-6 py-8 text-center">
      <div className="cz-eyebrow text-[9px] tracking-[0.18em]">Restricted</div>
      <h1 className="mt-2 font-cz-sans text-[17px] font-bold">
        Commercial data is not part of your role
      </h1>
      <p className="mt-2 text-[13px] text-cz-ink-2">
        Client contacts, opportunities and engagements are visible to Admin and Executive
        only. Your methodology and project work is unaffected.
      </p>
    </div>
  );
}
