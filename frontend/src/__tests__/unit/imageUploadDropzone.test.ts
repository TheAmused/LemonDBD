// frontend/src/__tests__/unit/imageUploadDropzone.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  ImageUploadDropzone,
  processImageFile,
  type ImageUploadDropzoneProps,
} from '@/components/common/ImageUploadDropzone';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';

const h = React.createElement;

describe('ImageUploadDropzone: Props & Rendering (Empty / Dropzone mode)', () => {
  it('renders label and hint when provided', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
        label: 'Upload Cover Image',
        hint: 'Drop a banner or paste a URL',
      })
    );
    assert.ok(html.includes('Upload Cover Image'));
    assert.ok(html.includes('Drop a banner or paste a URL'));
  });

  it('renders browse files button with upload icon and hidden file input', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
      })
    );
    // Hidden file input with accept="image/*"
    assert.match(html, /<input[^>]+type="file"[^>]+accept="image\/\*"/);
    // Secondary size=sm button for browsing
    assert.match(html, /<button[^>]+class="[^"]*border border-border-color bg-bg-surface[^"]*"/);
  });

  it('renders accessible text input with fieldSize="sm" for URL pasting', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
      })
    );
    // Field size "sm" class on input
    assert.match(html, /<input[^>]+type="url"[^>]+placeholder="https:\/\/\.\.\."/);
  });

  it('renders custom placeholder and browseLabel when provided', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
        placeholder: 'https://custom-placeholder.com',
        browseLabel: 'Select file',
      })
    );
    assert.ok(html.includes('placeholder="https://custom-placeholder.com"'));
    assert.ok(html.includes('Select file'));
  });

  it('renders invalid message and error styling when invalid=true', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
        invalid: true,
        invalidMessage: 'Invalid image URL provided',
      })
    );
    assert.ok(html.includes('Invalid image URL provided'));
    assert.ok(html.includes('text-accent-red'));
  });

  it('handles disabled state properly', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
        disabled: true,
      })
    );
    assert.match(html, /disabled/);
    assert.ok(html.includes('opacity-50') || html.includes('cursor-not-allowed'));
  });

  it('applies custom className', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
        className: 'custom-dropzone-test-class',
      })
    );
    assert.ok(html.includes('custom-dropzone-test-class'));
  });
});

describe('ImageUploadDropzone: Preview and Remove mode (when value is present)', () => {
  it('renders preview container with tokens and overlay remove button', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        value: 'https://example.com/banner.png',
        onChange: () => {},
        label: 'Cover Image',
      })
    );

    // Required container tokens: rounded-card overflow-hidden border border-border-color bg-bg-elevated
    assert.ok(html.includes('rounded-card'));
    assert.ok(html.includes('overflow-hidden'));
    assert.ok(html.includes('border border-border-color'));
    assert.ok(html.includes('bg-bg-elevated'));

    // Image tag with src
    assert.match(html, /<img[^>]+src="https:\/\/example\.com\/banner\.png"/);

    // Overlay remove button with aria-label
    assert.match(html, /<button[^>]+aria-label="Remove image"[^>]*>/);
  });

  it('supports aspectRatio="banner" and aspectRatio="square"', () => {
    const bannerHtml = renderWithDictionary(
      h(ImageUploadDropzone, {
        value: 'https://example.com/banner.png',
        aspectRatio: 'banner',
        onChange: () => {},
      })
    );
    assert.ok(bannerHtml.includes('aspect-video') || bannerHtml.includes('aspect-21/9') || bannerHtml.includes('max-w-md'));

    const squareHtml = renderWithDictionary(
      h(ImageUploadDropzone, {
        value: 'https://example.com/avatar.png',
        aspectRatio: 'square',
        onChange: () => {},
      })
    );
    assert.ok(squareHtml.includes('aspect-square'));
  });

  it('renders actions alongside or within preview when provided', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        value: 'https://example.com/banner.png',
        onChange: () => {},
        actions: h('span', { 'data-testid': 'custom-action' }, 'Crop Action'),
      })
    );
    assert.ok(html.includes('data-testid="custom-action"'));
    assert.ok(html.includes('Crop Action'));
  });

  it('renders previewActions in preview mode and emptyActions in empty mode', () => {
    const emptyHtml = renderWithDictionary(
      h(ImageUploadDropzone, {
        onChange: () => {},
        emptyActions: h('span', { 'data-testid': 'empty-action' }, 'Empty Action'),
        previewActions: h('span', { 'data-testid': 'preview-action' }, 'Preview Action'),
      })
    );
    assert.ok(emptyHtml.includes('data-testid="empty-action"'));
    assert.ok(!emptyHtml.includes('data-testid="preview-action"'));

    const previewHtml = renderWithDictionary(
      h(ImageUploadDropzone, {
        value: 'https://example.com/banner.png',
        onChange: () => {},
        emptyActions: h('span', { 'data-testid': 'empty-action' }, 'Empty Action'),
        previewActions: h('span', { 'data-testid': 'preview-action' }, 'Preview Action'),
      })
    );
    assert.ok(previewHtml.includes('data-testid="preview-action"'));
    assert.ok(!previewHtml.includes('data-testid="empty-action"'));
  });

  it('renders keyboard accessibility attributes when onPreviewClick is provided', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, {
        value: 'https://example.com/banner.png',
        onChange: () => {},
        onPreviewClick: () => {},
      })
    );
    assert.ok(html.includes('role="button"'));
    assert.ok(html.includes('tabindex="0"'));
    assert.ok(html.includes('cursor-pointer'));
  });
});

describe('ImageUploadDropzone: Style compliance and design tokens', () => {
  it('does not use legacy tailwind radiuses (rounded-xl, rounded-lg, etc.)', () => {
    const emptyHtml = renderWithDictionary(
      h(ImageUploadDropzone, { onChange: () => {} })
    );
    const previewHtml = renderWithDictionary(
      h(ImageUploadDropzone, { value: 'https://example.com/banner.png', onChange: () => {} })
    );

    for (const html of [emptyHtml, previewHtml]) {
      assert.ok(!html.includes('rounded-xl'), 'should not contain rounded-xl');
      assert.ok(!html.includes('rounded-2xl'), 'should not contain rounded-2xl');
      assert.ok(!html.includes('rounded-lg'), 'should not contain rounded-lg');
      assert.ok(!html.includes('rounded-md'), 'should not contain rounded-md');
    }
  });

  it('uses standard border, background and text tokens', () => {
    const html = renderWithDictionary(
      h(ImageUploadDropzone, { onChange: () => {} })
    );
    assert.ok(html.includes('border-border-color') || html.includes('border-accent-red'));
  });
});

describe('ImageUploadDropzone: processImageFile helper', () => {
  it('returns null for non-image files', async () => {
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await processImageFile(textFile);
    assert.equal(result, null);
  });

  it('returns null for SVG files', async () => {
    const svgFile = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });
    const result = await processImageFile(svgFile);
    assert.equal(result, null);
  });

  it('preserves GIF file when within maxDataImageChars limit', async () => {
    const gifData = 'GIF89a...small_data';
    const gifFile = new File([gifData], 'anim.gif', { type: 'image/gif' });
    const result = await processImageFile(gifFile);
    assert.ok(result !== null);
    assert.ok(result.startsWith('data:image/gif;base64,'));
    assert.ok(result.length <= TIER_LIST_LIMITS.maxDataImageChars);
  });

  it('returns null for oversized GIF file', async () => {
    // Exceed maxDataImageChars
    const largeBuffer = new Uint8Array(TIER_LIST_LIMITS.maxDataImageChars + 100);
    const largeGif = new File([largeBuffer], 'huge.gif', { type: 'image/gif' });
    const result = await processImageFile(largeGif);
    assert.equal(result, null);
  });
});
