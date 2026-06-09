import Link from "next/link";

// Privacy policy for the linkedn't Chrome extension. Linked from the CWS
// listing and the extension popup footer. Keep this honest and current —
// any change to data flows (new providers, new tracking, new analytics)
// must be reflected here before shipping.

export const metadata = {
  title: "Privacy Policy — linkedn't",
  description:
    "What the linkedn't browser extension collects, where it goes, and what we never do with it.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="legal">
      <header className="legal-header">
        <Link href="/" className="legal-back">
          ← linkedn&rsquo;t
        </Link>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: June 3, 2026</p>
        <p className="legal-lede">
          This is the privacy policy for the linkedn&rsquo;t browser extension
          and the linkednt.com web service that backs it. It covers what data we
          collect from you, where that data goes, and what we never do with it.
          Plain English. No tracking pixels in this page.
        </p>
      </header>

      <section>
        <h2>One-line summary</h2>
        <p>
          linkedn&rsquo;t reads the text of LinkedIn posts you choose to
          rewrite, sends it to a language model to produce a translated version,
          and shows that version back to you. The original post text is hashed
          but never stored as plaintext. We do not sell your data to anyone.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <h3>If you use Bring Your Own Key (BYOK)</h3>
        <ul>
          <li>
            <strong>Your API key</strong> for the provider you chose (Groq,
            OpenAI, Anthropic, Google Gemini, OpenRouter, or a custom
            OpenAI-compatible endpoint). Stored only in your browser&rsquo;s
            local storage via
            <code>chrome.storage.local</code>. Never sent to our servers.
          </li>
          <li>
            <strong>The text of the LinkedIn posts you rewrite</strong> is sent
            directly from your browser to the provider you chose. We do not see
            it.
          </li>
          <li>
            <strong>No account</strong> is required. Nothing is stored on our
            backend at all.
          </li>
        </ul>

        <h3>If you use credits (the proxy path)</h3>
        <ul>
          <li>
            <strong>Your Google account email</strong>, obtained through Google
            OAuth via Supabase Auth. Stored in our database to identify your
            account and grant you credits.
          </li>
          <li>
            <strong>An OAuth session token</strong> stored in
            <code>chrome.storage.local</code> in your browser, used as the
            Authorization header when our backend rewrites a post for you.
          </li>
          <li>
            <strong>The text of the LinkedIn posts you rewrite</strong> is sent
            from your browser to our /rewrite edge function on Supabase. The
            plaintext is used only to call the language model and is then
            discarded. A SHA-256 hash of the text is kept so a future request
            for the same post can return a cached rewrite without re-billing the
            model.
          </li>
          <li>
            <strong>A usage log entry per rewrite</strong> with: your user id,
            the mode you picked (TL;DR / Touch Grass / The Group Chat),
            the model used, response latency, the input hash, and the credit
            cost. No plaintext.
          </li>
          <li>
            <strong>Payment data</strong> (card number, billing address) is
            handled entirely by Polar (polar.sh) when you buy credits. We never
            see it. Polar sends us a webhook saying &ldquo;user X bought N
            credits&rdquo;, nothing more.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we never collect</h2>
        <ul>
          <li>
            Your LinkedIn feed at large. The extension only sends the specific
            post text you clicked rewrite on.
          </li>
          <li>
            Your browsing history. The extension runs only on linkedin.com.
          </li>
          <li>
            Your keystrokes, mouse position, screen recordings, or any other
            behavioural telemetry.
          </li>
          <li>LinkedIn cookies, your LinkedIn session, or your DMs.</li>
          <li>
            Health information, location data, or financial information beyond
            what Polar handles for payment.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who we share data with</h2>
        <ul>
          <li>
            <strong>BYOK path:</strong> the provider you chose. They have their
            own privacy policies — refer to{" "}
            <a href="https://groq.com/privacy-policy/">Groq</a>,{" "}
            <a href="https://openai.com/policies/privacy-policy/">OpenAI</a>,{" "}
            <a href="https://www.anthropic.com/legal/privacy">Anthropic</a>,{" "}
            <a href="https://policies.google.com/privacy">Google</a>, or{" "}
            <a href="https://openrouter.ai/privacy">OpenRouter</a>.
          </li>
          <li>
            <strong>Proxy path:</strong> Groq and OpenRouter (depending on which
            mode you pick). The post text is sent to the relevant API to produce
            the rewrite. No data sent beyond what&rsquo;s needed for that single
            request.
          </li>
          <li>
            <strong>Supabase</strong> hosts our database and edge functions.
            Your email, OAuth session, and usage log live in their managed
            Postgres.
          </li>
          <li>
            <strong>Polar</strong> handles payments. Their privacy policy is at{" "}
            <a href="https://polar.sh/legal/privacy">polar.sh/legal/privacy</a>.
          </li>
          <li>
            <strong>Cloudflare</strong> serves linkednt.com (this website) and
            routes requests. They see standard request metadata (IP, user-agent)
            for routing and DDoS protection.
          </li>
        </ul>
        <p>
          We do not sell or transfer your data to any third party for
          advertising, profiling, training models we don&rsquo;t control, or any
          purpose unrelated to delivering the rewrite you asked for.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <ul>
          <li>
            <strong>Cached rewrites</strong> are kept indefinitely so repeat
            requests for the same post don&rsquo;t re-bill the model. Keyed by
            hash, not plaintext.
          </li>
          <li>
            <strong>Usage logs</strong> are kept for one year, then deleted.
          </li>
          <li>
            <strong>Your user row</strong> (email, credit balance) persists
            until you ask us to delete it.
          </li>
          <li>
            <strong>OAuth session tokens</strong> expire on their own within an
            hour and refresh automatically while you&rsquo;re signed in.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can delete your account and all associated data at any time. Email
          us at <a href="mailto:hi@linkednt.com">hi@linkednt.com</a> from the
          address you signed in with and we&rsquo;ll erase everything within 30
          days. You can also clear all locally-stored data by uninstalling the
          extension — that wipes the BYOK key, OAuth session, and cached account
          info from your browser.
        </p>
      </section>

      <section>
        <h2>Cookies and tracking</h2>
        <p>
          The linkednt.com website uses no analytics, no advertising cookies,
          and no tracking pixels. The extension does not set cookies. The only
          persistent local data it uses is
          <code>chrome.storage.local</code> for your settings and OAuth session.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          linkedn&rsquo;t is not directed at people under 13. We do not
          knowingly collect data from children. If you believe a minor has
          signed up, email us and we&rsquo;ll delete the account.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We&rsquo;ll bump the &ldquo;Last updated&rdquo; date at the top of
          this page whenever we change anything material. Significant changes
          (new data collected, new third parties) will be announced in the
          extension popup before they take effect.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions, data requests, or complaints:{" "}
          <a href="mailto:hi@linkednt.com">hi@linkednt.com</a>.
        </p>
      </section>
    </main>
  );
}
