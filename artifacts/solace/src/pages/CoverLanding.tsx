import { useEffect } from "react";

/** Locally hosted story document isolates its global styles and scroll timeline
 * from the dashboard. It ships with Vite; no Sites service or external iframe
 * is required. Existing authenticated home redirects stay in App.tsx. */
export default function CoverLanding() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Solace Menu — Your kitchen. Connected.";
    return () => { document.title = previousTitle; };
  }, []);

  return <iframe
    title="Solace Menu — interactive product story"
    src={`${import.meta.env.BASE_URL}cover/index.html`}
    style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#182a22" }}
  />;
}
