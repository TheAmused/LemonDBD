'use client';
// frontend/src/app/[locale]/admin/page.tsx

import React, { useState, useEffect, use, Suspense } from 'react';
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
import { useAdminUsers } from '@/components/admin/useAdminUsers';
import { Locale } from '@/i18n/config';
import type { ActionMessage } from '@/types/admin';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';

const AdminBugReportsWorkbench = dynamic(
  () => import('@/components/admin/AdminBugReportsWorkbench').then((m) => m.AdminBugReportsWorkbench),
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

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export default function AdminPanelPage({ params }: AdminPageProps) {
  const resolvedParams = use(params);
  const currentLocale = (resolvedParams?.locale as Locale) || 'en';
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  const dict = useDictionary();
  const [activeTab, setActiveTab] = usePersistentString<AdminTab>(ADMIN_TAB_STORAGE_KEY, 'users', isAdminTab);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // Modals & Maintenance State
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isOcrCheckOpen, setIsOcrCheckOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'export' | 'import' | 'purge'>('export');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState<boolean>(false);

  const {
    stats, users, search, setSearch, roleFilter, setRoleFilter, page, setPage, totalUsers, loadingData,
    fetchAdminData, userPendingDeletion, setUserPendingDeletion, isDeletingUser,
    handleToggleRole, handleToggleActive, handleDeleteUser, confirmDeleteUser, handleCreateUser,
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

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      if (activeTab === 'users' || activeTab === 'challenge_stats') {
        fetchAdminData();
      } else if (activeTab === 'bugs') {
        fetchBugReports();
      }
    }
  }, [isAuthenticated, isAdmin, activeTab, fetchAdminData, fetchBugReports]);

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
            isLoading={loadingData || loadingBugs}
            onOpenDbMaintenance={(tab) => {
              if (tab) setModalTab(tab);
              setIsConfigOpen(true);
            }}
            onOpenOcrCheck={() => setIsOcrCheckOpen(true)}
            onRefreshData={() => (activeTab === 'users' ? fetchAdminData() : fetchBugReports())}
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
                onToggleActive={handleToggleActive}
                onDeleteUser={handleDeleteUser}
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
