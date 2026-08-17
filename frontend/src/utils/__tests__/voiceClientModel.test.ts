import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  isWebSpeechSupported,
  detectBrowser,
  getBrowserCompatibility,
  subscribeModelProgress,
  getModelProgress,
  transcribeClientAudio,
  initClientSpeechModel,
  AudioCaptureSession,
} from '../../services/clientSpeechModel';
import { VoiceEngineInfoModal } from '../../components/maps/VoiceEngineInfoModal';
import { VoiceCommandBanner } from '../../components/maps/VoiceCommandBanner';
import enDict from '../../locales/en.json';
import esDict from '../../locales/es.json';
import plDict from '../../locales/pl.json';

test('Browser compatibility and engine recommendation logic', () => {
  // In Node test environment, window/SpeechRecognition is undefined
  assert.strictEqual(isWebSpeechSupported(), false);

  const compat = getBrowserCompatibility();
  assert.ok(compat);
  assert.strictEqual(typeof compat.browserName, 'string');
  assert.strictEqual(typeof compat.hasNativeWebSpeech, 'boolean');
  assert.strictEqual(compat.hasNativeWebSpeech, false);
  // When native Web Speech is absent, recommended engine is client-model
  assert.strictEqual(compat.recommendedEngine, 'client-model');
});

test('Model progress subscription and status reporting', () => {
  let latestInfo: any = null;
  const unsubscribe = subscribeModelProgress((info) => {
    latestInfo = info;
  });

  assert.ok(latestInfo);
  assert.strictEqual(typeof latestInfo.progress, 'number');
  assert.ok(['unloaded', 'downloading', 'ready', 'error'].includes(latestInfo.status));

  const current = getModelProgress();
  assert.strictEqual(current.progress, latestInfo.progress);

  unsubscribe();
});

test('AudioCaptureSession class interface and contract', () => {
  const session = new AudioCaptureSession();
  assert.strictEqual(typeof session.start, 'function');
  assert.strictEqual(typeof session.stop, 'function');
  assert.strictEqual(typeof session.setLevelCallback, 'function');

  // Test setting level callback
  session.setLevelCallback((lvl) => {
    assert.strictEqual(typeof lvl, 'number');
  });

  // Calling stop when not recording returns an empty Float32Array safely
  const result = session.stop();
  assert.ok(result instanceof Float32Array);
  assert.strictEqual(result.length, 0);
});

test('resampleTo16k downsamples 48kHz audio buffer to 16kHz Float32Array', () => {
  const { resampleTo16k, normalizeAudioVolume } = require('../../services/clientSpeechModel');
  
  // 48000 samples = 1 second at 48kHz
  const sample48k = new Float32Array(48000);
  for (let i = 0; i < 48000; i++) {
    sample48k[i] = Math.sin(2 * Math.PI * 440 * (i / 48000));
  }

  const resampled = resampleTo16k(sample48k, 48000, 16000);
  assert.strictEqual(resampled.length, 16000);

  // Test volume normalization
  const normalized = normalizeAudioVolume(resampled);
  assert.strictEqual(normalized.length, 16000);
});

test('transcribeClientAudio handles empty and short audio buffers safely', async () => {
  const emptyBuffer = new Float32Array(0);
  const emptyResult = await transcribeClientAudio(emptyBuffer, 'en');
  assert.strictEqual(emptyResult, '');

  const shortBuffer = new Float32Array(500); // <1600 samples
  const shortResult = await transcribeClientAudio(shortBuffer, 'en');
  assert.strictEqual(shortResult, '');
});

test('VoiceEngineInfoModal renders dual-engine explanation and compatibility details', () => {
  const mockProgress = {
    status: 'downloading' as const,
    progress: 45,
  };

  const html = renderToStaticMarkup(
    React.createElement(VoiceEngineInfoModal, {
      isOpen: true,
      onClose: () => {},
      currentEngine: 'client-model',
      onSelectEngine: () => {},
      browserName: 'Mozilla Firefox',
      hasNativeWebSpeech: false,
      modelProgress: mockProgress,
      onPreloadModel: () => {},
      dict: enDict,
    })
  );

  // Assert modal renders title and explanations
  assert.ok(html.includes('Voice Recognition Engine &amp; Compatibility') || html.includes('Voice Recognition Engine'));
  assert.ok(html.includes('Mozilla Firefox'));
  assert.ok(html.includes('Web Speech Framework'));
  assert.ok(html.includes('Client-Side AI Model') || html.includes('Client-Side'));
  assert.ok(html.includes('Why is a Client-Side Fallback Needed?'));
  assert.ok(html.includes('45%'));
  assert.ok(html.includes('CacheStorage'));
});

test('VoiceEngineInfoModal handles native Web Speech engine active state', () => {
  const mockProgress = {
    status: 'ready' as const,
    progress: 100,
  };

  const html = renderToStaticMarkup(
    React.createElement(VoiceEngineInfoModal, {
      isOpen: true,
      onClose: () => {},
      currentEngine: 'web-speech',
      onSelectEngine: () => {},
      browserName: 'Google Chrome',
      hasNativeWebSpeech: true,
      modelProgress: mockProgress,
      onPreloadModel: () => {},
      dict: enDict,
    })
  );

  assert.ok(html.includes('Google Chrome'));
  assert.ok(html.includes('Google / Web Speech API'));
  assert.ok(html.includes('0MB download overhead'));
});

test('VoiceCommandBanner renders active engine badge and fallback trigger', () => {
  const html = renderToStaticMarkup(
    React.createElement(VoiceCommandBanner, {
      locale: 'en',
      currentSource: 'hens333',
      onSourceChange: () => {},
      onSelectMap: () => {},
      onAction: () => {},
      availableMaps: [],
      dict: enDict,
    })
  );

  // Banner should render engine indicator pill
  assert.ok(
    html.includes('Local AI Model') ||
    html.includes('Web Speech API') ||
    html.includes('Voice Recognition Engine')
  );
  assert.ok(html.includes('Hens333 (12-Clock)'));
  assert.ok(html.includes('SamoelColt (Isometric)'));
});

test('Multilingual translations dictionary coverage for voice recognition fallback', () => {
  const dictionaries = [
    { lang: 'en', dict: enDict },
    { lang: 'es', dict: esDict },
    { lang: 'pl', dict: plDict },
  ];

  for (const { lang, dict } of dictionaries) {
    assert.ok(dict.voice, `Missing voice section in ${lang}.json`);
    assert.ok(dict.voice.engine, `Missing voice.engine in ${lang}.json`);
    assert.ok(dict.voice.engineNative, `Missing voice.engineNative in ${lang}.json`);
    assert.ok(dict.voice.engineClient, `Missing voice.engineClient in ${lang}.json`);
    assert.ok(dict.voice.howItWorksTitle, `Missing voice.howItWorksTitle in ${lang}.json`);
    assert.ok(dict.voice.howItWorksNative, `Missing voice.howItWorksNative in ${lang}.json`);
    assert.ok(dict.voice.howItWorksClient, `Missing voice.howItWorksClient in ${lang}.json`);
    assert.ok(dict.voice.whyNeededTitle, `Missing voice.whyNeededTitle in ${lang}.json`);
    assert.ok(dict.voice.whyNeededText, `Missing voice.whyNeededText in ${lang}.json`);
    assert.ok(dict.voice.statusDownloading, `Missing voice.statusDownloading in ${lang}.json`);
    assert.ok(dict.voice.statusReady, `Missing voice.statusReady in ${lang}.json`);
  }
});
