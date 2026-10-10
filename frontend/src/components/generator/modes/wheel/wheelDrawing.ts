// frontend/src/components/generator/modes/wheel/wheelDrawing.ts
import type { Perk, RoleCategory } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import { isSurvivor } from '@/utils/characterUtils';
import { canvasFont } from '@/utils/canvasFont';
import { isPerkBlockedByMutator } from '../../lib/perkPicker';

export function drawThornedRim(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  const spikeCount = 28;
  const spikeAngle = (2 * Math.PI) / spikeCount;
  const spikeHeight = 14;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikeCount; i++) {
    const baseAngle1 = i * spikeAngle;
    const baseAngle2 = baseAngle1 + spikeAngle * 0.5;
    const tipAngle = baseAngle1 + spikeAngle * 0.25;

    const x1 = centerX + Math.cos(baseAngle1) * radius;
    const y1 = centerY + Math.sin(baseAngle1) * radius;
    const xTip = centerX + Math.cos(tipAngle) * (radius + spikeHeight);
    const yTip = centerY + Math.sin(tipAngle) * (radius + spikeHeight);
    const x2 = centerX + Math.cos(baseAngle2) * radius;
    const y2 = centerY + Math.sin(baseAngle2) * radius;

    if (i === 0) ctx.moveTo(x1, y1);
    else ctx.lineTo(x1, y1);
    ctx.lineTo(xTip, yTip);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();

  // Without this inner circle subpath + evenodd fill, the zig-zag path
  // above has no hole -- ctx.fill() would flood the ENTIRE disk (center
  // to spike tips) with the rim gradient, painting over every slice,
  // badge, and hub drawn earlier in the same pass. That's what silently
  // reduced the whole wheel to a solid circle with nothing visible on it.
  ctx.moveTo(centerX + (radius - 10), centerY);
  ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
  ctx.closePath();

  const rimGrad = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + spikeHeight);
  rimGrad.addColorStop(0, '#961f1f');
  rimGrad.addColorStop(1, '#1a0303');
  ctx.fillStyle = rimGrad;
  ctx.fill('evenodd');
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#5c1414';
  ctx.stroke();
  ctx.restore();
};

export interface WheelDrawState {
  phase: 'page' | 'perk';
  /** Current rotation of the wheel, in radians. */
  angle: number;
  /** The page whose perks the perk wheel shows. */
  activePage: number;
  effectiveTotalPages: number;
  lastPagePerks: number;
  perksPerPage: number;
  sortedPerks: Perk[];
  activeMutator: ChaosMutator | null;
  role: RoleCategory;
  getIconSrc: (perk?: Perk) => string;
  imageCache: Map<string, HTMLImageElement>;
}

/** Paints the whole wheel (page wheel or perk wheel, hub, rim and pointer) onto a square canvas context. */
export function drawWheel(ctx: CanvasRenderingContext2D, size: number, state: WheelDrawState): void {
  const {
    phase, angle: wheelAngle, activePage, effectiveTotalPages, lastPagePerks, perksPerPage,
    sortedPerks, activeMutator, role, getIconSrc, imageCache,
  } = state;
  const radius = size / 2 - 32;
  const centerX = size / 2;
  const centerY = size / 2;

  ctx.clearRect(0, 0, size, size);

  if (phase === 'page') {
    const sliceAngle = (2 * Math.PI) / effectiveTotalPages;

    for (let i = 0; i < effectiveTotalPages; i++) {
      const angle = wheelAngle + i * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
      if (i % 2 === 0) {
        grad.addColorStop(0, '#4a0d0d');
        grad.addColorStop(1, '#1c0404');
      } else {
        grad.addColorStop(0, '#5c1414');
        grad.addColorStop(1, '#1a0505');
      }

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#a3232f';
      ctx.stroke();

      const midAngle = angle + sliceAngle / 2;
      const badgeRadiusPos = radius - 75;
      const bx = centerX + Math.cos(midAngle) * badgeRadiusPos;
      const by = centerY + Math.sin(midAngle) * badgeRadiusPos;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      ctx.font = canvasFont('900', 18);
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`P${i + 1}`, bx, by + 1);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 58, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = canvasFont('900', 16);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAGE WHEEL', centerX, centerY);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();
    drawThornedRim(ctx, centerX, centerY, radius);
  } else {
    const pageNumber = activePage;
    const maxSlotsOnPage = Math.max(
      1,
      pageNumber === effectiveTotalPages ? lastPagePerks || perksPerPage : perksPerPage
    );
    const sliceAngle = (2 * Math.PI) / maxSlotsOnPage;

    for (let i = 0; i < maxSlotsOnPage; i++) {
      const angle = wheelAngle + i * sliceAngle;
      const index = (pageNumber - 1) * perksPerPage + i;
      const perk = sortedPerks[index] || sortedPerks[index % Math.max(1, sortedPerks.length)];
      const isBlocked = isPerkBlockedByMutator(perk, activeMutator);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
      if (isBlocked) {
        grad.addColorStop(0, '#1f1924');
        grad.addColorStop(1, '#0f0a12');
      } else if (isSurvivor(role)) {
        grad.addColorStop(0, i % 2 === 0 ? '#064e3b' : '#022c22');
        grad.addColorStop(1, i % 2 === 0 ? '#022c22' : '#0f172a');
      } else {
        grad.addColorStop(0, i % 2 === 0 ? '#881337' : '#4c0519');
        grad.addColorStop(1, i % 2 === 0 ? '#4c0519' : '#0f172a');
      }

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = isBlocked ? '#e11d48' : isSurvivor(role) ? '#15803d' : '#991b1b';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      const midAngle = angle + sliceAngle / 2;
      ctx.rotate(midAngle + Math.PI / 2);

      const iconSrc = getIconSrc(perk);
      const imgObj = iconSrc ? imageCache.get(iconSrc) : undefined;
      const iconSize = 72;
      const iconRadiusPos = -(radius - 85);

      if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
        ctx.save();
        if (isBlocked) ctx.globalAlpha = 0.25;

        ctx.drawImage(imgObj, -iconSize / 2, iconRadiusPos - iconSize / 2, iconSize, iconSize);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(0, iconRadiusPos);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = isBlocked ? '#4c0519' : isSurvivor(role) ? '#15803d' : '#7f1d1d';
        ctx.fillRect(-24, -24, 48, 48);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-24, -24, 48, 48);
        ctx.restore();

        ctx.font = canvasFont('900', 16);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((perk?.name || 'P').charAt(0).toUpperCase(), 0, iconRadiusPos);
      }

      if (isBlocked) {
        ctx.font = canvasFont('bold', 24);
        ctx.fillStyle = '#b91c1c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚫', 0, iconRadiusPos);
      }

      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 62, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = isSurvivor(role) ? '#16a34a' : '#b91c1c';
    ctx.stroke();

    ctx.fillStyle = isSurvivor(role) ? '#22c55e' : '#dc2626';
    ctx.font = canvasFont('900', 16);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PAGE ${pageNumber}`, centerX, centerY);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();
    drawThornedRim(ctx, centerX, centerY, radius);
  }

  // Top Pointer: a plain downward-pointing triangle
  ctx.beginPath();
  ctx.moveTo(centerX - 18, 2);
  ctx.lineTo(centerX + 18, 2);
  ctx.lineTo(centerX, 40);
  ctx.closePath();
  ctx.fillStyle = '#b91c1c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1a0303';
  ctx.stroke();
}
