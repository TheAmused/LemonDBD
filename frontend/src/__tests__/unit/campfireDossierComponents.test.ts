// frontend/src/__tests__/unit/campfireDossierComponents.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampfireHeader } from '@/components/user/CampfireHeader';
import { VaultMasteryDials } from '@/components/user/VaultMasteryDials';
import { PerkDiamondSlot } from '@/components/user/PerkDiamondSlot';
import { MainCard } from '@/components/user/MainCard';
import { DualMainsShowcase } from '@/components/user/DualMainsShowcase';
import { UserBugReportsDrawer } from '@/components/user/UserBugReportsDrawer';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { StreakTrophyCard } from '@/components/user/StreakTrophyCard';
import { DEFAULT_SHOWCASE_STATE } from '@/types/userShowcase';
import type { Perk } from '@/types/perks';

describe('Campfire Dossier: CampfireHeader', () => {
  const mockUser = {
    id: 1,
    username: 'CampfireMaster',
    email: 'master@fog.dbd',
    role: 'user',
    created_at: '2026-01-01T00:00:00Z',
  };

  it('renders player username, title, and hides devotion, grade, email, and status badges', () => {
    const html = renderToStaticMarkup(
      React.createElement(CampfireHeader, {
        user: mockUser,
        showcase: DEFAULT_SHOWCASE_STATE,
        isSaving: false,
        saveError: null,
        onTitleChange: () => {},
        onDevotionChange: () => {},
        onGradeRankChange: () => {},
        currentLocale: 'en',
      })
    );

    assert.ok(html.includes('CampfireMaster'));
    assert.ok(html.includes('The Camper'));
    // Omitted / hidden per user mandate
    assert.ok(!html.includes('Saved to Database'));
    assert.ok(!html.includes('Lvl'));
    assert.ok(!html.includes('master@fog.dbd'));
  });
});

describe('Campfire Dossier: VaultMasteryDials', () => {
  it('renders 3 radial completion dials with percentages and totals', () => {
    const mockOwnership = {
      survivors: { owned: 40, total: 54, percentage: 74 },
      killers: { owned: 30, total: 44, percentage: 68 },
      perks: { unlocked: 250, total: 321, percentage: 78 },
    };

    const html = renderToStaticMarkup(
      React.createElement(VaultMasteryDials, { ownership: mockOwnership })
    );

    assert.ok(html.includes('74%'));
    assert.ok(html.includes('40/54'));
    assert.ok(html.includes('68%'));
    assert.ok(html.includes('30/44'));
    assert.ok(html.includes('78%'));
    assert.ok(html.includes('250/321'));
  });
});

describe('Campfire Dossier: PerkDiamondSlot', () => {
  it('renders empty slot with rotate-45 diamond container and empty label', () => {
    const html = renderToStaticMarkup(
      React.createElement(PerkDiamondSlot, {
        slotIndex: 0,
        perk: null,
        onClick: () => {},
        emptyLabel: 'Empty Slot',
      })
    );

    assert.ok(html.includes('rotate-45'));
    assert.ok(html.includes('Empty Slot'));
  });

  it('renders equipped perk with purple diamond border and perk name', () => {
    const mockPerk: Perk = {
      id: 99,
      name: 'Sprint Burst',
      character: 'Meg Thomas',
      category: 'Survivor',
      description: 'Break into a sprint.',
      icon_url: 'https://example.com/sprint.png',
      icon_local_path: 'sprint.png',
    };

    const html = renderToStaticMarkup(
      React.createElement(PerkDiamondSlot, {
        slotIndex: 0,
        perk: mockPerk,
        onClick: () => {},
        onClear: () => {},
      })
    );

    assert.ok(html.includes('Sprint Burst'));
    assert.ok(html.includes('border-purple-500'));
  });
});

describe('Campfire Dossier: MainCard', () => {
  it('renders Survivor main card with character name and 4 diamond slots', () => {
    const html = renderToStaticMarkup(
      React.createElement(MainCard, {
        role: 'Survivor',
        loadout: {
          characterName: 'Feng Min',
          prestige: 0,
          perkIds: [null, null, null, null],
        },
        onCharacterChange: () => {},
        onPrestigeChange: () => {},
        onPerkChange: () => {},
        onOpenCharacterModal: () => {},
        onOpenPerkModal: () => {},
        locale: 'en',
      })
    );

    assert.ok(html.includes('Survivor Main'));
    assert.ok(html.includes('Feng Min'));
    assert.ok(html.includes('4-Perk Signature Loadout'));
    assert.ok(!html.includes('Prestige level'));
  });

  it('renders Killer main card with character name', () => {
    const html = renderToStaticMarkup(
      React.createElement(MainCard, {
        role: 'Killer',
        loadout: {
          characterName: 'The Blight',
          prestige: 0,
          perkIds: [null, null, null, null],
        },
        onCharacterChange: () => {},
        onPrestigeChange: () => {},
        onPerkChange: () => {},
        onOpenCharacterModal: () => {},
        onOpenPerkModal: () => {},
        locale: 'en',
      })
    );

    assert.ok(html.includes('Killer Main'));
    assert.ok(html.includes('The Blight'));
    assert.ok(!html.includes('Prestige level'));
  });
});

describe('Campfire Dossier: StreakTrophyCard', () => {
  it('renders trial trophy links and strictly ignores "Others" and quests', () => {
    const html = renderToStaticMarkup(
      React.createElement(StreakTrophyCard, { currentLocale: 'en' })
    );

    assert.ok(html.includes('/en/streaks'));
    assert.ok(html.includes('/en/streaks/killer/gauntlet-streak'));
    assert.ok(html.includes('/en/streaks/killer/chaos-streak'));
    assert.ok(html.includes('/en/streaks/killer/page-streak'));

    // Assert strict omission of quests and "Others"
    assert.ok(!html.toLowerCase().includes('quest'));
    assert.ok(!html.includes('guesser'));
    assert.ok(!html.includes('draft'));
    assert.ok(!html.includes('swf'));
    assert.ok(!html.includes('killer-calculator'));
  });
});

describe('User Profile Drawers: DualMainsShowcase & UserBugReportsDrawer', () => {
  it('DualMainsShowcase has centered text, no SlidersHorizontal icon, no Show Loadouts button, and smooth drawer grid animation', () => {
    const html = renderToStaticMarkup(
      React.createElement(DualMainsShowcase, {
        showcase: DEFAULT_SHOWCASE_STATE,
        onSurvivorCharacterChange: () => {},
        onSurvivorPrestigeChange: () => {},
        onSurvivorPerkChange: () => {},
        onKillerCharacterChange: () => {},
        onKillerPrestigeChange: () => {},
        onKillerPerkChange: () => {},
      })
    );

    // Centered text
    assert.ok(html.includes('text-center'), 'Must center the header text');
    assert.ok(html.includes('Signature Loadouts'));
    assert.ok(html.includes('Feng Min • The Blight'));

    // No icons or clumsy buttons in header
    assert.ok(!html.includes('Show Loadouts'), 'Must not have separate Show Loadouts button');
    assert.ok(!html.includes('Hide Loadouts'), 'Must not have separate Hide Loadouts button');
    assert.ok(!html.includes('lucide-sliders-horizontal'), 'Must not render sliders icon');

    // Smooth drawer animation classes
    assert.ok(html.includes('grid-rows-[1fr]'), 'Must support expanding grid transition');
    assert.ok(html.includes('transition-[grid-template-rows,opacity]'), 'Must use smooth grid transition');
  });

  it('UserBugReportsDrawer has centered text, no icons in header, and smooth drawer grid animation', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserBugReportsDrawer, {
        reports: [],
        loading: false,
        onOpenReportModal: () => {},
        total: 0,
        page: 1,
        perPage: 10,
        totalPages: 1,
        onPageChange: () => {},
      })
    );

    // Centered text
    assert.ok(html.includes('text-center'), 'Must center header text in Bug Reports drawer');
    assert.ok(html.includes('My Bug Reports'));

    // Smooth drawer grid animation (collapsed by default)
    assert.ok(html.includes('grid-rows-[0fr]'), 'Must start in collapsed 0fr grid state');
    assert.ok(html.includes('transition-[grid-template-rows,opacity]'), 'Must use smooth grid transition');
  });

  it('UserProfileForm renders as Account Management drawer with centered header and banner', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserProfileForm, {
        initialEmail: 'test@lemondbd.com',
        onRefreshUser: async () => {},
      })
    );

    // Header has Account Management and centered text
    assert.ok(html.includes('text-center'), 'Must center header text in Account Management drawer');
    assert.ok(html.includes('Account Management'), 'Must display Account Management title');
    assert.ok(!html.includes('Account Sanctum'), 'Must not display legacy Account Sanctum title');
    assert.ok(html.includes('banner_account.jpg'), 'Must display account banner image');

    // Smooth drawer grid animation
    assert.ok(html.includes('grid-rows-[0fr]'), 'Must start in collapsed 0fr grid state');
    assert.ok(html.includes('transition-[grid-template-rows,opacity]'), 'Must use smooth grid transition');
  });
});
