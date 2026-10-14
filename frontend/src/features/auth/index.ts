// frontend/src/features/auth/index.ts
export { AuthModal } from '@/components/AuthModal';
export { UserProfileClient } from '@/components/user/UserProfileClient';
export { useAuth, AuthProvider } from '@/context/AuthContext';
export type { UserProfile } from '@/context/AuthContext';
export { getAuthToken, authHeaders, authFetch, setSessionFlag } from '@/utils/api';
