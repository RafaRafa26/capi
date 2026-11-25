import { describe, expect, it } from "vitest"

import { sanitizeEvent, sanitizeUrl } from "./sanitize"

describe("analytics URL sanitizing", () => {
  it("drops query strings and fragments", () => {
    expect(sanitizeUrl("https://app.capi.com/signup?email=a%40b.com&next=/x")).toBe("https://app.capi.com/signup")
    expect(sanitizeUrl("https://app.capi.com/oauth/authorize?code_challenge=abc#x")).toBe(
      "https://app.capi.com/oauth/authorize",
    )
    expect(sanitizeUrl("/o/abc/payout?saldo=com-saldo")).toBe("/o/abc/payout")
  })

  it("hides the invitation token", () => {
    expect(sanitizeUrl("https://app.capi.com/invite/s3cr3t")).toBe("https://app.capi.com/invite/:token")
    expect(sanitizeUrl("/invite/s3cr3t?x=1")).toBe("/invite/:token")
  })

  it("leaves other paths and non-URL markers alone", () => {
    expect(sanitizeUrl("https://app.capi.com/o/abc/dashboard")).toBe("https://app.capi.com/o/abc/dashboard")
    expect(sanitizeUrl("$direct")).toBe("$direct")
  })

  it("rewrites URL properties of an event, including $set_once", () => {
    const event = sanitizeEvent({
      properties: {
        $current_url: "https://app.capi.com/invite/s3cr3t",
        $pathname: "/invite/s3cr3t",
        $referrer: "https://mail.example.com/?q=convite",
        other: "/invite/untouched",
      },
      $set_once: { $initial_current_url: "https://app.capi.com/signup?email=a%40b.com" },
    })

    expect(event.properties).toEqual({
      $current_url: "https://app.capi.com/invite/:token",
      $pathname: "/invite/:token",
      $referrer: "https://mail.example.com/",
      other: "/invite/untouched",
    })
    expect(event.$set_once).toEqual({ $initial_current_url: "https://app.capi.com/signup" })
  })
})
