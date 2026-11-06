"use client";

import { Check, Sparkles } from "lucide-react";

export function PricingSection() {
  return (
    <section className="pricing-section" id="pricing" aria-labelledby="pricing-title">
      <div className="pricing-heading">
        <span className="section-kicker">STRAIGHTFORWARD PRICING</span>
        <h2 id="pricing-title">Start free. Pay only when you need more.</h2>
        <p>Build and edit as much as you like. You only pay when you download beyond the free allowance or choose a premium design.</p>
      </div>
      <div className="pricing-grid">
        <article className="pricing-card">
          <div className="pricing-card-top">
            <span className="pricing-plan">FREE</span>
            <h3>Starter</h3>
            <p>Everything you need to create your first professional CV.</p>
            <div className="pricing-amount"><strong>₦0</strong><span>forever</span></div>
          </div>
          <ul className="pricing-features">
            <li><Check size={15} /> All six free templates</li>
            <li><Check size={15} /> Unlimited editing and draft saving</li>
            <li><Check size={15} /> Live CV preview</li>
            <li><Check size={15} /> Two free standard-template PDF downloads</li>
          </ul>
          <a className="pricing-cta secondary" href="#templates">Explore free templates</a>
        </article>
        <article className="pricing-card premium">
          <div className="pricing-card-top">
            <span className="pricing-plan premium-plan"><Sparkles size={12} /> PREMIUM</span>
            <h3>Pay as you go</h3>
            <p>Unlock premium layouts and keep downloading new CV versions.</p>
            <div className="pricing-amount"><strong>₦2,000</strong><span>per new CV version</span></div>
          </div>
          <ul className="pricing-features">
            <li><Check size={15} /> All twelve templates, including premium designs</li>
            <li><Check size={15} /> Premium template PDF downloads</li>
            <li><Check size={15} /> Additional standard-template downloads</li>
            <li><Check size={15} /> Re-download an entitled version at no extra cost</li>
          </ul>
          <a className="pricing-cta primary" href="#templates">Browse premium templates</a>
        </article>
      </div>
      <p className="pricing-footnote">No subscription. Editing is free. A one-time payment covers one new downloadable CV version. Premium checkout will be enabled after payment verification is configured.</p>
    </section>
  );
}
