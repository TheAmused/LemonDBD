// frontend/src/__tests__/unit/adminDragAndDropBackup.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFeatureSource } from '../helpers/readFeatureSource';
import enDict from '@/locales/en';
import plDict from '@/locales/pl';
import esDict from '@/locales/es';
import deDict from '@/locales/de';
import jaDict from '@/locales/ja';

describe('Admin Database Backup: Drag and Drop Import Modal', () => {
  // The modal is a composition root; the dropzone, hooks and targets live in components/scraper-config/.
  const componentsDir = path.resolve(__dirname, '../../components');
  const featureDir = path.join(componentsDir, 'scraper-config');
  const modalSource = readFeatureSource(path.join(componentsDir, 'ScraperConfigModal.tsx'), featureDir);

  it('ScraperConfigModal source code attaches all drag and drop event listeners to the dropzone', () => {
    assert.ok(modalSource.includes('onDragEnter={handleDragEnter}'), 'Dropzone must implement onDragEnter');
    assert.ok(modalSource.includes('onDragOver={handleDragOver}'), 'Dropzone must implement onDragOver');
    assert.ok(modalSource.includes('onDragLeave={handleDragLeave}'), 'Dropzone must implement onDragLeave');
    assert.ok(modalSource.includes('onDrop={handleDrop}'), 'Dropzone must implement onDrop');
  });

  it('handleDragOver sets dropEffect to copy and calls preventDefault to prevent browser opening the file', () => {
    assert.ok(
      modalSource.includes("e.dataTransfer.dropEffect = 'copy'"),
      'handleDragOver must set dropEffect to copy'
    );
    assert.ok(
      modalSource.includes('e.preventDefault();') && modalSource.includes('e.stopPropagation();'),
      'Drag handlers must call preventDefault and stopPropagation'
    );
  });

  it('outer modal dialog suppresses unhandled dragover and drop events', () => {
    assert.ok(
      modalSource.includes('onDragOver={(e) => e.preventDefault()}'),
      'Dialog wrapper must prevent default dragover'
    );
    assert.ok(
      modalSource.includes('onDrop={(e) => e.preventDefault()}'),
      'Dialog wrapper must prevent default drop'
    );
  });

  it('renders the import dropzone with accessible role, tabIndex, and keyboard handler', () => {
    // The shared <Modal> portals on the client, so the dropzone is verified at source level.
    assert.ok(modalSource.includes('role="button"'), 'Dropzone must have role="button"');
    assert.ok(modalSource.includes('tabIndex={0}'), 'Dropzone must have tabIndex=0 for keyboard accessibility');
    assert.ok(modalSource.includes('onKeyDown'), 'Dropzone must handle keyboard activation');
    assert.ok(
      modalSource.includes('dict.admin.dropFilePrompt'),
      'Dropzone must render the localized drop prompt'
    );
    assert.ok(
      (plDict as any).admin.clickOrDragBackup.includes('Kliknij lub przeciągnij i upuść'),
      'Must define Polish localized click or drag prompt'
    );
    assert.ok(modalSource.includes('.json'), 'Must highlight .json extension');
  });

  it('validates that files must be JSON before attempting to import', () => {
    assert.ok(
      modalSource.includes("file.name.toLowerCase().endsWith('.json')"),
      'Must check .json extension'
    );
    assert.ok(
      modalSource.includes("file.type === 'application/json'"),
      'Must check application/json MIME type'
    );
  });

  it('provides a clear/remove file button when a file is staged', () => {
    assert.ok(
      modalSource.includes('handleClearFile'),
      'Must provide a function to clear the staged file'
    );
    assert.ok(
      modalSource.includes('setImportFile(null)') && modalSource.includes("setImportJsonText('')"),
      'Clearing file must reset both file and text state'
    );
  });

  it('all supported locales define dropFilePrompt, invalidJsonFile, removeFile, and changeFile', () => {
    const locales = [
      { name: 'en', dict: enDict },
      { name: 'pl', dict: plDict },
      { name: 'es', dict: esDict },
      { name: 'de', dict: deDict },
      { name: 'ja', dict: jaDict },
    ];

    for (const { name, dict } of locales) {
      const admin = (dict as any).admin;
      assert.ok(admin.dropFilePrompt && typeof admin.dropFilePrompt === 'string', `${name} missing dropFilePrompt`);
      assert.ok(admin.invalidJsonFile && typeof admin.invalidJsonFile === 'string', `${name} missing invalidJsonFile`);
      assert.ok(admin.removeFile && typeof admin.removeFile === 'string', `${name} missing removeFile`);
      assert.ok(admin.changeFile && typeof admin.changeFile === 'string', `${name} missing changeFile`);
      assert.ok(admin.groupContent && typeof admin.groupContent === 'string', `${name} missing groupContent`);
      assert.ok(admin.groupUsers && typeof admin.groupUsers === 'string', `${name} missing groupUsers`);
      assert.ok(admin.groupCommunity && typeof admin.groupCommunity === 'string', `${name} missing groupCommunity`);
      assert.ok(admin.groupSettings && typeof admin.groupSettings === 'string', `${name} missing groupSettings`);
    }
  });

  it('export/purge targets are organized under localized group headers', () => {
    // The shared <Modal> portals on the client, so group headers are verified via source + locale data.
    assert.ok(modalSource.includes("labelKey: 'groupContent'"), 'Must group targets by content/users/community/settings');
    assert.ok(modalSource.includes('fallbackLabel'), 'Groups must have fallback labels');
    const pl = (plDict as any).admin;
    assert.equal(pl.groupContent, 'Zawartość gry');
    assert.equal(pl.groupUsers, 'Użytkownicy i konta');
    assert.equal(pl.groupCommunity, 'Społeczność i serie');
    assert.equal(pl.groupSettings, 'Konfiguracja i system');
    const en = (enDict as any).admin;
    assert.equal(en.groupContent, 'Game Content');
    assert.equal(en.groupUsers, 'Users & Accounts');
    assert.equal(en.groupCommunity, 'Community & Streaks');
    assert.equal(en.groupSettings, 'Configuration & System');
  });
});
