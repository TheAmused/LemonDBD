// frontend/src/__tests__/unit/adminDragAndDropBackup.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { ScraperConfigModal } from '@/components/ScraperConfigModal';
import enDict from '@/locales/en';
import plDict from '@/locales/pl';
import esDict from '@/locales/es';
import deDict from '@/locales/de';
import jaDict from '@/locales/ja';

describe('Admin Database Backup: Drag and Drop Import Modal', () => {
  const modalSourcePath = path.resolve(__dirname, '../../components/ScraperConfigModal.tsx');
  const modalSource = fs.readFileSync(modalSourcePath, 'utf-8');

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
    const html = renderToStaticMarkup(
      React.createElement(ScraperConfigModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'import',
        dict: plDict as any,
      })
    );

    assert.ok(html.includes('role="button"'), 'Dropzone must have role="button"');
    assert.ok(html.includes('tabindex="0"'), 'Dropzone must have tabIndex=0 for keyboard accessibility');
    assert.ok(
      html.includes('Kliknij lub przeciągnij i upuść'),
      'Must render Polish localized click or drag prompt'
    );
    assert.ok(html.includes('.json'), 'Must highlight .json extension');
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
    }
  });
});
