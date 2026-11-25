// Browser analytics (PostHog). Runs before hydration — see Next's
// instrumentation-client docs. Off unless NEXT_PUBLIC_POSTHOG_KEY is set.
//
// Capi shows third parties' financial data, so nothing the user sees or
// types may leave the browser: every text, attribute and input is masked in
// autocapture and in session replays, and URLs are scrubbed of tokens and
// query strings (src/lib/analytics/sanitize.ts). What reaches PostHog is
// which screen, which button (by position, not by label) and when.

import posthog from "posthog-js"

import { POSTHOG_KEY, POSTHOG_PROXY_PATH, POSTHOG_UI_HOST } from "@/lib/analytics/config"
import { sanitizeEvent, sanitizeUrl } from "@/lib/analytics/sanitize"

/** Only pages inside a company are recorded; auth, invitation and OAuth screens are not. */
const RECORDED_PATH = /^\/o\//

/** posthog-js's persistence key for the first URL and referrer seen. */
const INITIAL_PERSON_INFO = "$initial_person_info"

/**
 * The first URL a person opens is stored and sent with feature-flag
 * requests, which skip before_send — for an invited user it is the
 * invitation link itself. Scrub it where it is kept. posthog.init() stores
 * it synchronously; the flags request leaves later.
 */
function scrubInitialPersonInfo() {
  const persistence = posthog.persistence
  const initial = persistence?.props[INITIAL_PERSON_INFO] as { u?: string; r?: string } | undefined
  if (!persistence || !initial) return
  persistence.register({
    [INITIAL_PERSON_INFO]: {
      ...initial,
      u: initial.u && sanitizeUrl(initial.u),
      r: initial.r && sanitizeUrl(initial.r),
    },
  })
}

if (POSTHOG_KEY) {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_PROXY_PATH,
      ui_host: POSTHOG_UI_HOST,
      defaults: "2026-08-30",
      // Anonymous visitors (landing page) don't create person profiles.
      person_profiles: "identified_only",

      // Autocapture keeps clicks and their position in the page, never content.
      mask_all_text: true,
      mask_all_element_attributes: true,
      mask_personal_data_properties: true,
      custom_personal_data_properties: ["email", "next", "code", "state", "code_challenge", "redirect_uri", "client_id"],

      // Started by <AnalyticsIdentify> once a signed-in user opens a company.
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        blockSelector: "img, canvas, iframe, embed, object, [data-ph-block]",
        recordHeaders: false,
        recordBody: false,
      },

      before_send: (event) => {
        if (!event) return null
        if (event.event === "$snapshot" && !RECORDED_PATH.test(window.location.pathname)) return null
        return sanitizeEvent(event)
      },
    })
    scrubInitialPersonInfo()
  } catch (error) {
    // Analytics must never break the app.
    console.error("PostHog init failed", error)
  }
}
