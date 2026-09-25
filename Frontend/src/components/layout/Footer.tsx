"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { brand, footerColumns } from "@/data/site";

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer className="gradient-ink mt-[8vh] text-cream">
      <div className="shell py-[6vh]">
        <div className="grid gap-10 border-b border-cream/10 pb-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <div className="flex items-center gap-2">
              <BrandLogo tone="cream" className="h-16 w-auto" />
            </div>
            <p className="mt-4 max-w-[38ch] text-sm text-cream/70">
              {brand.tagline} We curate, hand-pack and deliver gifts people actually keep — from
              makers we know by name.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="mt-6"
            >
              <label htmlFor="newsletter" className="text-2xs font-bold tracking-[0.15em] text-cream/50 uppercase">
                Get the gifting calendar
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="newsletter"
                  type="email"
                  pattern="[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xs border border-cream/20 bg-cream/5 px-5 py-3 text-sm outline-none transition focus:border-accent-300"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xs bg-cream px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-300"
                >
                  {sent ? "Done" : "Join"}
                </button>
              </div>
              {sent && <p className="mt-2 text-2xs text-accent-600">You are on the list. No spam, ever.</p>}
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <p className="text-2xs font-bold tracking-[0.15em] text-cream/50 uppercase">{col.heading}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="inline-block text-sm text-cream/75 transition hover:translate-x-1 hover:text-cream"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-2xs text-cream/50">
            <span>© {new Date().getFullYear()} {brand.name}</span>
            <span>·</span>
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-cream">
              {brand.supportEmail}
            </a>
            <span>·</span>
            <span>{brand.supportPhone}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xs text-cream/50">Secured by</span>
            {["UPI", "Visa", "Mastercard", "Razorpay"].map((m) => (
              <span
                key={m}
                className="rounded-xs border border-cream/20 px-3 py-1 text-2xs font-semibold text-cream/70"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
