// frontend/src/__tests__/unit/themeSwitcher.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SidebarBottomControls } from '@/components/sidebar/SidebarBottomControls';

describe('SidebarBottomControls Theme Switcher', () => {
  it('renders a closed dropdown button with listbox semantics', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('aria-haspopup="listbox"'), 'Must expose a listbox popup');
    assert.ok(html.includes('aria-expanded="false"'), 'Must start closed');
    assert.ok(html.includes('aria-label="Theme selector"'), 'Must have a default aria-label');
  });

  it('uses dict toggleTheme aria-label when available', () => {
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

    assert.ok(html.includes('aria-label="Custom Theme Selector"'), 'Must use custom dict toggleTheme');
  });

  it('shows the current theme label on the closed button when theme is "light"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'light',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('Light mode'), 'Button must show the light mode label');
  });

  it('shows the current theme label on the closed button when theme is "light-lemon"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'light-lemon',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('Light mode (Lemon)'), 'Button must show the light-lemon mode label');
  });

  it('shows the current theme label on the closed button when theme is "dark"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'dark',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('Dark mode'), 'Button must show the dark mode label');
  });

  it('shows the current theme label on the closed button when theme is "system"', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'system',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('System theme'), 'Button must show the system theme label');
  });

  it('falls back to the Laptop/system option when theme is unset or unrecognized', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'some-unknown-theme',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('System theme'), 'Must fall back to the system option label');
  });

  it('uses dictionary fallbacks for light, light-lemon, dark, and system labels when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        dict: {
          sidebar: {
            themeLight: 'Jasny',
            themeLightLemon: 'Jasny (Cytryna)',
            themeDark: 'Ciemny',
            themeSystem: 'Systemowy',
          },
        } as any,
        theme: 'dark',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('Ciemny'), 'Must render custom dark label on the closed button');
  });
});
