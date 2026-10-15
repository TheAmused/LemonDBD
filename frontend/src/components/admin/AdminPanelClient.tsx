'use client';
// frontend/src/components/admin/AdminPanelClient.tsx

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { usePersistentString } from '@/hooks/usePersistentString';
import { ErrorPage } from '@/components/layout/ErrorPage';
import { useAuth } from '@/context/AuthContext';
import { PageShell } from '@/components/layout/PageShell';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { AdminPanelSkeleton } from '@/components/admin/AdminPanelSkeleton';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import { AdminActionAlert } from '@/components/admin/AdminActionAlert';
import { AdminSectionTabs } from '@/components/admin/AdminSectionTabs';
import { ADMIN_TAB_STORAGE_KEY, isAdminTab, type AdminTab } from '@/components/admin/adminTabs';
import { useAdminBugReports } from '@/components/admin/useAdminBugReports';
import { useAdminContentReports } from '@/components/admin/useAdminContentReports';
import { useAdminUsers } from '@/components/admin/useAdminUsers';
import { Locale } from '@/i18n/config';
import type { ActionMessage, UserRow } from '@/types/admin';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';

const AdminBugReportsWorkbench = dynamic(
  () => import('@/components/admin/AdminBugReportsWorkbench').then((m) => m.AdminBugReportsWorkbench),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminContentReportsWorkbench = dynamic(
  () => import('@/components/admin/AdminContentReportsWorkbench').then((m) => m.AdminContentReportsWorkbench),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminChallengeControl = dynamic(
  () => import('@/components/admin/AdminChallengeControl').then((m) => m.AdminChallengeControl),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminChallengeStats = dynamic(
  () => import('@/components/admin/AdminChallengeStats').then((m) => m.AdminChallengeStats),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminAuditLogView = dynamic(
  () => import('@/components/admin/AdminAuditLogView').then((m) => m.AdminAuditLogView),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminSettingsPanel = dynamic(
  () => import('@/components/admin/AdminSettingsPanel').then((m) => m.AdminSettingsPanel),
  { ssr: false, loading: () => <AdminTabContentSkeleton /> }
);
const AdminModerationDrawer = dynamic(
  () => import('@/components/admin/AdminModerationDrawer').then((m) => m.AdminModerationDrawer),
  { ssr: false }
);
const AdminCreateUserModal = dynamic(
  () => import('@/components/admin/AdminCreateUserModal').then((m) => m.AdminCreateUserModal),
  { ssr: false }
);
const ScoreboardCheckModal = dynamic(
  () => import('@/components/common/ScoreboardCheckModal').then((m) => m.ScoreboardCheckModal),
  { ssr: false }
);
const ScraperConfigModal = dynamic(
  () => import('@/components/ScraperConfigModal').then((m) => m.ScraperConfigModal),
  { ssr: false }
);
const ConfirmModal = dynamic(() => import('@/components/common/ConfirmModal').then((m) => m.ConfirmModal), {
  ssr: false,
});

export function AdminPanelClient() {
  const currentLocale = useLocale() as Locale;
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const dict = useDictionary();
  const [activeTab, setActiveTab] = usePersistentString<AdminTab>(ADMIN_TAB_STORAGE_KEY, 'users', isAdminTab);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // Modals & Maintenance State
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isOcrCheckOpen, setIsOcrCheckOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'export' | 'import' | 'purge'>('export');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState<boolean>(false);
  const [moderationUser, setModerationUser] = useState<UserRow | null>(null);

  const {
    stats, users, search, setSearch, roleFilter, setRoleFilter, page, setPage, totalUsers, loadingData,
    fetchAdminData, userPendingDeletion, setUserPendingDeletion, isDeletingUser,
    userPendingTwoFactorReset, setUserPendingTwoFactorReset, isResettingTwoFactor, confirmTwoFactorReset,
    handleToggleRole, handleDeleteUser, confirmDeleteUser, handleCreateUser,
  } = useAdminUsers({
    onActionMessage: setActionMessage,
    onUserCreated: () => setIsCreateUserOpen(false),
  });
  const {
    bugReports, bugStats, bugSearch, setBugSearch, bugStatusFilter, setBugStatusFilter, bugPage, setBugPage,
    totalBugReports, loadingBugs, selectedBugId, setSelectedBugId, editingNotes, setEditingNotes,
    fetchBugReports, bugReportPendingDeletion, setBugReportPendingDeletion, isDeletingBugReport,
    handleUpdateBugReport, handleDeleteBugReport, confirmDeleteBugReport,
  } = useAdminBugReports({ onActionMessage: setActionMessage });

  const contentReports = useAdminContentReports({ onActionMessage: setActionMessage });
  const { fetchReports, fetchDetail, refreshPendingCount } = contentReports;
  const { selectedId: selectedReportId } = contentReports;

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      if (activeTab === 'users' || activeTab === 'challenge_stats') {
        fetchAdminData();
      } else if (activeTab === 'bugs') {
        fetchBugReports();
      } else if (activeTab === 'reports') {
        fetchReports();
      }
    }
  }, [isAuthenticated, isAdmin, activeTab, fetchAdminData, fetchBugReports, fetchReports]);

  // The tab's pending badge has to be right before the Reports tab is ever opened.
  useEffect(() => {
    if (isAuthenticated && isAdmin) refreshPendingCount();
  }, [isAuthenticated, isAdmin, refreshPendingCount]);

  useEffect(() => {
    if (isAuthenticated && isAdmin && activeTab === 'reports') fetchDetail(selectedReportId);
  }, [isAuthenticated, isAdmin, activeTab, selectedReportId, fetchDetail]);

  if (!dict || isLoading) {
    return <AdminPanelSkeleton />;
  }
  if (!isAuthenticated || !isAdmin) {
    return <ErrorPage variant="forbidden" />;
  }

  return (
    <PageShell
      locale={currentLocale}
      activeCategory="admin"
      mainId="main-admin-content"
      mainClassName="overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <AdminHeader
          isLoading={loadingData || loadingBugs || contentReports.loading}
          onOpenDbMaintenance={(tab) => {
            if (tab) setModalTab(tab);
            setIsConfigOpen(true);
          }}
          onOpenOcrCheck={() => setIsOcrCheckOpen(true)}
          onRefreshData={() =>
            activeTab === 'users' ? fetchAdminData() : activeTab === 'reports' ? fetchReports() : fetchBugReports()
          }
        />

        {actionMessage && (
          <AdminActionAlert message={actionMessage} onDismiss={() => setActionMessage(null)} />
        )}

        {/* Subtab Switcher */}
        <AdminSectionTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          totalUsers={totalUsers}
          pendingBugs={bugStats?.pending ?? 0}
          pendingReports={contentReports.pendingTotal}
        />

        {activeTab === 'users' ? (
          <div className="space-y-6">
            <AdminStatsGrid stats={stats} />
            <AdminUserTable
              users={users}
              totalUsers={totalUsers}
              page={page}
              search={search}
              roleFilter={roleFilter}
              loading={loadingData}
              currentUserId={user?.id}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              onRoleFilterChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              onPageChange={setPage}
              onOpenCreateUser={() => setIsCreateUserOpen(true)}
              onToggleRole={handleToggleRole}
              onOpenModeration={setModerationUser}
              onDeleteUser={handleDeleteUser}
              onResetTwoFactor={setUserPendingTwoFactorReset}
              onDownloadError={(text) => setActionMessage({ type: 'error', text })}
            />
          </div>
        ) : activeTab === 'challenges' ? (
          <Suspense fallback={<AdminTabContentSkeleton />}>
            <AdminChallengeControl onActionMessage={setActionMessage} />
          </Suspense>
        ) : activeTab === 'challenge_stats' ? (
          <Suspense fallback={<AdminTabContentSkeleton />}>
            <AdminChallengeStats stats={stats} />
          </Suspense>
        ) : activeTab === 'reports' ? (
          <Suspense fallback={<AdminTabContentSkeleton />}>
            <AdminContentReportsWorkbench
              list={contentReports.list}
              statusFilter={contentReports.statusFilter}
              page={contentReports.page}
              perPage={contentReports.perPage}
              loading={contentReports.loading}
              selectedId={contentReports.selectedId}
              detail={contentReports.detail}
              loadingDetail={contentReports.loadingDetail}
              resolving={contentReports.resolving}
              onStatusFilterChange={(val) => {
                contentReports.setStatusFilter(val);
                contentReports.setPage(1);
              }}
              onPageChange={contentReports.setPage}
              onSelect={contentReports.setSelectedId}
              onResolve={async (id, action, author, notes) => {
                const ok = await contentReports.resolve(id, action, author, notes);
                if (ok) fetchDetail(id);
                return ok;
              }}
              onPurgeExpired={contentReports.purgeExpired}
            />
          </Suspense>
        ) : activeTab === 'settings' ? (
          <Suspense fallback={<AdminTabContentSkeleton />}>
            <AdminSettingsPanel onActionMessage={setActionMessage} />
          </Suspense>
        ) : activeTab === 'audit' ? (
          <Suspense fallback={<AdminTabContentSkeleton />}>
            <AdminAuditLogView />
          </Suspense>
        ) : (
          <Suspense fallback={<AdminTabContentSkeleton />}>
            <AdminBugReportsWorkbench
              bugReports={bugReports}
              bugStats={bugStats}
              totalBugReports={totalBugReports}
              bugPage={bugPage}
              bugSearch={bugSearch}
              bugStatusFilter={bugStatusFilter}
              selectedBugId={selectedBugId}
              editingNotes={editingNotes}
              loading={loadingBugs}
              onSearchChange={(val) => {
                setBugSearch(val);
                setBugPage(1);
              }}
              onStatusFilterChange={(val) => {
                setBugStatusFilter(val);
                setBugPage(1);
              }}
              onPageChange={setBugPage}
              onSelectBug={setSelectedBugId}
              onNoteChange={(id, text) =>
                setEditingNotes((prev) => ({ ...prev, [id]: text }))
              }
              onUpdateBug={handleUpdateBugReport}
              onDeleteBug={handleDeleteBugReport}
            />
          </Suspense>
        )}
      </div>

      <AdminCreateUserModal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        onSubmit={handleCreateUser}
      />

      <AdminModerationDrawer
        user={moderationUser}
        onClose={() => setModerationUser(null)}
        onChanged={fetchAdminData}
        onActionMessage={setActionMessage}
      />

      <ScoreboardCheckModal isOpen={isOcrCheckOpen} onClose={() => setIsOcrCheckOpen(false)} />

      <ScraperConfigModal
        key={modalTab}
        isOpen={isConfigOpen}
        initialTab={modalTab}
        onClose={() => setIsConfigOpen(false)}
        onPurgeSuccess={() => {
          fetchAdminData();
          fetchBugReports();
        }}
      />

      <ConfirmModal
        open={userPendingDeletion !== null}
        title={dict.admin.deleteUserTitle}
        message={
          <>
            {dict.admin.confirmDeleteUserPrefix}{' '}
            <strong className="font-bold text-accent-red">{userPendingDeletion?.username}</strong>?
            <br />
            {dict.admin.cannotBeUndone}
          </>
        }
        confirmLabel={dict.admin.delete}
        busy={isDeletingUser}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserPendingDeletion(null)}
      />

      <ConfirmModal
        open={userPendingTwoFactorReset !== null}
        title={dict.admin.resetTwoFactorTitle}
        message={formatMessage(dict.admin.resetTwoFactorMessage, { username: userPendingTwoFactorReset?.username ?? '' })}
        confirmLabel={dict.admin.resetTwoFactorConfirm}
        busy={isResettingTwoFactor}
        onConfirm={confirmTwoFactorReset}
        onCancel={() => setUserPendingTwoFactorReset(null)}
      />

      <ConfirmModal
        open={bugReportPendingDeletion !== null}
        title={dict.admin.deleteBugReportTitle}
        message={
          dict.admin.confirmDeleteBugReport
            ? formatMessage(dict.admin.confirmDeleteBugReport, { id: (bugReportPendingDeletion ?? 0).toString() })
            : `Delete report #${bugReportPendingDeletion}?`
        }
        confirmLabel={dict.admin.delete}
        busy={isDeletingBugReport}
        onConfirm={confirmDeleteBugReport}
        onCancel={() => setBugReportPendingDeletion(null)}
      />
    </PageShell>
  );
}
