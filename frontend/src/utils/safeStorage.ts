// frontend/src/utils/safeStorage.ts
// One place for "localStorage that may not exist" (SSR, private mode, blocked
// site data). Every storage helper in the app goes through these.
export {
  getLocalStorage,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
} from '@/lib/storage';
