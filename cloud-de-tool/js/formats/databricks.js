/* Format descriptor — Databricks (stub; built out in Block C). */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.StubHome.register('databricks', {
    title: 'Databricks',
    subtitle: 'The Databricks lakehouse layer is next up. Delta Lake, Unity Catalog, Delta Live Tables, Auto Loader, Workflows, Photon, Databricks SQL, MLflow and more — each with the same six-depth detail as the Azure services.',
    roadmap: [
      'Delta Lake & Unity Catalog',
      'Delta Live Tables + Auto Loader + Workflows',
      'Structured Streaming & Change Data Feed',
      'Photon, Clusters & Databricks SQL',
      'MLflow & Delta Sharing',
    ],
    ctaHref: '#azure/home',
    ctaLabel: 'Explore Azure (live now)',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-dbx" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff5f46"/><stop offset="100%" stop-color="#ff8f6b"/>
        </linearGradient>
      </defs>
      <path d="M16 4 L27 10 L16 16 L5 10 Z" fill="url(#brand-grad-dbx)" opacity=".9"/>
      <path d="M16 18 L27 12 L27 20 L16 26 Z" fill="url(#brand-grad-dbx)" opacity=".5"/>
      <path d="M16 18 L5 12 L5 20 L16 26 Z" fill="url(#brand-grad-dbx)" opacity=".35"/>
    </svg>`;

  TV.registerFormat({
    id: 'databricks',
    label: 'Databricks',
    short: 'Databricks',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://docs.databricks.com/',
    docsLabel: 'Databricks Docs',
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
