/* Format descriptor — Multi-Cloud comparison (stub; the equivalence
   matrix lands in Block D). Registered as a normal visible format
   for now so the tab is present and honest. */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.StubHome.register('multi-cloud', {
    title: 'Cross-Cloud Comparison',
    subtitle: 'The honest equivalence layer: a side-by-side matrix of Azure ⇄ Databricks (then AWS) capabilities, each rated DIRECT / CLOSE / PARTIAL / NONE. This is the highest-value interview asset and lands right after the Databricks services are in.',
    roadmap: [
      'Azure ⇄ Databricks capability matrix',
      'DIRECT / CLOSE / PARTIAL / NONE ratings',
      'Deep concept rows (per-cloud bullets)',
      'Cross-cloud jump chips from any service',
      'Migration interview questions',
    ],
    ctaHref: '#azure/home',
    ctaLabel: 'Explore Azure (live now)',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-mc" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#2f9bff"/><stop offset="100%" stop-color="#ff5f46"/>
        </linearGradient>
      </defs>
      <circle cx="11" cy="16" r="7" fill="url(#brand-grad-mc)" opacity=".55"/>
      <circle cx="21" cy="16" r="7" fill="url(#brand-grad-mc)" opacity=".55"/>
    </svg>`;

  TV.registerFormat({
    id: 'multi-cloud',
    label: 'Cross-Cloud',
    short: 'Cross-Cloud',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://learn.microsoft.com/azure/architecture/',
    docsLabel: 'Architecture Docs',
    visible: true,
    comparable: false,
    home: 'home',
    logoSvg: LOGO,
    navGroups: [{
      id: 'overview', label: 'Overview',
      items: [{ id: 'home', label: 'Overview', icon: 'home', available: true }],
    }],
  });
})();
