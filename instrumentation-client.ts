import posthog from "posthog-js";
import { maskIdentifiers } from "@/lib/analytics-privacy";

// Product analytics and session recordings (PostHog). Off unless
// NEXT_PUBLIC_POSTHOG_KEY is set, which is Production-only in Vercel.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  try {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      defaults: "2026-08-30",
      // Visitors stay anonymous; a person profile exists only once signed in.
      person_profiles: "identified_only",
      // Same promise as the rest of our measurement (see /privacy).
      respect_dnt: true,
      // Keep sign-in and unsubscribe tokens out of captured URLs.
      mask_personal_data_properties: true,
      custom_personal_data_properties: ["token", "email"],
      session_recording: {
        // Nothing typed into a form is recorded.
        maskAllInputs: true,
        // Every on-screen text node passes through maskIdentifiers: license,
        // DEA and NPI numbers are masked, everything else stays readable.
        maskTextSelector: "*",
        maskTextFn: (text) => maskIdentifiers(text),
      },
      // Click tracking records the clicked element's text; mask it the same way.
      before_send: (event) => {
        if (!event) return event;
        const props = event.properties;
        for (const name of ["$el_text", "$elements_chain"]) {
          if (typeof props[name] === "string") props[name] = maskIdentifiers(props[name]);
        }
        if (Array.isArray(props.$elements)) {
          props.$elements = props.$elements.map((el) =>
            el && typeof el.$el_text === "string" ? { ...el, $el_text: maskIdentifiers(el.$el_text) } : el,
          );
        }
        return event;
      },
    });
    // Split the website from the iOS app, which loads the same pages.
    posthog.register({ app_shell: /ClearCMEApp/.test(navigator.userAgent) ? "ios" : "web" });
  } catch {
    // Analytics must never break the page.
  }
}
