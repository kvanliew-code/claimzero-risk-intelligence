import { createFileRoute } from "@tanstack/react-router";
import { CzHeader, useTheme } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton } from "@/components/cz/primitives";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ClaimZero" },
      {
        name: "description",
        content:
          "Appearance, notification cadence, seat mapping and integration credentials for the ClaimZero command center.",
      },
      { property: "og:title", content: "Settings — ClaimZero" },
      {
        property: "og:description",
        content: "Appearance, notification cadence, seat mapping and integration credentials.",
      },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Settings</b> · concept mockup
          </>
        }
      />
      <SHead title="Settings" note="appearance now; cadence, seats and credentials in platform" />
      <div className="max-w-[640px] px-5 py-3">
        <div className="flex items-center justify-between rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
          <div>
            <div className="text-[13px] font-semibold">Appearance</div>
            <div className="font-cz-mono text-[11px] text-cz-ink-3">
              Currently {theme === "dark" ? "dark" : "light"} — dark is the house default
            </div>
          </div>
          <CzButton onClick={toggle}>◐ Toggle theme</CzButton>
        </div>
        <p className="mt-3 font-cz-serif text-cz-ink-2">
          Notification cadence, responsible-seat mapping and integration credentials are configured
          in the platform build.
        </p>
      </div>
    </div>
  );
}
