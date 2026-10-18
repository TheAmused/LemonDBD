'use client';
// frontend/src/components/user/UserBugReportsList.tsx

import React, { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Modal, useModal } from '@/components/common/Modal';
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Image as ImageIcon,
  ChevronDown,
  X,
  Maximize2,
} from 'lucide-react';
import { UserBugReport } from '@/types/userProfile';
import { UserBugReportsSkeleton } from './UserBugReportsSkeleton';
import { Pagination } from '@/components/common/Pagination';
import { staticUrl } from '@/utils/api';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';
import { EmptyState } from '@/components/common/EmptyState';
import { UnreadDot } from '@/components/common/UnreadDot';
import { formatDate } from '@/utils/format';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { Collapsible } from '@/components/common/Collapsible';
import { TileButton } from '@/components/common/TileButton';

interface UserBugReportsListProps {
  reports: UserBugReport[];
  loading: boolean;
  onOpenReportModal: () => void;
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  hideHeading?: boolean;
  onReportSeen?: (id: number) => void;
}

export const UserBugReportsList: React.FC<UserBugReportsListProps> = ({
      reports,
      loading,
      onOpenReportModal,
      total,
      page = 1,
      perPage = 10,
      totalPages = 1,
      onPageChange,
      hideHeading = false,
      onReportSeen,
    }) => {
  const dict = useDictionary();
  const t = dict.user;
  const totalCount = total ?? reports.length;

  const [openReports, setOpenReports] = useState<Record<number, boolean>>({});

  // Image popup lightbox state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const toggleReport = (report: UserBugReport) => {
    const willOpen = !openReports[report.id];
    setOpenReports((prev) => ({ ...prev, [report.id]: willOpen }));
    if (willOpen && report.feedback_unread) onReportSeen?.(report.id);
  };

  const getStatusBadge = (status: UserBugReport['status']) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge tone="red" size="sm" square>
            <Clock className="h-3 w-3" />
            <span>{t.statusInProgress}</span>
          </Badge>
        );
      case 'resolved':
        return (
          <Badge tone="green" size="sm" square>
            <CheckCircle className="h-3 w-3" />
            <span>{t.statusResolved}</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge tone="neutral" size="sm" square>
            <XCircle className="h-3 w-3" />
            <span>{t.statusClosed}</span>
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge tone="amber" size="sm" square>
            <HelpCircle className="h-3 w-3" />
            <span>{t.statusPending}</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3.5 w-full flex flex-col">
      {!hideHeading ? (
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-color shrink-0">
          <h2 className="text-sm sm:text-base font-black tracking-wider text-text-primary flex items-center gap-2">
            <FogReportIcon className="h-4 w-4 text-accent-red" />
            <span>{t.bugReportsTitle}</span>
          </h2>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenReportModal}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            <span>{t.reportNewBug}</span>
          </Button>
        </div>
      ) : null}

      {loading ? (
        <UserBugReportsSkeleton count={3} />
      ) : reports.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={FogReportIcon}
          iconClassName="mx-auto mb-2 h-8 w-8 text-accent-red"
          title={t.noReportsTitle}
          subtitle={t.noReportsSubtitle}
        />
      ) : (
        <div
          className="grid grid-cols-1 auto-rows-max gap-3 max-h-95 sm:max-h-105 2xl:max-h-115 overflow-y-auto pr-1.5 custom-scrollbar"
          style={{ overscrollBehavior: 'contain' }}
        >
          {reports.map((report) => {
            const isOpen = openReports[report.id] === true;
            const awaitingReply = !report.admin_notes && (report.status === 'pending' || report.status === 'in_progress');
            return (
              <Surface
                key={report.id}
                padding="none" className="text-text-primary overflow-hidden shadow-xs transition-all hover:border-accent-red/40"
              >
                {/* Individual Droppable Drawer Header */}
                <button
                  type="button"
                  onClick={() => toggleReport(report)}
                  aria-expanded={isOpen}
                  className="w-full p-3.5 sm:p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-bg-elevated/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-black text-text-primary truncate">
                      {report.title}
                    </h3>
                    <div className="type-caption text-text-secondary">
                      {t.reportedOn}{' '}
                      {formatDate(report.created_at)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="relative inline-flex">
                      {getStatusBadge(report.status)}
                      {report.feedback_unread && (
                        <UnreadDot
                          className="absolute -right-1 -top-1"
                          label={t.newFeedback}
                        />
                      )}
                    </span>
                    <div className="p-1 rounded-chip bg-bg-elevated/80 text-accent-red">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                          isOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {/* Individual Droppable Content Body */}
                <Collapsible
                  open={isOpen}
                  contentClassName="p-3.5 sm:p-4 pt-0 border-t border-border-color/60 space-y-3"
                >
                  <p className="type-body text-text-secondary whitespace-pre-wrap pt-2">
                    {report.message}
                  </p>

                  {/* Attachments with click to open popup modal */}
                  {report.images && report.images.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="type-label-2xs text-text-muted flex items-center gap-1">
                        <ImageIcon className="h-3 w-3 text-accent-red" />
                        {t.attachments} ({report.images.length})
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                        {report.images.map((imgUrl, i) => {
                          const src = staticUrl(imgUrl) || imgUrl;
                          return (
                            <TileButton press={false}
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(src);
                              }}
                              className="group relative h-16 w-16 sm:h-20 sm:w-20 rounded-control border border-border-color bg-bg-elevated overflow-hidden shadow-xs hover:border-accent-red/60 hover:shadow-md transition-all"
                              aria-label={`${t.attachments} ${i + 1}`}
                            >
                              <img
                                src={src}
                                alt={`${t.attachments} ${i + 1}`}
                                draggable={false}
                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-bg-primary/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="h-4 w-4 text-text-inverted" />
                              </div>
                            </TileButton>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Developer Admin Response */}
                  {report.admin_notes && (
                    <div className="mt-2 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-accent-amber type-strong">
                        <OverseerEyeIcon className="h-3.5 w-3.5" />
                        <span>{t.devResponse}</span>
                      </div>
                      <p className="text-xs text-text-secondary italic">
                        {t.quoteOpen || '"'}
                        {report.admin_notes}
                        {t.quoteClose || '"'}
                      </p>
                    </div>
                  )}

                  {awaitingReply && (
                    <p className="mt-2 flex items-center gap-2 rounded-card border border-border-color bg-bg-elevated/60 p-3 type-caption text-text-muted">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.noDevResponseYet}</span>
                    </p>
                  )}
                </Collapsible>
              </Surface>
            );
          })}
        </div>
      )}

      {!loading && reports.length > 0 && totalPages > 1 && onPageChange && (
        <div className="shrink-0 pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalResults={totalCount}
            limit={perPage}
            onPageChange={onPageChange}
            onLimitChange={() => {}}
          />
        </div>
      )}

      {/* Image Popup Lightbox Modal */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        variant="lightbox"
        layer="system"
        ariaLabel={t.imagePreview}
        className="overflow-visible"
      >
        <div className="relative flex items-center justify-center">
          <PreviewCloseButton label={dict.modal.close} />
          <div className="relative max-h-dvh-82 w-auto max-w-full overflow-hidden rounded-card border border-border-color/80 shadow-2xl bg-bg-primary/60 flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt={t.attachmentPreview}
                className="max-h-dvh-82 max-w-full w-auto h-auto object-contain rounded-card"
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

const PreviewCloseButton: React.FC<{ label: string }> = ({ label }) => {
  const { close } = useModal();
  return (
    <Button
      icon
      onClick={close}
      pill
      className="absolute right-2 top-2 z-10 shadow-lg"
      aria-label={label}
    >
      <X className="h-5 w-5" />
    </Button>
  );
};
