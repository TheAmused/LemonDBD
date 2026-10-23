'use client';
// frontend/src/components/admin/AdminPanelClient.tsx
//
// The admin panel: header, section tabs and the open section. Every section loads its own data;
// this shell owns what crosses sections (the counts, the toast, the refresh and "show this user").

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ErrorPage } from '@/components/layout/ErrorPage';
import { TabPanel } from '@/components/common/Tabs';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminPanelSkeleton } from '@/components/admin/AdminPanelSkeleton';
import { AdminSectionTabs, ADMIN_TABS_ID } from '@/components/admin/AdminSectionTabs';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import { AdminToast } from '@/components/admin/AdminToast';
import { AdminUsersSection } from '@/components/admin/AdminUsersSection';
import { ADMIN_STORAGE } from '@/components/admin/adminStorage';
import {
  isAdminTab,
  isReportQueue,
  type AdminTab,
  type ReportQueue,
} from '@/components/admin/adminTabs';
import { useAdminOverview } from '@/components/admin/useAdminOverview';
import { useAdminUsers } from '@/components/admin/useAdminUsers';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { usePersistentString } from '@/hooks/usePersistentString';
import type { ActionMessage, UserRow } from '@/types/admin';

const lazySection = <P extends object>(load: () => Promise<React.ComponentType<P>>) =>
  dynamic(load, { ssr: false, loading: () => <AdminTabContentSkeleton /> });

const AdminReportsSection = lazySection(() => import('@/components/admin/AdminReportsSection').then((m) => m.AdminReportsSection));
const AdminAvailabilitySection = lazySection(() => import('@/components/admin/AdminAvailabilitySection').then((m) => m.AdminAvailabilitySection));
const AdminAuditSection = lazySection(() => import('@/components/admin/AdminAuditSection').then((m) => m.AdminAuditSection));
const AdminSettingsSection = lazySection(() => import('@/components/admin/AdminSettingsSection').then((m) => m.AdminSettingsSection));
const AdminToolsSection = lazySection(() => import('@/components/admin/AdminToolsSection').then((m) => m.AdminToolsSection));
const AdminModerationDrawer = dynamic(() => import('@/components/admin/AdminModerationDrawer').then((m) => m.AdminModerationDrawer), { ssr: false });
const AdminUserFormModal = dynamic(() => import('@/components/admin/AdminUserFormModal').then((m) => m.AdminUserFormModal), { ssr: false });

export function AdminPanelClient() {
  const dict = useDictionary();
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();
  const ready = isAuthenticated && isAdmin;

  const [tab, setTabNow] = usePersistentString<AdminTab>(ADMIN_STORAGE.tab, 'users', isAdminTab);
  // Unsaved Settings changes are lost when that tab unmounts: leaving it asks first.
  const [settingsDirty, setSettingsDirty] = useState(0);
  const [leavingTo, setLeavingTo] = useState<AdminTab | null>(null);
  const setTab = useCallback(
    (next: AdminTab) => {
      if (tab === 'settings' && next !== 'settings' && settingsDirty > 0) setLeavingTo(next);
      else setTabNow(next);
    },
    [tab, settingsDirty, setTabNow]
  );
  const [queue, setQueue] = usePersistentString<ReportQueue>(ADMIN_STORAGE.reportQueue, 'bugs', isReportQueue);
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userForm, setUserForm] = useState<UserRow | 'new' | null>(null);
  const [moderated, setModerated] = useState<UserRow | null>(null);

  const notify = useCallback((next: ActionMessage) => setMessage(next), []);
  const dismiss = useCallback(() => setMessage(null), []);
  const { overview, refresh: refreshOverview } = useAdminOverview(ready);
  const overviewChanged = useCallback(() => {
    void refreshOverview();
  }, [refreshOverview]);
  const directory = useAdminUsers({ enabled: ready && tab === 'users', refreshKey, notify, onChanged: overviewChanged });

  const refreshAll = () => {
    setRefreshKey((k) => k + 1);
    void refreshOverview();
  };

  /** From a report: open the user directory narrowed to one account. */
  const showUser = (query: string) => {
    directory.showOnly(query);
    setTab('users');
  };

  if (!dict || isLoading) return <AdminPanelSkeleton />;
  if (!ready) return <ErrorPage variant="forbidden" />;

  const pending = overview?.pending ?? null;

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex items-end gap-3">
          <AdminSectionTabs
            className="min-w-0 flex-1"
            activeTab={tab}
            onChange={setTab}
            reportsWaiting={!!pending && pending.bug_reports + pending.content_reports > 0}
            queue={queue}
            onQueueChange={setQueue}
            pending={pending}
          />
          <div className="shrink-0 pb-1.5">
            <AdminHeader onRefresh={refreshAll} />
          </div>
        </div>

        <TabPanel value={tab} activeValue={tab} idBase={ADMIN_TABS_ID}>
          {tab === 'users' && (
            <AdminUsersSection
              directory={directory}
              counts={overview?.users ?? null}
              currentUserId={user?.id}
              notify={notify}
              onCreate={() => setUserForm('new')}
              onEdit={setUserForm}
              onModerate={setModerated}
            />
          )}
          {tab === 'reports' && (
            <AdminReportsSection queue={queue} refreshKey={refreshKey} notify={notify} onChanged={overviewChanged} onShowUser={showUser} />
          )}
          {tab === 'availability' && <AdminAvailabilitySection refreshKey={refreshKey} notify={notify} />}
          {tab === 'audit' && <AdminAuditSection refreshKey={refreshKey} notify={notify} />}
          {tab === 'settings' && <AdminSettingsSection refreshKey={refreshKey} notify={notify} onDirtyChange={setSettingsDirty} />}
          {tab === 'tools' && <AdminToolsSection refreshKey={refreshKey} notify={notify} onDataChanged={refreshAll} />}
        </TabPanel>
      </div>

      <AdminUserFormModal
        target={userForm}
        currentUserId={user?.id}
        onClose={() => setUserForm(null)}
        onCreate={directory.create}
        onUpdate={directory.update}
      />
      <AdminModerationDrawer
        user={moderated}
        onClose={() => setModerated(null)}
        onChanged={() => {
          directory.reload();
          void refreshOverview();
        }}
        onActionMessage={(next) => next && notify(next)}
      />
      <ConfirmModal
        open={leavingTo !== null}
        title={dict.admin.unsavedSettingsTitle}
        message={dict.admin.unsavedSettingsMessage}
        confirmLabel={dict.admin.unsavedSettingsLeave}
        cancelLabel={dict.admin.unsavedSettingsStay}
        onConfirm={() => {
          if (leavingTo) setTabNow(leavingTo);
          setLeavingTo(null);
        }}
        onCancel={() => setLeavingTo(null)}
      />
      <AdminToast message={message} onDismiss={dismiss} />
    </>
  );
}
