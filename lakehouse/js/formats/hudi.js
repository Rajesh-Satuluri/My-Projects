/* ============================================================
   Format descriptor — Apache Hudi.
   Registered HIDDEN (visible:false) while the format is built out
   partition-by-partition, so the shipped switcher never shows a
   partial Hudi. navGroups list ONLY built screens; they grow each
   partition. Revealed (visible:true) in a later partition.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  // Built so far: Get Started (F1) + Write Operations (F2).
  const NAV_GROUPS = [
    {
      id: 'start', label: 'Get Started',
      items: [
        { id: 'home',              label: 'Home',            icon: 'home',    available: true },
        { id: 'why-hudi',          label: 'Why Hudi?',       icon: 'shield',  available: true },
        { id: 'architecture',      label: 'Architecture',    icon: 'layers',  available: true },
        { id: 'table-types',       label: 'CoW vs MoR',      icon: 'columns', available: true },
        { id: 'timeline-explorer', label: 'Timeline',        icon: 'clock',   available: true },
      ],
    },
    {
      id: 'write-ops', label: 'Write Operations',
      items: [
        { id: 'upsert',           label: 'Upsert',            icon: 'merge',      available: true },
        { id: 'insert',           label: 'Insert',            icon: 'arrow-down', available: true },
        { id: 'bulk-insert',      label: 'Bulk Insert',       icon: 'table-plus', available: true },
        { id: 'insert-overwrite', label: 'Insert Overwrite',  icon: 'refresh',    available: true },
        { id: 'delete',           label: 'Delete',            icon: 'trash',      available: true },
        { id: 'record-keys',      label: 'Keys & Precombine', icon: 'filter',     available: true },
      ],
    },
  ];

  // Hudi mark — teal→emerald stacked file-slices (base + log).
  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-hudi" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#14b8a6"/>
          <stop offset="100%" stop-color="#34d399"/>
        </linearGradient>
      </defs>
      <rect x="5" y="6"  width="22" height="7" rx="2" fill="url(#brand-grad-hudi)" opacity=".95"/>
      <rect x="5" y="15" width="22" height="4" rx="1.5" fill="url(#brand-grad-hudi)" opacity=".55"/>
      <rect x="5" y="21" width="22" height="4" rx="1.5" fill="url(#brand-grad-hudi)" opacity=".35"/>
    </svg>`;

  // Shared ShopKart numbers used across Hudi modules (consistent with the others).
  TV.HudiData = {
    table: 'orders',
    totalFileGroups: 4200, totalSize: '38.4 TB',
    tableType: 'Merge-on-Read',
    scenario: 'ShopKart Global E-Commerce — Apache Hudi on S3, Spark + Hive Metastore',
  };

  TV.registerFormat({
    id: 'hudi',
    label: 'Apache Hudi',
    short: 'Hudi',
    tagline: 'ShopKart Handbook',
    docsUrl: 'https://hudi.apache.org/docs/overview',
    docsLabel: 'Apache Hudi Docs',
    visible: false,      // hidden until the reveal partition (build complete enough)
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: NAV_GROUPS,
  });
})();
