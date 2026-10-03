// frontend/src/__tests__/unit/themeSwitcher.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { SidebarBottomControls } from '@/components/sidebar/SidebarBottomControls';
import enDict from '@/locales/en';
import { renderWithDictionary } from '../helpers/renderWithDictionary';

describe('SidebarBottomControls Theme Switcher', () => {
  it('renders a closed dropdown button with listbox semantics', () => {
    const html = renderWithDictionary(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      })
    );

    assert.ok(html.includes('aria-haspopup="listbox"'), 'Must expose a listbox popup');
    assert.ok(html.includes('aria-expanded="false"'), 'Must start closed');
    assert.ok(html.includes(`aria-label="${enDict.sidebar.toggleTheme}"`), 'Must label the selector from the dictionary');
  });

  it('uses dict toggleTheme aria-label when available', () => {
    const html = renderWithDictionary(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      }),
      { overrides: { sidebar: { toggleTheme: 'Custom Theme Selector' } } }
    );

    assert.ok(html.includes('aria-label="Custom Theme Selector"'), 'Must use custom dict toggleTheme');
  });

  it('shows the current theme label on the closed button when theme is "light"', () => {
    const html = renderWithDictionary(
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
    const html = renderWithDictionary(
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
    const html = renderWithDictionary(
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
    const html = renderWithDictionary(
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
    const html = renderWithDictionary(
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
    const html = renderWithDictionary(
      React.createElement(SidebarBottomControls, {
        currentLocale: 'en',
        theme: 'dark',
        onOpenBugModal: () => {},
        onOpenCoffeeModal: () => {},
      }),
      {
        overrides: {
          sidebar: {
            themeLight: 'Jasny',
            themeLightLemon: 'Jasny (Cytryna)',
            themeDark: 'Ciemny',
            themeSystem: 'Systemowy',
          },
        },
      }
    );

    assert.ok(html.includes('Ciemny'), 'Must render custom dark label on the closed button');
  });
});
