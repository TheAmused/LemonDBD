import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SidebarBottomControls } from '@/components/sidebar/SidebarBottomControls';

// Mock next-themes if needed or provide standard context
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
});
