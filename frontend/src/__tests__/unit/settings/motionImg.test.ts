// frontend/src/__tests__/unit/settings/motionImg.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MotionImg, isGifSource, shouldHoldStill } from '@/components/common/MotionImg';
import { parseSitePreferences } from '@/context/PreferencesContext';

describe('GIF detection', () => {
  it('recognises a path ending in .gif, ignoring query and hash and letter case', () => {
    assert.equal(isGifSource('https://cdn.example.com/a/dance.gif'), true);
    assert.equal(isGifSource('/static/uploads/Dance.GIF?v=3'), true);
    assert.equal(isGifSource('https://cdn.example.com/dance.gif#t=1'), true);
  });

  it('recognises a GIF data URL', () => {
    assert.equal(isGifSource('data:image/gif;base64,R0lGODlhAQABAAAAACw='), true);
  });

  it('leaves every other picture alone', () => {
    assert.equal(isGifSource('https://cdn.example.com/a.png'), false);
    assert.equal(isGifSource('https://cdn.example.com/a.gifv'), false);
    assert.equal(isGifSource('https://cdn.example.com/gif/portrait.webp'), false);
    assert.equal(isGifSource('data:image/webp;base64,AAAA'), false);
    assert.equal(isGifSource(undefined), false);
    assert.equal(isGifSource(''), false);
  });
});

describe('Holding GIFs still', () => {
  it('freezes a GIF only while the GIFs switch is off', () => {
    assert.equal(shouldHoldStill(false, 'https://x.test/a.gif'), true);
    assert.equal(shouldHoldStill(true, 'https://x.test/a.gif'), false);
    assert.equal(shouldHoldStill(false, 'https://x.test/a.png'), false);
  });

  it('renders a plain <img> for a GIF while GIFs are on (the default)', () => {
    const html = renderToStaticMarkup(React.createElement(MotionImg, { src: 'https://x.test/a.gif', alt: 'Dancer' }));
    assert.ok(html.includes('<img'), html);
    assert.ok(!html.includes('<canvas'), html);
  });
});

describe('The saved GIFs switch', () => {
  const saved = { effects: true, sounds: true, music: true, nsfw: false, chosenAt: 1 };

  it('keeps an explicit value', () => {
    assert.equal(parseSitePreferences({ ...saved, gifs: false })?.gifs, false);
    assert.equal(parseSitePreferences({ ...saved, gifs: true })?.gifs, true);
  });

  it('turns GIFs on for a choice saved before the switch existed', () => {
    assert.equal(parseSitePreferences(saved)?.gifs, true);
  });
});
