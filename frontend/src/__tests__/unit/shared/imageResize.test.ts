// frontend/src/__tests__/unit/shared/imageResize.test.ts
import '../../helpers/dom';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import {
  IMAGE_SIZE_PRESETS,
  MAX_DATA_IMAGE_CHARS,
  encodeCanvasWithinBudget,
  resizeImageToDataUrl,
} from '@/utils/imageResize';
import { fileToTileImage } from '@/utils/tierLists/imageFiles';
import { ImageUploadDropzone, processImageFile } from '@/components/common/ImageUploadDropzone';
import { CandidateFormInputs, emptyDraftEntity } from '@/components/smash-or-pass/creator/EntityEditor';
import { CoverImageCropModal } from '@/components/smash-or-pass/creator/CoverImageCropModal';

const h = React.createElement;
const restorers: Array<() => void> = [];

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
});

interface MockCanvasCall {
  width: number;
  height: number;
  toDataUrlCalls: Array<{ mime: string; quality?: number }>;
}

function mockCanvasEnvironment(options: {
  bitmapWidth?: number;
  bitmapHeight?: number;
  toDataURL: (mime: string, quality: number | undefined, width: number, height: number) => string;
  disableCreateImageBitmap?: boolean;
}) {
  const canvasCalls: MockCanvasCall[] = [];
  const origCreateElement = document.createElement.bind(document);
  const origCreateImageBitmap = globalThis.createImageBitmap;

  const createMockCanvas = () => {
    const call: MockCanvasCall = { width: 0, height: 0, toDataUrlCalls: [] };
    canvasCalls.push(call);
    const canvas = {
      get width() {
        return call.width;
      },
      set width(v: number) {
        call.width = v;
      },
      get height() {
        return call.height;
      },
      set height(v: number) {
        call.height = v;
      },
      getContext: () => ({
        imageSmoothingQuality: 'high',
        fillStyle: '',
        fillRect: () => {},
        drawImage: () => {},
      }),
      toDataURL: (mime: string = 'image/png', quality?: number) => {
        call.toDataUrlCalls.push({ mime, quality });
        return options.toDataURL(mime, quality, call.width, call.height);
      },
    };
    return canvas as unknown as HTMLCanvasElement;
  };

  document.createElement = ((tagName: string, ...rest: unknown[]) => {
    if (tagName.toLowerCase() === 'canvas') {
      return createMockCanvas();
    }
    return (origCreateElement as (tag: string, ...args: unknown[]) => HTMLElement)(tagName, ...rest);
  }) as typeof document.createElement;

  restorers.push(() => {
    document.createElement = origCreateElement;
  });

  if (options.disableCreateImageBitmap) {
    (globalThis as Record<string, unknown>).createImageBitmap = undefined;
  } else if (options.bitmapWidth !== undefined && options.bitmapHeight !== undefined) {
    const w = options.bitmapWidth;
    const h = options.bitmapHeight;
    globalThis.createImageBitmap = (async () => ({
      width: w,
      height: h,
      close: () => {},
    })) as unknown as typeof createImageBitmap;
  }

  restorers.push(() => {
    globalThis.createImageBitmap = origCreateImageBitmap;
  });

  return { canvasCalls };
}

describe('imageResize: presets & constants', () => {
  it('exports exact IMAGE_SIZE_PRESETS and MAX_DATA_IMAGE_CHARS', () => {
    assert.deepEqual(IMAGE_SIZE_PRESETS, {
      tile: [160, 128, 96],
      portrait: [512, 384, 256],
      banner: [800, 600, 400],
    });
    assert.equal(MAX_DATA_IMAGE_CHARS, 131_072);
  });
});

describe('imageResize: validation and GIF pass-through', () => {
  it('returns null for non-image files', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    assert.equal(await resizeImageToDataUrl(file, IMAGE_SIZE_PRESETS.tile), null);
  });

  it('returns null for SVG files by MIME or .svg filename with empty MIME', async () => {
    const svgMime = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });
    const svgEmptyMime = new File(['<svg/>'], 'icon.svg', { type: '' });
    assert.equal(await resizeImageToDataUrl(svgMime, IMAGE_SIZE_PRESETS.tile), null);
    assert.equal(await resizeImageToDataUrl(svgEmptyMime, IMAGE_SIZE_PRESETS.tile), null);
  });

  it('passes animated GIFs cleanly when under maxChars and rejects oversized GIFs', async () => {
    const smallGif = new File(['GIF89a...'], 'anim.gif', { type: 'image/gif' });
    const ok = await resizeImageToDataUrl(smallGif, IMAGE_SIZE_PRESETS.portrait, MAX_DATA_IMAGE_CHARS);
    assert.ok(ok !== null && ok.startsWith('data:image/gif;base64,'));
    assert.ok(ok.length <= MAX_DATA_IMAGE_CHARS);

    const bigGif = new File([new Uint8Array(MAX_DATA_IMAGE_CHARS + 50)], 'huge.gif', { type: 'image/gif' });
    assert.equal(await resizeImageToDataUrl(bigGif, IMAGE_SIZE_PRESETS.portrait, MAX_DATA_IMAGE_CHARS), null);
  });
});

describe('imageResize: raster downscaling and encodeCanvasWithinBudget', () => {
  it('downscales large raster image preserving aspect ratio and avoids upscaling small images', async () => {
    const { canvasCalls } = mockCanvasEnvironment({
      bitmapWidth: 1600,
      bitmapHeight: 1200,
      toDataURL: (mime) => (mime === 'image/webp' ? 'data:image/webp;base64,OK' : 'data:image/png;base64,PNG'),
    });

    const large = new File(['pngbytes'], 'photo.png', { type: 'image/png' });
    const result = await resizeImageToDataUrl(large, IMAGE_SIZE_PRESETS.banner);
    assert.equal(result, 'data:image/webp;base64,OK');
    assert.equal(canvasCalls[0].width, 800);
    assert.equal(canvasCalls[0].height, 600);

    const smallMock = mockCanvasEnvironment({
      bitmapWidth: 120,
      bitmapHeight: 80,
      toDataURL: () => 'data:image/webp;base64,SMALL',
    });
    const small = new File(['pngbytes'], 'small.png', { type: 'image/png' });
    const smallResult = await resizeImageToDataUrl(small, IMAGE_SIZE_PRESETS.portrait);
    assert.equal(smallResult, 'data:image/webp;base64,SMALL');
    assert.equal(smallMock.canvasCalls[0].width, 120);
    assert.equal(smallMock.canvasCalls[0].height, 80);
  });

  it('steps through size tiers and quality steps to honor maxChars', async () => {
    const { canvasCalls } = mockCanvasEnvironment({
      bitmapWidth: 1600,
      bitmapHeight: 900,
      toDataURL: (mime, quality, width) => {
        if (mime === 'image/webp' && width >= 600) {
          return `data:image/webp;base64,${'A'.repeat(200)}`;
        }
        if (mime === 'image/webp' && width === 400 && (quality ?? 1) > 0.65) {
          return `data:image/webp;base64,${'B'.repeat(150)}`;
        }
        return 'data:image/webp;base64,FITS';
      },
    });

    const file = new File(['jpg'], 'wide.jpg', { type: 'image/jpeg' });
    const result = await resizeImageToDataUrl(file, IMAGE_SIZE_PRESETS.banner, 100, 0.86);
    assert.equal(result, 'data:image/webp;base64,FITS');
    assert.deepEqual(
      canvasCalls.map((c) => c.width),
      [800, 600, 400],
    );
    assert.deepEqual(
      canvasCalls[2].toDataUrlCalls.map((c) => c.quality),
      [0.86, 0.72, 0.6],
    );
  });

  it('falls back to JPEG/PNG when WebP is unsupported and returns null when budget cannot be met', async () => {
    const { canvasCalls } = mockCanvasEnvironment({
      bitmapWidth: 1000,
      bitmapHeight: 1000,
      toDataURL: (mime) => {
        // Simulate headless canvas returning PNG for image/webp
        if (mime === 'image/webp') return `data:image/png;base64,${'P'.repeat(200)}`;
        if (mime === 'image/png') return `data:image/png;base64,${'P'.repeat(200)}`;
        return 'data:image/jpeg;base64,JPGOK';
      },
    });

    const file = new File(['jpg'], 'square.jpg', { type: 'image/jpeg' });
    const result = await resizeImageToDataUrl(file, IMAGE_SIZE_PRESETS.portrait, 100);
    assert.equal(result, 'data:image/jpeg;base64,JPGOK');
    assert.equal(canvasCalls[0].width, 512);

    const mockCanvas = {
      toDataURL: () => `data:image/webp;base64,${'X'.repeat(500)}`,
    } as unknown as HTMLCanvasElement;
    assert.equal(encodeCanvasWithinBudget(mockCanvas, 100), null);
  });

  it('falls back to Image + URL.createObjectURL and revokes object URL when createImageBitmap is unavailable', async () => {
    let revokedUrl = '';
    const origImage = globalThis.Image;
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;

    mockCanvasEnvironment({
      disableCreateImageBitmap: true,
      toDataURL: () => 'data:image/webp;base64,IMG_FALLBACK',
    });

    URL.createObjectURL = () => 'blob:mock-image-1';
    URL.revokeObjectURL = (url: string) => {
      revokedUrl = url;
    };
    globalThis.Image = class MockImage {
      naturalWidth = 600;
      naturalHeight = 300;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    } as unknown as typeof Image;

    restorers.push(() => {
      globalThis.Image = origImage;
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
    });

    const file = new File(['png'], 'fallback.png', { type: 'image/png' });
    const result = await resizeImageToDataUrl(file, IMAGE_SIZE_PRESETS.portrait);
    assert.equal(result, 'data:image/webp;base64,IMG_FALLBACK');
    assert.equal(revokedUrl, 'blob:mock-image-1');
  });
});

describe('imageResize: tier list & dropzone delegation', () => {
  it('fileToTileImage uses tile preset [160, 128, 96]', async () => {
    const { canvasCalls } = mockCanvasEnvironment({
      bitmapWidth: 1000,
      bitmapHeight: 500,
      toDataURL: () => 'data:image/webp;base64,TILE',
    });

    const file = new File(['png'], 'perk.png', { type: 'image/png' });
    const result = await fileToTileImage(file);
    assert.equal(result, 'data:image/webp;base64,TILE');
    assert.equal(canvasCalls[0].width, 160);
    assert.equal(canvasCalls[0].height, 80);
  });

  it('processImageFile defaults to banner preset [800, 600, 400] and supports custom maxDim', async () => {
    const defaultMock = mockCanvasEnvironment({
      bitmapWidth: 1600,
      bitmapHeight: 800,
      toDataURL: () => 'data:image/webp;base64,BANNER',
    });
    const file = new File(['png'], 'banner.png', { type: 'image/png' });
    assert.equal(await processImageFile(file), 'data:image/webp;base64,BANNER');
    assert.equal(defaultMock.canvasCalls[0].width, 800);
    assert.equal(defaultMock.canvasCalls[0].height, 400);

    const customMock = mockCanvasEnvironment({
      bitmapWidth: 1500,
      bitmapHeight: 1500,
      toDataURL: () => 'data:image/webp;base64,CUSTOM',
    });
    assert.equal(await processImageFile(file, 1000), 'data:image/webp;base64,CUSTOM');
    assert.equal(customMock.canvasCalls[0].width, 1000);
    assert.equal(customMock.canvasCalls[0].height, 1000);
  });

  it('ImageUploadDropzone shows inline error when uploaded file is rejected', async () => {
    const changes: string[] = [];
    const view = render(
      h(ImageUploadDropzone, {
        onChange: (v: string) => changes.push(v),
      }),
      { wrapper: withDictionary() },
    );

    const fileInput = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    const svgFile = new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' });
    fireEvent.change(fileInput, { target: { files: [svgFile] } });

    await waitFor(() => {
      assert.ok(view.getByRole('alert'));
    });
    assert.equal(changes.length, 0);
  });
});

describe('EntityEditor & CoverImageCropModal integration', () => {
  it('EntityEditor downscales uploaded portraits via portrait preset (512px) and shows inline error on invalid file', async () => {
    const { canvasCalls } = mockCanvasEnvironment({
      bitmapWidth: 1024,
      bitmapHeight: 1536,
      toDataURL: () => 'data:image/webp;base64,PORTRAIT512',
    });

    const patches: Array<Partial<ReturnType<typeof emptyDraftEntity>>> = [];
    const view = render(
      h(CandidateFormInputs, {
        entity: emptyDraftEntity('k1'),
        index: 0,
        onChange: (patch) => patches.push(patch),
        onRemove: () => {},
        showTranslations: false,
        translations: {},
        onTranslationChange: () => {},
        locale: 'en',
      }),
      { wrapper: withDictionary() },
    );

    const fileInput = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    assert.ok(fileInput, 'EntityEditor renders a file input for portrait upload');
    assert.equal(fileInput.getAttribute('accept'), 'image/png,image/jpeg,image/webp,image/gif');
    assert.ok(view.getByText(enDict.smashOrPass.cropModal.uploadFile));

    const validFile = new File(['png'], 'portrait.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      assert.equal(patches.length, 1);
    });
    assert.equal(patches[0].media_url, 'data:image/webp;base64,PORTRAIT512');
    assert.equal(canvasCalls[0].width, 341);
    assert.equal(canvasCalls[0].height, 512);

    const invalidSvg = new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' });
    fireEvent.change(fileInput, { target: { files: [invalidSvg] } });

    await waitFor(() => {
      assert.ok(view.getByRole('alert'));
    });
    assert.equal(patches.length, 1);
  });

  it('CoverImageCropModal exports 800x450 WebP and falls back to JPEG when WebP header fails', async () => {
    const webpMock = mockCanvasEnvironment({
      toDataURL: (mime) =>
        mime === 'image/webp' ? 'data:image/webp;base64,CROPPED_WEBP' : 'data:image/jpeg;base64,CROPPED_JPG',
    });

    const applied: string[] = [];
    const origImage = globalThis.Image;
    globalThis.Image = class MockExportImage {
      complete = true;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
    } as unknown as typeof Image;
    restorers.push(() => {
      globalThis.Image = origImage;
    });

    const view = render(
      h(CoverImageCropModal, {
        isOpen: true,
        onClose: () => {},
        imageUrl: 'data:image/png;base64,SRC',
        onApplyCrop: (url) => applied.push(url),
      }),
      { wrapper: withDictionary() },
    );

    const previewImg = view.getByAltText(enDict.smashOrPass.cropModal.previewAlt);
    Object.defineProperty(previewImg, 'naturalWidth', { value: 1600, configurable: true });
    Object.defineProperty(previewImg, 'naturalHeight', { value: 900, configurable: true });
    fireEvent.load(previewImg);

    fireEvent.click(view.getByText(enDict.smashOrPass.cropModal.applyCrop));

    await waitFor(() => {
      assert.equal(applied.length, 1);
    });
    assert.equal(applied[0], 'data:image/webp;base64,CROPPED_WEBP');
    assert.equal(webpMock.canvasCalls[0].width, 800);
    assert.equal(webpMock.canvasCalls[0].height, 450);

    view.unmount();

    const jpegFallbackMock = mockCanvasEnvironment({
      toDataURL: (mime) =>
        mime === 'image/webp' ? 'data:image/png;base64,NO_WEBP' : 'data:image/jpeg;base64,CROPPED_JPG',
    });

    const view2 = render(
      h(CoverImageCropModal, {
        isOpen: true,
        onClose: () => {},
        imageUrl: 'data:image/png;base64,SRC',
        onApplyCrop: (url) => applied.push(url),
      }),
      { wrapper: withDictionary() },
    );
    const previewImg2 = view2.getByAltText(enDict.smashOrPass.cropModal.previewAlt);
    Object.defineProperty(previewImg2, 'naturalWidth', { value: 1600, configurable: true });
    Object.defineProperty(previewImg2, 'naturalHeight', { value: 900, configurable: true });
    fireEvent.load(previewImg2);
    fireEvent.click(view2.getByText(enDict.smashOrPass.cropModal.applyCrop));

    await waitFor(() => {
      assert.equal(applied.length, 2);
    });
    assert.equal(applied[1], 'data:image/jpeg;base64,CROPPED_JPG');
    assert.equal(jpegFallbackMock.canvasCalls[0].width, 800);
    assert.equal(jpegFallbackMock.canvasCalls[0].height, 450);
  });
});
