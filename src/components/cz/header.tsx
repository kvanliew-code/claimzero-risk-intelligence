import { useEffect, useState, type ReactNode } from "react";
import { CzButton } from "./primitives";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("cz-theme");
    const t = stored === "light" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("cz-theme", next);
  };
  return { theme, toggle };
}

export function CzHeader({ crumb, actions }: { crumb: ReactNode; actions?: ReactNode }) {
  const { toggle } = useTheme();
  return (
    <header
      className="sticky top-0 z-50 flex flex-wrap items-center gap-4 bg-cz-header px-5 py-2.5"
      style={{ borderBottom: "2px solid var(--cz-accent-solid)" }}
    >
      <div className="leading-none">
        <div className="font-cz-sans text-[18px] font-extrabold tracking-[0.4px]">
          Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
        </div>
        <div className="cz-eyebrow mt-0.5 text-[9px]">Development Risk Intelligence</div>
      </div>
      <div className="font-cz-mono text-[11px] tracking-[0.04em] text-cz-ink-3">{crumb}</div>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <CzButton onClick={toggle} title="Toggle theme">
          ◐ Theme
        </CzButton>
      </div>
    </header>
  );
}
