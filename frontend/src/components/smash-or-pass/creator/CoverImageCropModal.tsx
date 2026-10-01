// frontend/src/components/smash-or-pass/creator/CoverImageCropModal.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCcw, Check, Upload, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

import type { Dictionary } from '@/locales/types';

import { tip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
interface CoverImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onApplyCrop: (croppedDataUrl: string) => void;
  themeColor?: string;
  isAdmin?: boolean;
  dict?: Dictionary;
}

export const CoverImageCropModal: React.FC<CoverImageCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onApplyCrop,
  themeColor = '#ff0055',
  isAdmin = false,
  dict,
}) => {
  const cm = dict?.smashOrPass?.cropModal || {
    title: 'Crop & Frame Cover Image',
    subtitle: 'Drag to reposition, use mouse wheel or zoom slider to scale up any specific part (up to 500%).',
    previewAlt: 'Cover Preview',
    unableToDisplay: 'Unable to display image from external URL',
    noImageUrl: 'No image URL specified',
    uploadPrompt: 'Upload an image file directly from your device for guaranteed instant preview & cropping.',
    uploadLocalFile: 'Upload Local File',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    reset: 'Reset',
    resetTitle: 'Reset Zoom and Position',
    uploadFile: 'Upload File',
    corsTitle: 'Third-party image host blocked canvas export',
    corsAdminDesc: 'The image server does not allow browsers to read its pixels. You can upload the image file directly to crop without any restriction, or use the original image URL directly.',
    corsUserDesc: 'The image server does not allow browsers to export cropped pixels. You can use the uncropped image URL directly.',
    useUncropped: 'Use Uncropped URL',
    cancel: 'Cancel',
    applyCrop: 'Apply Crop',
    dragHint: 'Drag to pan • Wheel to zoom ({zoom}%) • 16:9 banner',
  };

  const [currentUrl, setCurrentUrl] = useState<string>(imageUrl);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [corsError, setCorsError] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(imageUrl);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCorsError(false);
      setImageError(false);
      setImageLoaded(false);

      // Preemptively fetch via proxy to turn into a clean local dataUrl
      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        const proxied = `/api/v1/smash-or-pass/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        fetch(proxied)
          .then((res) => {
            if (!res.ok) throw new Error('Proxy fetch failed');
            return res.blob();
          })
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) setCurrentUrl(dataUrl);
            };
            reader.readAsDataURL(blob);
          })
          .catch(() => {
            // Keep original URL for rendering
          });
      }
    }
  }, [isOpen, imageUrl]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffset({
        x: initialOffsetRef.current.x + dx,
        y: initialOffsetRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support for mobile / touchpads
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffsetRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setZoom((z) => Math.max(1, Math.min(5, Number((z + delta).toFixed(2)))));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCurrentUrl(dataUrl);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setCorsError(false);
        setImageError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!containerRef.current || !imgRef.current) return;

    try {
      const targetWidth = 960;
      const targetHeight = 540; // 16:9 banner
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const imgRect = imgRef.current.getBoundingClientRect();

      // Compute exact relative position of image inside container
      const imgXInContainer = imgRect.left - containerRect.left;
      const imgYInContainer = imgRect.top - containerRect.top;

      // Scale factors from screen container to output canvas
      const scaleX = targetWidth / containerRect.width;
      const scaleY = targetHeight / containerRect.height;

      // Draw neutral dark backdrop
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const destX = imgXInContainer * scaleX;
      const destY = imgYInContainer * scaleY;
      const destW = imgRect.width * scaleX;
      const destH = imgRect.height * scaleY;

      const exportImg = new Image();

      const performDraw = () => {
        try {
          ctx.drawImage(exportImg, destX, destY, destW, destH);
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          onApplyCrop(croppedDataUrl);
          onClose();
        } catch (err) {
          console.warn('Canvas export tainted by external CORS:', err);
          setCorsError(true);
        }
      };

      if (currentUrl.startsWith('data:') || currentUrl.startsWith('blob:')) {
        exportImg.src = currentUrl;
        if (exportImg.complete) performDraw();
        else exportImg.onload = performDraw;
      } else {
        // Route through our image proxy with CORS headers so canvas can safely read and crop pixels
        const proxiedUrl = `/api/v1/smash-or-pass/proxy-image?url=${encodeURIComponent(currentUrl)}`;
        exportImg.crossOrigin = 'anonymous';
        exportImg.src = proxiedUrl;
        exportImg.onload = performDraw;
        exportImg.onerror = () => {
          // Fallback to direct load if proxy fails
          const directImg = new Image();
          directImg.crossOrigin = 'anonymous';
          directImg.src = currentUrl;
          directImg.onload = () => {
            try {
              ctx.drawImage(directImg, destX, destY, destW, destH);
              const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
              onApplyCrop(croppedDataUrl);
              onClose();
            } catch {
              setCorsError(true);
            }
          };
          directImg.onerror = () => {
            setCorsError(true);
          };
        };
      }
    } catch {
      setCorsError(true);
    }
  };

  // Determine if image aspect ratio is taller than 16:9 (e.g. portrait or square)
  const isTallerThan16x9 = naturalSize.width && naturalSize.height
    ? (naturalSize.width / naturalSize.height) < (16 / 9)
    : false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={cm.title}
      subtitle={cm.subtitle}
      icon={<Crop className="h-5 w-5 text-accent-red" />}
    >
      <div className="space-y-4 p-4 sm:p-6 font-mono select-none">
        {/* Interactive Crop Viewport (16:9 Aspect Ratio) */}
        <div className="relative rounded-3xl border-2 border-accent-red/40 bg-bg-primary overflow-hidden shadow-2xl">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative w-full aspect-[16/9] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing bg-bg-surface"
            style={{ touchAction: 'none' }}
          >
            {currentUrl && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element -- Live interactive canvas crop
              <img
                ref={imgRef}
                src={currentUrl}
                alt={cm.previewAlt}
                referrerPolicy="no-referrer"
                onLoad={handleImageLoad}
                onError={handleImageError}
                draggable={false}
                className="max-w-none pointer-events-none transition-transform duration-75 select-none"
                style={{
                  width: isTallerThan16x9 ? `${100 * zoom}%` : 'auto',
                  height: isTallerThan16x9 ? 'auto' : `${100 * zoom}%`,
                  minWidth: isTallerThan16x9 ? `${100 * zoom}%` : undefined,
                  minHeight: !isTallerThan16x9 ? `${100 * zoom}%` : undefined,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center text-text-muted">
                <ImageIcon className="h-10 w-10 text-accent-red/60 animate-bounce" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-text-primary">
                    {imageError ? cm.unableToDisplay : cm.noImageUrl}
                  </p>
                  <p className="text-[11px] text-text-muted max-w-sm">
                    {cm.uploadPrompt}
                  </p>
                </div>
                <Button
                  variant="primary" size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{cm.uploadLocalFile}</span>
                </Button>
              </div>
            )}

            {/* Grid Overlay / Rule of Thirds Guide */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-border-color">
              <div className="border-r border-b border-border-subtle" />
              <div className="border-r border-b border-border-subtle" />
              <div className="border-b border-border-subtle" />
              <div className="border-r border-b border-border-subtle" />
              <div className="border-r border-b border-border-subtle" />
              <div className="border-b border-border-subtle" />
              <div className="border-r border-b border-border-subtle" />
              <div className="border-r border-b border-border-subtle" />
              <div />
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-bg-primary/80 backdrop-blur-md border border-border-subtle text-[10px] text-text-secondary pointer-events-none">
              {cm.dragHint ? cm.dragHint.replace('{zoom}', String(Math.round(zoom * 100))) : ''}
            </div>
          </div>
        </div>

        {/* Controls Bar: Zoom Slider & Quick Actions */}
        <Surface tone="elevated" radius="2xl" padding="none" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary" size="sm" icon
              onClick={() => setZoom((z) => Math.max(1, Math.min(5, Number((z - 0.25).toFixed(2)))))}
              {...tip(cm.zoomOut, undefined, 'action')} aria-label={cm.zoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <span className="text-xs font-bold text-text-muted flex items-center gap-1 shrink-0 w-24">
              <ZoomIn className="h-3.5 w-3.5 text-accent-red" />
              {Math.round(zoom * 100)}%
            </span>

            <input
              type="range"
              min="1"
              max="5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full sm:w-44 accent-accent-red cursor-pointer"
            />

            <Button
              variant="secondary" size="sm" icon
              onClick={() => setZoom((z) => Math.max(1, Math.min(5, Number((z + 0.25).toFixed(2)))))}
              {...tip(cm.zoomIn, undefined, 'action')} aria-label={cm.zoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary" size="sm"
              onClick={handleReset}
              {...tip(cm.resetTitle, undefined, 'action')} aria-label={cm.resetTitle}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{cm.reset}</span>
            </Button>

            {isAdmin && (
              <>
                <Button
                  variant="secondary" size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  {...tip(cm.uploadPrompt, undefined, 'action')} aria-label={cm.uploadPrompt}
                >
                  <Upload className="h-3.5 w-3.5 text-accent-red" />
                  <span>{cm.uploadFile}</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        </Surface>

        {/* CORS Notice if canvas export fails on external domains */}
        {corsError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-accent-amber" />
            <div className="space-y-1.5">
              <p className="font-bold">{cm.corsTitle}</p>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {isAdmin ? cm.corsAdminDesc : cm.corsUserDesc}
              </p>
              <div className="flex items-center gap-2 pt-1">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 rounded-lg bg-accent-amber text-text-inverted text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {cm.uploadFile}
                  </button>
                )}
                <Button
                  variant="secondary" size="xs"
                  onClick={() => {
                    onApplyCrop(currentUrl);
                    onClose();
                  }}
                >
                  {cm.useUncropped}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-color">
          <Button
            variant="ghost" size="md"
            onClick={onClose}
          >
            {cm.cancel}
          </Button>
          <Button
            variant="primary" size="md"
            onClick={handleApplyCrop}
            disabled={!imageLoaded && !currentUrl}
          >
            <Check className="h-4 w-4" />
            <span>{cm.applyCrop}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
