import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SidebarBottomControls } from '@/components/sidebar/SidebarBottomControls';

describe('SidebarBottomControls Theme Switcher', () => {
  it('renders theme switcher with light, dark, and system options', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('aria-label="Light mode"') || html.includes('aria-label="Light"'), 'Must have light mode control');
    assert.ok(html.includes('aria-label="Dark mode"') || html.includes('aria-label="Dark"'), 'Must have dark mode control');
    assert.ok(html.includes('aria-label="System theme"') || html.includes('aria-label="System"'), 'Must have system theme control');
  });

  it('renders theme switcher group role and uses dict toggleTheme aria-label when available', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        dict: {
          sidebar: {
            toggleTheme: 'Custom Theme Selector',
          },
        } as any,
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('role="group"'), 'Must have role="group" for theme switcher');
    assert.ok(html.includes('aria-label="Custom Theme Selector"'), 'Must use custom dict toggleTheme');
    assert.ok(html.includes('title="Light mode"'), 'Must have title for light mode');
    assert.ok(html.includes('title="Dark mode"'), 'Must have title for dark mode');
    assert.ok(html.includes('title="System theme"'), 'Must have title for system theme');
  });

  it('includes focus ring styling classes on all 3 theme buttons', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(
      html.includes('focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500 dark:focus-visible:ring-cyan-400'),
      'Must include focus ring classes on theme buttons'
    );
  });

  it('resolves active state correctly when theme is "light"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'light',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.match(html, /aria-label="Light mode"[^>]*aria-pressed="true"/, 'Light button must have aria-pressed="true"');
    assert.match(html, /aria-label="Dark mode"[^>]*aria-pressed="false"/, 'Dark button must have aria-pressed="false"');
    assert.match(html, /aria-label="System theme"[^>]*aria-pressed="false"/, 'System button must have aria-pressed="false"');
  });

  it('resolves active state correctly when theme is "dark"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'dark',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.match(html, /aria-label="Light mode"[^>]*aria-pressed="false"/, 'Light button must have aria-pressed="false"');
    assert.match(html, /aria-label="Dark mode"[^>]*aria-pressed="true"/, 'Dark button must have aria-pressed="true"');
    assert.match(html, /aria-label="System theme"[^>]*aria-pressed="false"/, 'System button must have aria-pressed="false"');
  });

  it('resolves active state correctly when theme is "system"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'system',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.match(html, /aria-label="Light mode"[^>]*aria-pressed="false"/, 'Light button must have aria-pressed="false"');
    assert.match(html, /aria-label="Dark mode"[^>]*aria-pressed="false"/, 'Dark button must have aria-pressed="false"');
    assert.match(html, /aria-label="System theme"[^>]*aria-pressed="true"/, 'System button must have aria-pressed="true"');
  });

  it('uses dictionary fallbacks for light, dark, and system labels when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        dict: {
          sidebar: {
            themeLight: 'Jasny',
            themeDark: 'Ciemny',
            themeSystem: 'Systemowy',
          },
        } as any,
        theme: 'dark',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('aria-label="Jasny"'), 'Must render custom light label');
    assert.ok(html.includes('aria-label="Ciemny"'), 'Must render custom dark label');
    assert.ok(html.includes('aria-label="Systemowy"'), 'Must render custom system label');
    assert.match(html, /aria-label="Ciemny"[^>]*aria-pressed="true"/, 'Active button must have aria-pressed="true" with custom label');
  });
});
