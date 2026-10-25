// frontend/scripts/site-tour-gallery.mjs
// Standalone offline zero-dependency HTML5 Visual Explorer generator for LemonDBD site tour.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, VIEWPORTS } from './site-tour-catalog.mjs';

/**
 * Builds the complete standalone HTML string for the site tour gallery.
 * @param {object|null} manifest - The tour manifest object or null for empty template.
 * @param {object} [options] - Additional generator options.
 * @returns {string} Fully formed standalone HTML5 document.
 */
export function generateGalleryHtml(manifest = null, options = {}) {
  const safeManifest = manifest && typeof manifest === 'object' ? manifest : {
    generatedAt: new Date().toISOString(),
    summary: { totalPages: 0, totalModals: 0, viewports: ['desktop', 'laptop', 'tablet', 'mobile'], totalScreenshots: 0 },
    items: [],
  };

  const embeddedData = JSON.stringify(safeManifest).replace(/</g, '\\u003c');
  const categoriesData = JSON.stringify(CATEGORIES || []).replace(/</g, '\\u003c');
  const viewportsData = JSON.stringify(VIEWPORTS || []).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LemonDBD Site Tour Gallery</title>
  <meta name="description" content="Offline visual tour and responsive screenshot explorer for LemonDBD" />
  <style>
    :root {
      --bg-page: #090d16;
      --bg-card: #0f172a;
      --bg-card-hover: #172033;
      --bg-panel: rgba(15, 23, 42, 0.85);
      --border-subtle: #1e293b;
      --border-accent: rgba(239, 68, 68, 0.35);
      --accent-red: #ef4444;
      --accent-red-hover: #dc2626;
      --accent-red-glow: rgba(239, 68, 68, 0.25);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --badge-page: #3b82f6;
      --badge-modal: #a855f7;
      --badge-desktop: #0ea5e9;
      --badge-laptop: #06b6d4;
      --badge-tablet: #10b981;
      --badge-mobile: #f59e0b;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05);
      --shadow-glow: 0 0 25px rgba(239, 68, 68, 0.2);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-page);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      line-height: 1.5;
    }

    /* Scrollbars */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #090d16;
    }
    ::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #3f3f46;
    }

    /* Top App Header */
    header.app-header {
      position: sticky;
      top: 0;
      z-index: 40;
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px var(--accent-red-glow);
    }

    .brand-logo svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #fff;
      stroke-width: 2.5;
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* View Switcher */
    .view-switcher {
      display: flex;
      background: #090d16;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 2px;
    }

    .view-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .view-btn.active {
      background: var(--bg-card);
      color: var(--text-primary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .view-btn svg {
      width: 15px;
      height: 15px;
    }

    /* Search Box */
    .search-wrapper {
      position: relative;
      width: 280px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px;
      height: 15px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      background: #090d16;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 7px 32px 7px 34px;
      color: var(--text-primary);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--accent-red);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }

    .search-clear {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: none;
      padding: 2px;
    }

    .search-clear:hover {
      color: var(--text-primary);
    }

    /* Subheader Controls & Filters */
    .controls-container {
      background: #0c1220;
      border-bottom: 1px solid var(--border-subtle);
      padding: 14px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-right: 4px;
    }

    .pill-btn {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pill-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .pill-btn.active {
      background: rgba(239, 68, 68, 0.15);
      border-color: var(--accent-red);
      color: #fca5a5;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
    }

    .pill-badge {
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.35);
      color: var(--text-muted);
    }

    .pill-btn.active .pill-badge {
      background: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    /* Category Pill Carousel */
    .category-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-muted);
      padding: 0 4px;
    }

    .status-count {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .reset-filters-btn {
      color: var(--accent-red);
      background: none;
      border: none;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
      display: none;
    }

    /* Main Content Area */
    main.app-main {
      flex: 1;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }

    /* Grid View */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .gallery-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-card);
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
      position: relative;
    }

    .gallery-card:hover {
      transform: translateY(-3px);
      border-color: var(--border-accent);
      box-shadow: var(--shadow-card), var(--shadow-glow);
    }

    .card-thumbnail-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 10;
      background: #090d16;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform 0.25s ease;
    }

    .gallery-card:hover .card-thumbnail {
      transform: scale(1.02);
    }

    .card-badges {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }

    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .badge-type-page {
      background: rgba(59, 130, 246, 0.85);
      color: #fff;
    }

    .badge-type-modal {
      background: rgba(168, 85, 247, 0.85);
      color: #fff;
    }

    .badge-device {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f1f5f9;
    }

    .card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .card-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }

    .card-route {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      align-self: flex-start;
    }

    .card-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-meta-dim {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }

    .card-action-btn {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 0.72rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .card-action-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Comparison View */
    .compare-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }

    .compare-toolbar {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .compare-select-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .compare-select {
      background: #090d16;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 6px 12px;
      font-size: 0.85rem;
      outline: none;
      max-width: 240px;
    }

    .compare-select:focus {
      border-color: var(--accent-red);
    }

    .compare-toggles {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .compare-split-pane {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      min-height: 600px;
      flex: 1;
    }

    @media (max-width: 900px) {
      .compare-split-pane {
        grid-template-columns: 1fr;
      }
    }

    .compare-pane {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 500px;
    }

    .compare-pane-header {
      padding: 12px 16px;
      background: #0c1220;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .compare-pane-title {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .compare-pane-body {
      flex: 1;
      overflow: auto;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: #090d16;
    }

    .compare-img {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }

    /* Lightbox Modal */
    .lightbox-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(9, 13, 22, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .lightbox-modal.active {
      opacity: 1;
      pointer-events: auto;
    }

    .lightbox-header {
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      background: rgba(15, 23, 42, 0.7);
    }

    .lightbox-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .lightbox-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .lightbox-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .icon-btn.btn-close:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: var(--accent-red);
      color: #fca5a5;
    }

    .lightbox-body {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      user-select: none;
    }

    .lightbox-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      transition: all 0.2s ease;
    }

    .lightbox-nav-btn:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: var(--accent-red);
      transform: translateY(-50%) scale(1.08);
    }

    .lightbox-nav-prev {
      left: 20px;
    }

    .lightbox-nav-next {
      right: 20px;
    }

    .lightbox-stage {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      overflow: hidden;
    }

    .lightbox-stage.dragging {
      cursor: grabbing;
    }

    .lightbox-img {
      max-width: 92%;
      max-height: 88vh;
      object-fit: contain;
      transform-origin: center center;
      transition: transform 0.1s ease-out;
      border-radius: 6px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    }

    .lightbox-footer {
      padding: 10px 24px;
      border-top: 1px solid var(--border-subtle);
      background: rgba(15, 23, 42, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .keyboard-hints {
      display: flex;
      gap: 12px;
    }

    .kbd {
      background: #090d16;
      border: 1px solid var(--border-subtle);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Empty state */
    .empty-state {
      grid-column: 1 / -1;
      padding: 60px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      color: var(--text-muted);
    }

    .empty-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .empty-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      max-width: 400px;
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="app-header">
    <div class="brand-section">
      <div class="brand-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </div>
      <div>
        <div class="brand-title">
          LemonDBD Site Tour Gallery
          <span class="brand-badge">Visual Explorer</span>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <!-- Search -->
      <div class="search-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          id="search-input"
          class="search-input"
          type="search"
          placeholder="Search pages, modals, routes... (/)"
          autocomplete="off"
        />
        <button id="search-clear" class="search-clear" title="Clear search">&times;</button>
      </div>

      <!-- Mode Switcher -->
      <div class="view-switcher" role="radiogroup" aria-label="View Mode">
        <button id="view-grid-btn" class="view-btn active" data-view="grid" title="Card Grid Explorer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Grid
        </button>
        <button id="view-compare-btn" class="view-btn" data-view="compare" title="Side-by-side Comparison">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="9" height="18" rx="1"></rect>
            <rect x="13" y="3" width="9" height="18" rx="1"></rect>
          </svg>
          Compare
        </button>
      </div>
    </div>
  </header>

  <!-- Filter & Controls Toolbar -->
  <div class="controls-container">
    <div class="filter-row">
      <!-- Device Filter -->
      <div class="filter-group" role="group" aria-label="Filter by Device">
        <span class="filter-label">Device:</span>
        <button class="pill-btn active" data-device="all">All</button>
        <button class="pill-btn" data-device="desktop">Desktop (1920)</button>
        <button class="pill-btn" data-device="laptop">Laptop (1280)</button>
        <button class="pill-btn" data-device="tablet">Tablet (768)</button>
        <button class="pill-btn" data-device="mobile">Mobile (390)</button>
      </div>

      <!-- Type Filter -->
      <div class="filter-group" role="group" aria-label="Filter by Type">
        <span class="filter-label">Type:</span>
        <button class="pill-btn active" data-type="all">All</button>
        <button class="pill-btn" data-type="page">Pages Only</button>
        <button class="pill-btn" data-type="modal">Modals Only</button>
      </div>
    </div>

    <!-- Category Pills Scrollable Row -->
    <div class="category-scroll" id="category-pills" role="group" aria-label="Filter by Category">
      <button class="pill-btn active" data-category="all">
        All Categories
        <span class="pill-badge" id="category-badge-all">0</span>
      </button>
      <!-- Dynamic Category Pills injected here -->
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <div>
        Showing <span id="filtered-count" class="status-count">0</span> of
        <span id="total-count" class="status-count">0</span> screenshots
      </div>
      <button id="reset-filters" class="reset-filters-btn">Reset Filters</button>
    </div>
  </div>

  <!-- Main View Stage -->
  <main class="app-main">
    <!-- Grid View Mode -->
    <div id="gallery" class="gallery-grid">
      <!-- Cards rendered via JavaScript -->
    </div>

    <!-- Side-by-Side Comparison Mode -->
    <div id="compare-view" class="compare-container hidden">
      <div class="compare-toolbar">
        <div class="compare-select-group">
          <span class="filter-label">Feature:</span>
          <select id="compare-feature-select" class="compare-select"></select>
        </div>

        <div class="compare-select-group">
          <span class="filter-label">Left:</span>
          <select id="compare-left-select" class="compare-select"></select>

          <span class="filter-label">Right:</span>
          <select id="compare-right-select" class="compare-select"></select>
        </div>

        <div class="compare-toggles">
          <label class="toggle-label">
            <input type="checkbox" id="compare-sync-scroll" checked />
            Sync Scroll
          </label>
        </div>
      </div>

      <div class="compare-split-pane">
        <div class="compare-pane">
          <div class="compare-pane-header">
            <div id="compare-left-title" class="compare-pane-title">Left Preview</div>
            <div id="compare-left-badge" class="badge badge-device">Desktop</div>
          </div>
          <div id="compare-left-body" class="compare-pane-body">
            <img id="compare-left-img" class="compare-img" alt="Left Viewport" />
          </div>
        </div>

        <div class="compare-pane">
          <div class="compare-pane-header">
            <div id="compare-right-title" class="compare-pane-title">Right Preview</div>
            <div id="compare-right-badge" class="badge badge-device">Mobile</div>
          </div>
          <div id="compare-right-body" class="compare-pane-body">
            <img id="compare-right-img" class="compare-img" alt="Right Viewport" />
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Lightbox Modal -->
  <div id="lightbox" class="lightbox-modal" role="dialog" aria-modal="true" aria-label="Screenshot Lightbox">
    <div class="lightbox-header">
      <div class="lightbox-title-group">
        <span id="lightbox-badge-type" class="badge badge-type-page">Page</span>
        <span id="lightbox-badge-device" class="badge badge-device">Desktop</span>
        <span id="lightbox-title" class="lightbox-title">Screenshot</span>
        <span id="lightbox-route" class="card-route">/en</span>
      </div>

      <div class="lightbox-controls">
        <button id="lightbox-zoom-out" class="icon-btn" title="Zoom Out (-)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button id="lightbox-zoom-reset" class="icon-btn" title="Reset Zoom (0)">
          <span id="lightbox-zoom-level" style="font-size: 0.72rem; font-weight: 700;">100%</span>
        </button>
        <button id="lightbox-zoom-in" class="icon-btn" title="Zoom In (+)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <a id="lightbox-open-raw" class="icon-btn" target="_blank" rel="noopener noreferrer" title="Open Original File">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
        <button id="lightbox-close" class="icon-btn btn-close" title="Close (Esc)">
          &times;
        </button>
      </div>
    </div>

    <div class="lightbox-body">
      <button id="lightbox-prev" class="lightbox-nav-btn lightbox-nav-prev" title="Previous (Left Arrow)">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div id="lightbox-stage" class="lightbox-stage">
        <img id="lightbox-img" class="lightbox-img" alt="Preview" draggable="false" />
      </div>

      <button id="lightbox-next" class="lightbox-nav-btn lightbox-nav-next" title="Next (Right Arrow)">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <div class="lightbox-footer">
      <div id="lightbox-counter">1 of 1</div>
      <div class="keyboard-hints">
        <span><span class="kbd">&larr;</span> / <span class="kbd">&rarr;</span> Navigate</span>
        <span><span class="kbd">+</span> / <span class="kbd">-</span> Zoom</span>
        <span><span class="kbd">Esc</span> Close</span>
      </div>
    </div>
  </div>

  <!-- Embedded Data & Application Script -->
  <script>
    window.__EMBEDDED_MANIFEST__ = ${embeddedData};
    window.__CATALOG_CATEGORIES__ = ${categoriesData};
    window.__CATALOG_VIEWPORTS__ = ${viewportsData};

    (function() {
      // Application State
      const state = {
        manifest: window.__EMBEDDED_MANIFEST__ || { items: [] },
        filters: {
          device: 'all',
          type: 'all',
          category: 'all',
          search: '',
        },
        viewMode: 'grid',
        filteredItems: [],
        lightbox: {
          open: false,
          currentIndex: -1,
          zoom: 1,
          panX: 0,
          panY: 0,
          isDragging: false,
          startX: 0,
          startY: 0,
        },
        compare: {
          feature: '',
          leftId: '',
          rightId: '',
          syncScroll: true,
        }
      };

      // Elements
      const galleryEl = document.getElementById('gallery');
      const compareViewEl = document.getElementById('compare-view');
      const searchInput = document.getElementById('search-input');
      const searchClearBtn = document.getElementById('search-clear');
      const filteredCountEl = document.getElementById('filtered-count');
      const totalCountEl = document.getElementById('total-count');
      const resetFiltersBtn = document.getElementById('reset-filters');
      const categoryPillsContainer = document.getElementById('category-pills');

      // Lightbox Elements
      const lightboxModal = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      const lightboxStage = document.getElementById('lightbox-stage');
      const lightboxTitle = document.getElementById('lightbox-title');
      const lightboxRoute = document.getElementById('lightbox-route');
      const lightboxBadgeType = document.getElementById('lightbox-badge-type');
      const lightboxBadgeDevice = document.getElementById('lightbox-badge-device');
      const lightboxCounter = document.getElementById('lightbox-counter');
      const lightboxZoomLevel = document.getElementById('lightbox-zoom-level');
      const lightboxOpenRaw = document.getElementById('lightbox-open-raw');

      // Compare Elements
      const compareFeatureSelect = document.getElementById('compare-feature-select');
      const compareLeftSelect = document.getElementById('compare-left-select');
      const compareRightSelect = document.getElementById('compare-right-select');
      const compareSyncScroll = document.getElementById('compare-sync-scroll');
      const compareLeftBody = document.getElementById('compare-left-body');
      const compareRightBody = document.getElementById('compare-right-body');
      const compareLeftImg = document.getElementById('compare-left-img');
      const compareRightImg = document.getElementById('compare-right-img');
      const compareLeftTitle = document.getElementById('compare-left-title');
      const compareRightTitle = document.getElementById('compare-right-title');
      const compareLeftBadge = document.getElementById('compare-left-badge');
      const compareRightBadge = document.getElementById('compare-right-badge');

      // Initialize
      async function init() {
        // Attempt dynamic live fetch if served via HTTP/HTTPS
        if (window.location.protocol.startsWith('http')) {
          try {
            const res = await fetch('./manifest.json', { cache: 'no-cache' });
            if (res.ok) {
              const liveManifest = await res.json();
              if (liveManifest && Array.isArray(liveManifest.items)) {
                state.manifest = liveManifest;
              }
            }
          } catch (e) {
            console.debug('Dynamic manifest fetch skipped, using embedded manifest.', e);
          }
        }

        renderCategoryPills();
        bindEvents();
        applyFilters();
      }

      // Format helpers
      function getItemDevice(item) {
        if (item.device) return item.device.toLowerCase();
        if (item.viewport) return item.viewport.split('-')[0].toLowerCase();
        return 'desktop';
      }

      function getItemTitle(item) {
        return item.name || item.title || item.id || 'Untitled Screenshot';
      }

      function getItemType(item) {
        return (item.type || 'page').toLowerCase();
      }

      // Render Dynamic Category Pills
      function renderCategoryPills() {
        const categories = window.__CATALOG_CATEGORIES__ || [];
        const items = state.manifest.items || [];
        const counts = {};

        for (const item of items) {
          const cat = item.category || 'other';
          counts[cat] = (counts[cat] || 0) + 1;
        }

        const allBadge = document.getElementById('category-badge-all');
        if (allBadge) allBadge.textContent = items.length;

        // Build pills
        const existingCustomPills = categoryPillsContainer.querySelectorAll('[data-category]:not([data-category="all"])');
        existingCustomPills.forEach(p => p.remove());

        const definedCats = new Set(categories.map(c => c.id));
        const allKnownCategories = [...categories];

        for (const cat of Object.keys(counts)) {
          if (!definedCats.has(cat)) {
            allKnownCategories.push({ id: cat, title: cat.charAt(0).toUpperCase() + cat.slice(1) });
          }
        }

        for (const cat of allKnownCategories) {
          const count = counts[cat.id] || 0;
          if (count === 0 && items.length > 0) continue; // Skip empty categories if items exist

          const btn = document.createElement('button');
          btn.className = 'pill-btn';
          btn.dataset.category = cat.id;
          btn.innerHTML = \`\${cat.title} <span class="pill-badge">\${count}</span>\`;
          categoryPillsContainer.appendChild(btn);
        }
      }

      // Filtering Logic
      function applyFilters() {
        const items = state.manifest.items || [];
        const { device, type, category, search } = state.filters;
        const query = search.trim().toLowerCase();

        state.filteredItems = items.filter(item => {
          const itemDev = getItemDevice(item);
          const itemType = getItemType(item);
          const itemCat = (item.category || 'other').toLowerCase();
          const itemTitle = getItemTitle(item).toLowerCase();
          const itemRoute = (item.route || '').toLowerCase();
          const itemId = (item.id || '').toLowerCase();

          if (device !== 'all' && itemDev !== device) return false;
          if (type !== 'all' && itemType !== type) return false;
          if (category !== 'all' && itemCat !== category.toLowerCase()) return false;

          if (query) {
            const matches = itemTitle.includes(query) ||
              itemRoute.includes(query) ||
              itemCat.includes(query) ||
              itemId.includes(query);
            if (!matches) return false;
          }

          return true;
        });

        // Update counts
        filteredCountEl.textContent = state.filteredItems.length;
        totalCountEl.textContent = items.length;

        const hasActiveFilters = device !== 'all' || type !== 'all' || category !== 'all' || query.length > 0;
        resetFiltersBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';

        if (state.viewMode === 'grid') {
          renderGrid();
        } else {
          populateCompareOptions();
        }
      }

      // Render Cards in Grid
      function renderGrid() {
        if (!state.filteredItems || state.filteredItems.length === 0) {
          galleryEl.innerHTML = \`
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <div class="empty-title">No screenshots found</div>
              <div class="empty-desc">No screenshots matched the active search and filter criteria, or none have been captured yet.</div>
            </div>
          \`;
          return;
        }

        const cardsHtml = state.filteredItems.map((item, index) => {
          const title = getItemTitle(item);
          const dev = getItemDevice(item);
          const type = getItemType(item);
          const route = item.route || '';
          const dims = item.width && item.height ? \`\${item.width} &times; \${item.height}\` : dev.toUpperCase();
          const size = item.filesize ? \`&bull; \${item.filesize}\` : '';
          const typeClass = type === 'modal' ? 'badge-type-modal' : 'badge-type-page';

          return \`
            <div class="gallery-card" data-index="\${index}" data-id="\${item.id || ''}">
              <div class="card-thumbnail-wrap">
                <img
                  class="card-thumbnail"
                  src="\${item.path}"
                  alt="\${title}"
                  loading="lazy"
                  onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\\'color:#64748b;font-size:0.8rem;text-align:center;padding:20px;\\\'>Image pending capture<br/>(\${item.path})</div>';"
                />
                <div class="card-badges">
                  <span class="badge \${typeClass}">\${type}</span>
                  <span class="badge badge-device">\${dev}</span>
                </div>
              </div>
              <div class="card-body">
                <div class="card-title-row">
                  <div class="card-title">\${title}</div>
                </div>
                \${route ? \`<div class="card-route" title="\${route}">\${route}</div>\` : ''}
                <div class="card-footer">
                  <div class="card-meta-dim">
                    <span>\${dims}</span>
                    <span>\${size}</span>
                  </div>
                  <div class="card-actions">
                    <button class="card-action-btn action-compare" data-id="\${item.id}" title="Compare with another viewport">Compare</button>
                    <button class="card-action-btn action-zoom" data-index="\${index}" title="Open high-res lightbox">Inspect</button>
                  </div>
                </div>
              </div>
            </div>
          \`;
        }).join('');

        galleryEl.innerHTML = cardsHtml;
      }

      // Lightbox Controls
      function openLightbox(index) {
        if (index < 0 || index >= state.filteredItems.length) return;
        state.lightbox.open = true;
        state.lightbox.currentIndex = index;
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;

        updateLightboxImage();
        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      function closeLightbox() {
        state.lightbox.open = false;
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
      }

      function updateLightboxImage() {
        const item = state.filteredItems[state.lightbox.currentIndex];
        if (!item) return;

        const title = getItemTitle(item);
        const dev = getItemDevice(item);
        const type = getItemType(item);

        lightboxTitle.textContent = title;
        lightboxRoute.textContent = item.route || '';
        lightboxBadgeType.textContent = type;
        lightboxBadgeType.className = \`badge \${type === 'modal' ? 'badge-type-modal' : 'badge-type-page'}\`;
        lightboxBadgeDevice.textContent = dev;
        lightboxCounter.textContent = \`\${state.lightbox.currentIndex + 1} of \${state.filteredItems.length}\`;
        lightboxOpenRaw.href = item.path;

        lightboxImg.src = item.path;
        applyLightboxTransform();
      }

      function applyLightboxTransform() {
        const { zoom, panX, panY } = state.lightbox;
        lightboxImg.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoom})\`;
        lightboxZoomLevel.textContent = \`\${Math.round(zoom * 100)}%\`;
      }

      function zoomLightbox(delta) {
        const newZoom = Math.min(Math.max(state.lightbox.zoom + delta, 0.4), 4.0);
        state.lightbox.zoom = newZoom;
        if (newZoom === 1) {
          state.lightbox.panX = 0;
          state.lightbox.panY = 0;
        }
        applyLightboxTransform();
      }

      function resetLightboxZoom() {
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;
        applyLightboxTransform();
      }

      function navLightbox(direction) {
        if (!state.lightbox.open) return;
        const total = state.filteredItems.length;
        if (total <= 1) return;
        let nextIndex = state.lightbox.currentIndex + direction;
        if (nextIndex < 0) nextIndex = total - 1;
        if (nextIndex >= total) nextIndex = 0;
        openLightbox(nextIndex);
      }

      // Side-by-Side Comparison Feature
      function populateCompareOptions() {
        const allItems = state.manifest.items || [];
        if (allItems.length === 0) return;

        // Group items by base feature/route
        const featureMap = new Map();
        for (const item of allItems) {
          const key = item.route || item.category || 'general';
          if (!featureMap.has(key)) featureMap.set(key, []);
          featureMap.get(key).push(item);
        }

        // Populate Feature Dropdown
        compareFeatureSelect.innerHTML = Array.from(featureMap.keys()).map(feat => {
          return \`<option value="\${feat}">\${feat}</option>\`;
        }).join('');

        if (!state.compare.feature && featureMap.size > 0) {
          state.compare.feature = featureMap.keys().next().value;
        }
        if (state.compare.feature) {
          compareFeatureSelect.value = state.compare.feature;
        }

        updateCompareItemDropdowns();
      }

      function updateCompareItemDropdowns() {
        const allItems = state.manifest.items || [];
        const featureKey = compareFeatureSelect.value || state.compare.feature;
        const relevantItems = allItems.filter(i => (i.route || i.category || 'general') === featureKey);
        const optionsList = (relevantItems.length > 0 ? relevantItems : allItems);

        function makeOptions(selectedId) {
          return optionsList.map(item => {
            const label = \`[\${getItemDevice(item)}] \${getItemTitle(item)} (\${getItemType(item)})\`;
            const sel = item.id === selectedId ? 'selected' : '';
            return \`<option value="\${item.id}" \${sel}>\${label}</option>\`;
          }).join('');
        }

        // Try smart auto-pair: desktop on left, mobile on right
        let leftItem = optionsList.find(i => getItemDevice(i) === 'desktop') || optionsList[0];
        let rightItem = optionsList.find(i => getItemDevice(i) === 'mobile') || optionsList[Math.min(1, optionsList.length - 1)];

        if (!state.compare.leftId && leftItem) state.compare.leftId = leftItem.id;
        if (!state.compare.rightId && rightItem) state.compare.rightId = rightItem.id;

        compareLeftSelect.innerHTML = makeOptions(state.compare.leftId);
        compareRightSelect.innerHTML = makeOptions(state.compare.rightId);

        renderComparePanes();
      }

      function renderComparePanes() {
        const allItems = state.manifest.items || [];
        const leftItem = allItems.find(i => i.id === state.compare.leftId) || allItems[0];
        const rightItem = allItems.find(i => i.id === state.compare.rightId) || allItems[1] || leftItem;

        if (leftItem) {
          compareLeftTitle.textContent = getItemTitle(leftItem);
          compareLeftBadge.textContent = getItemDevice(leftItem);
          compareLeftImg.src = leftItem.path;
        }
        if (rightItem) {
          compareRightTitle.textContent = getItemTitle(rightItem);
          compareRightBadge.textContent = getItemDevice(rightItem);
          compareRightImg.src = rightItem.path;
        }
      }

      // Event Listeners
      function bindEvents() {
        // Search
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            state.filters.search = e.target.value;
            searchClearBtn.style.display = e.target.value ? 'block' : 'none';
            applyFilters();
          }, 150);
        });

        searchClearBtn.addEventListener('click', () => {
          searchInput.value = '';
          state.filters.search = '';
          searchClearBtn.style.display = 'none';
          applyFilters();
          searchInput.focus();
        });

        // View Mode Switcher
        document.querySelectorAll('.view-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (state.viewMode === view) return;
            state.viewMode = view;

            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (view === 'grid') {
              galleryEl.classList.remove('hidden');
              compareViewEl.classList.add('hidden');
              renderGrid();
            } else {
              galleryEl.classList.add('hidden');
              compareViewEl.classList.remove('hidden');
              populateCompareOptions();
            }
          });
        });

        // Device filter pills
        document.querySelectorAll('[data-device]').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('[data-device]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.device = btn.dataset.device;
            applyFilters();
          });
        });

        // Type filter pills
        document.querySelectorAll('[data-type]').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.type = btn.dataset.type;
            applyFilters();
          });
        });

        // Category filter pills delegation
        categoryPillsContainer.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-category]');
          if (!btn) return;
          categoryPillsContainer.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.filters.category = btn.dataset.category;
          applyFilters();
        });

        // Reset filters button
        resetFiltersBtn.addEventListener('click', () => {
          state.filters = { device: 'all', type: 'all', category: 'all', search: '' };
          searchInput.value = '';
          searchClearBtn.style.display = 'none';

          document.querySelectorAll('[data-device]').forEach(b => b.classList.toggle('active', b.dataset.device === 'all'));
          document.querySelectorAll('[data-type]').forEach(b => b.classList.toggle('active', b.dataset.type === 'all'));
          categoryPillsContainer.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b.dataset.category === 'all'));

          applyFilters();
        });

        // Gallery Card Click delegation
        galleryEl.addEventListener('click', (e) => {
          const compareBtn = e.target.closest('.action-compare');
          if (compareBtn) {
            e.stopPropagation();
            const itemId = compareBtn.dataset.id;
            state.compare.leftId = itemId;
            document.getElementById('view-compare-btn').click();
            return;
          }

          const card = e.target.closest('.gallery-card');
          if (!card) return;
          const index = parseInt(card.dataset.index, 10);
          openLightbox(index);
        });

        // Lightbox Navigation & Actions
        document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
        document.getElementById('lightbox-prev').addEventListener('click', () => navLightbox(-1));
        document.getElementById('lightbox-next').addEventListener('click', () => navLightbox(1));
        document.getElementById('lightbox-zoom-in').addEventListener('click', () => zoomLightbox(0.25));
        document.getElementById('lightbox-zoom-out').addEventListener('click', () => zoomLightbox(-0.25));
        document.getElementById('lightbox-zoom-reset').addEventListener('click', resetLightboxZoom);

        // Lightbox Panning / Dragging
        lightboxStage.addEventListener('mousedown', (e) => {
          if (state.lightbox.zoom <= 1) return;
          state.lightbox.isDragging = true;
          state.lightbox.startX = e.clientX - state.lightbox.panX;
          state.lightbox.startY = e.clientY - state.lightbox.panY;
          lightboxStage.classList.add('dragging');
        });

        window.addEventListener('mousemove', (e) => {
          if (!state.lightbox.isDragging) return;
          state.lightbox.panX = e.clientX - state.lightbox.startX;
          state.lightbox.panY = e.clientY - state.lightbox.startY;
          applyLightboxTransform();
        });

        window.addEventListener('mouseup', () => {
          state.lightbox.isDragging = false;
          lightboxStage.classList.remove('dragging');
        });

        // Lightbox Mousewheel Zoom
        lightboxStage.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.2 : -0.2;
          zoomLightbox(delta);
        }, { passive: false });

        // Compare Selectors
        compareFeatureSelect.addEventListener('change', (e) => {
          state.compare.feature = e.target.value;
          state.compare.leftId = '';
          state.compare.rightId = '';
          updateCompareItemDropdowns();
        });

        compareLeftSelect.addEventListener('change', (e) => {
          state.compare.leftId = e.target.value;
          renderComparePanes();
        });

        compareRightSelect.addEventListener('change', (e) => {
          state.compare.rightId = e.target.value;
          renderComparePanes();
        });

        // Compare Synchronized Scroll
        let isSyncingLeft = false;
        let isSyncingRight = false;
        compareLeftBody.addEventListener('scroll', () => {
          if (!compareSyncScroll.checked || isSyncingLeft) return;
          isSyncingRight = true;
          const ratio = compareLeftBody.scrollTop / (compareLeftBody.scrollHeight - compareLeftBody.clientHeight || 1);
          compareRightBody.scrollTop = ratio * (compareRightBody.scrollHeight - compareRightBody.clientHeight);
          setTimeout(() => { isSyncingRight = false; }, 50);
        });

        compareRightBody.addEventListener('scroll', () => {
          if (!compareSyncScroll.checked || isSyncingRight) return;
          isSyncingLeft = true;
          const ratio = compareRightBody.scrollTop / (compareRightBody.scrollHeight - compareRightBody.clientHeight || 1);
          compareLeftBody.scrollTop = ratio * (compareLeftBody.scrollHeight - compareLeftBody.clientHeight);
          setTimeout(() => { isSyncingLeft = false; }, 50);
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
          // Focus search on '/'
          if (e.key === '/' && !state.lightbox.open && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
            return;
          }

          if (state.lightbox.open) {
            if (e.key === 'Escape') {
              closeLightbox();
            } else if (e.key === 'ArrowLeft') {
              navLightbox(-1);
            } else if (e.key === 'ArrowRight') {
              navLightbox(1);
            } else if (e.key === '+' || e.key === '=') {
              zoomLightbox(0.25);
            } else if (e.key === '-' || e.key === '_') {
              zoomLightbox(-0.25);
            } else if (e.key === '0') {
              resetLightboxZoom();
            }
          }
        });
      }

      // Boot application
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Writes the generated HTML gallery directly to a target file path.
 * @param {string} targetPath - Absolute or relative file path for index.html.
 * @param {object|null} manifest - Tour manifest object.
 * @returns {string} The path where the gallery was written.
 */
export function writeGalleryFile(targetPath, manifest = null) {
  const html = generateGalleryHtml(manifest);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, html, 'utf-8');
  return targetPath;
}

// Auto-run if executed directly as a script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const targetHtml = path.resolve(projectRoot, 'additions/screenshots/index.html');
  const manifestPath = path.resolve(projectRoot, 'additions/screenshots/manifest.json');

  let manifestData = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`Loaded existing manifest from: ${manifestPath}`);
    } catch (e) {
      console.warn(`Could not parse ${manifestPath}, using default empty manifest.`, e.message);
    }
  }

  writeGalleryFile(targetHtml, manifestData);
  console.log(`Wrote visual gallery to: ${targetHtml}`);
}
