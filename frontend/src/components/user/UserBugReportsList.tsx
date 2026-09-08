'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserBugReportsList.tsx

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bug,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Crown,
  Image as ImageIcon,
  ChevronDown,
  X,
  Maximize2,
} from 'lucide-react';
import { UserBugReport } from '@/types/userProfile';
import { UserBugReportsSkeleton } from './UserBugReportsSkeleton';
import { Pagination } from '@/components/Pagination';
import { staticUrl } from '@/utils/api';

interface UserBugReportsListProps {
  reports: UserBugReport[];
  loading: boolean;
  onOpenReportModal: () => void;
  dict?: Dictionary;
  t?: Record<string, string>;
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  hideHeading?: boolean;
}

export const UserBugReportsList: React.FC<UserBugReportsListProps> = ({
  reports,
  loading,
  onOpenReportModal,
  dict,
  t: propT,
  total,
  page = 1,
  perPage = 10,
  totalPages = 1,
  onPageChange,
  hideHeading = false,
}) => {
  const t: Record<string, string> = propT || dict?.user || {};
  const totalCount = total ?? reports.length;

  // Individual droppable drawer states for each bug report
  const [expandedReports, setExpandedReports] = useState<Record<number, boolean>>({});

  // Image popup lightbox state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Drag-to-scroll and touch-scroll state for PC & Mobile
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const hasDraggedRef = useRef(false);

  // Close image modal on Escape key and prevent background scroll
  useEffect(() => {
    if (!previewImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewImage]);

  const toggleReport = (id: number) => {
    if (hasDraggedRef.current) return;
    setExpandedReports((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isReportOpen = (id: number) => {
    // Default: open so user can see it and hide/collapse individual ones
    return expandedReports[id] !== false;
  };

  // Mouse drag-to-scroll handlers for PC
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('input')) {
      return;
    }
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startYRef.current = e.clientY;
    scrollTopRef.current = scrollContainerRef.current.scrollTop;
    setIsGrabbing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    if (Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true;
      e.preventDefault();
    }
    scrollContainerRef.current.scrollTop = scrollTopRef.current - deltaY;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsGrabbing(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  const getStatusBadge = (status: UserBugReport['status']) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent-amber font-mono">
            <Clock className="h-3 w-3 animate-spin" />
            <span>{t.statusInProgress || 'In Progress'}</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            <CheckCircle className="h-3 w-3" />
            <span>{t.statusResolved || 'Resolved'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-color bg-bg-elevated px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-text-muted font-mono">
            <XCircle className="h-3 w-3" />
            <span>{t.statusClosed || 'Closed'}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent-red font-mono">
            <HelpCircle className="h-3 w-3" />
            <span>{t.statusPending || 'Pending'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 w-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-color shrink-0">
        {!hideHeading ? (
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wider text-text-primary font-mono flex items-center gap-2">
              <Bug className="h-4 w-4 text-accent-red" />
              <span>{t.bugReportsTitle || 'Your Submitted Bug Reports'}</span>
            </h2>
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-text-secondary">
            {dict?.user?.myBugReportsCount
              ? dict.user.myBugReportsCount.replace('{count}', String(totalCount))
              : `${totalCount}`}
          </div>
        )}

        <button
          type="button"
          onClick={onOpenReportModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-red to-red-700 hover:opacity-90 px-3.5 py-1.5 text-xs font-bold text-text-inverted shadow-sm shadow-accent-red/20 transition-all cursor-pointer font-mono"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.reportNewBug || 'Report New Bug'}</span>
        </button>
      </div>

      {loading ? (
        <UserBugReportsSkeleton dict={dict} count={3} />
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border-color bg-bg-surface p-6 sm:p-8 text-center space-y-2.5 shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/10 text-accent-red">
            <Bug className="h-5 w-5" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-text-primary font-mono">
            {t.noReportsTitle || 'No Bug Reports Submitted'}
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {t.noReportsSubtitle ||
              'You have not reported any glitches yet. If you spot incorrect perk numbers or map callout issues, report them!'}
          </p>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent-red/30 bg-accent-red/10 px-3.5 py-1.5 text-xs font-bold text-accent-red hover:bg-accent-red/20 transition-colors cursor-pointer font-mono"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.submitBugReport || 'Submit a Bug Report'}</span>
          </button>
        </div>
      ) : (
        /* Scrollable and Drag-to-Scroll container on PC & Mobile */
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`grid grid-cols-1 gap-3 max-h-[380px] sm:max-h-[420px] 2xl:max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar touch-pan-y ${
            isGrabbing ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{ overscrollBehavior: 'contain' }}
        >
          {reports.map((report) => {
            const isOpen = isReportOpen(report.id);
            return (
              <div
                key={report.id}
                className="rounded-2xl border border-border-color bg-bg-surface text-text-primary overflow-hidden shadow-xs transition-all hover:border-accent-red/40"
              >
                {/* Individual Droppable Drawer Header */}
                <button
                  type="button"
                  onClick={() => toggleReport(report.id)}
                  aria-expanded={isOpen}
                  className="w-full p-3.5 sm:p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-bg-elevated/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs text-text-muted font-bold">#{report.id}</span>
                      <h3 className="text-sm sm:text-base font-black text-text-primary font-mono truncate">
                        {report.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-text-secondary font-mono">
                      <span className="rounded-lg bg-bg-elevated text-text-primary px-2 py-0.5 font-bold border border-border-color">
                        {report.category}
                      </span>
                      <span>
                        {t.reportedOn || 'Reported on'}{' '}
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {getStatusBadge(report.status)}
                    <div className="p-1 rounded-lg bg-bg-elevated/80 text-accent-red">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                          isOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {/* Individual Droppable Content Body */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-3.5 sm:p-4 pt-0 border-t border-border-color/60 space-y-3">
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap pt-2">
                        {report.message}
                      </p>

                      {/* Attachments with click to open popup modal */}
                      {report.images && report.images.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1 font-mono">
                            <ImageIcon className="h-3 w-3 text-accent-red" />
                            {t.attachments || 'Attachments'} ({report.images.length})
                          </span>
                          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                            {report.images.map((imgUrl, i) => {
                              const src = staticUrl(imgUrl) || imgUrl;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={(e) => {
                                    if (hasDraggedRef.current) return;
                                    e.stopPropagation();
                                    setPreviewImage(src);
                                  }}
                                  className="group relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-border-color bg-bg-elevated overflow-hidden shadow-xs hover:border-accent-red/60 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red"
                                  aria-label={`${t.attachments || 'Attachment'} ${i + 1}`}
                                >
                                  <img
                                    src={src}
                                    alt={`${t.attachments || 'Attachment'} ${i + 1}`}
                                    draggable={false}
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="h-4 w-4 text-white" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Developer Admin Response */}
                      {report.admin_notes && (
                        <div className="mt-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3 space-y-1">
                          <div className="flex items-center gap-2 text-accent-amber text-xs font-bold font-mono">
                            <Crown className="h-3.5 w-3.5" />
                            <span>{t.devResponse || 'Developer Response'}</span>
                          </div>
                          <p className="text-xs text-text-secondary italic">
                            {t.quoteOpen || '"'}
                            {report.admin_notes}
                            {t.quoteClose || '"'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && reports.length > 0 && totalPages > 1 && onPageChange && (
        <div className="shrink-0 pt-2 border-t border-border-color">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalResults={totalCount}
            limit={perPage}
            onPageChange={onPageChange}
            onLimitChange={() => {}}
            dict={dict as any}
          />
        </div>
      )}

      {/* Image Popup Lightbox Modal */}
      {previewImage && mounted && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t.imagePreview || 'Image Preview'}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 sm:-right-2 p-2 rounded-full bg-bg-surface/90 hover:bg-bg-surface text-text-primary hover:text-accent-red border border-border-color shadow-lg transition-all cursor-pointer z-10"
                aria-label={dict?.modal?.close || t.close || 'Close image preview'}
              >
                <X className="h-5 w-5" />
              </button>

              {/* High-res Image Preview */}
              <div className="relative max-h-[82vh] w-auto max-w-full overflow-hidden rounded-2xl border border-border-color/80 shadow-2xl bg-black/60 flex items-center justify-center">
                <img
                  src={previewImage}
                  alt={t.attachmentPreview || 'Bug Report Attachment Full Preview'}
                  className="max-h-[82vh] max-w-full w-auto h-auto object-contain rounded-2xl"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
