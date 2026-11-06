export interface PublishBatchTileJob {
  id: string;
  status: string;
  action?: string;
  totalCount: number;
  processedCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt?: string;
  requestedBy?: string;
  errorDetails?: string;
}

/**
 * Formats a given date/timestamp into "dd mmm yy hh mm" format (e.g. "06 Nov 26 10:09").
 */
export function formatBatchTimestamp(dateStr?: string | number | Date | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch {
    return String(dateStr || '');
  }
}

export function formatBatchTime(dateStr: string): string {
  return formatBatchTimestamp(dateStr);
}

export function getBatchStatusBadge(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return { label: 'Completed', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
    case 'in_progress':
    case 'running':
      return { label: 'Running', bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' };
    case 'partial':
      return { label: 'Partial', bg: '#FEF9C3', text: '#A16207', border: '#FDE047' };
    case 'failed':
      return { label: 'Failed', bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
    case 'queued':
    default:
      return { label: 'Queued', bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
  }
}

/**
 * Derives the visual hierarchy and layout attributes for a batch in the publish queue:
 * - First-class label: Timestamp in dd mmm yy hh mm format
 * - Secondary label: GUID (#shortId)
 * - 3 per row vertical tile grid layout
 */
export function getBatchTileLayout(job: PublishBatchTileJob) {
  const shortId = job.id.replace(/-/g, '').substring(0, 8);
  const timestamp = formatBatchTimestamp(job.createdAt);
  const statusCfg = getBatchStatusBadge(job.status);

  return {
    primaryLabel: {
      type: 'timestamp' as const,
      value: timestamp,
      rawDate: job.createdAt,
    },
    secondaryLabel: {
      type: 'guid' as const,
      value: `#${shortId}`,
      fullGuid: job.id,
    },
    status: statusCfg,
    grid: {
      numColumns: 3,
      isVerticalTile: true,
      maxTileWidthPercent: '32.5%',
    },
    metrics: {
      processedCount: job.processedCount,
      failedCount: job.failedCount,
      totalCount: job.totalCount,
    },
  };
}
