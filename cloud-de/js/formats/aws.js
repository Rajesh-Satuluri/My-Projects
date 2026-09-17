/* Format descriptor — AWS (placeholder; built out after the Azure +
   Databricks interview push). */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.StubHome.register('aws', {
    title: 'Amazon Web Services',
    subtitle: 'AWS is intentionally parked for a later iteration. The full S3 / Glue / EMR / Athena / Kinesis / Lake Formation catalogue will land here, then feed the three-way cross-cloud equivalence matrix (AWS ⇄ Azure ⇄ Databricks).',
    roadmap: [
      'Storage & Lake — S3, Glue Catalog, Lake Formation',
      'Compute — EMR, EMR Serverless, Athena',
      'Streaming — Kinesis, MSK',
      'Orchestration — MWAA, Step Functions',
      'Then: 3-way cross-cloud matrix',
    ],
    ctaHref: '#azure/home',
    ctaLabel: 'Explore Azure (live now)',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-aws" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff9900"/><stop offset="100%" stop-color="#ffbf66"/>
        </linearGradient>
      </defs>
      <path d="M6 20 q10 6 20 0" stroke="url(#brand-grad-aws)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M22 18 l5 2 l-2 5" stroke="url(#brand-grad-aws)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="7" y="8" width="5" height="7" rx="1" fill="url(#brand-grad-aws)" opacity=".85"/>
      <rect x="14" y="8" width="5" height="7" rx="1" fill="url(#brand-grad-aws)" opacity=".6"/>
      <rect x="21" y="8" width="5" height="7" rx="1" fill="url(#brand-grad-aws)" opacity=".4"/>
    </svg>`;

  TV.registerFormat({
    id: 'aws',
    label: 'AWS',
    short: 'AWS',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://docs.aws.amazon.com/',
    docsLabel: 'AWS Docs',
    visible: true,
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: [{
      id: 'overview', label: 'Overview',
      items: [{ id: 'home', label: 'Overview', icon: 'home', available: true }],
    }],
  });
})();
