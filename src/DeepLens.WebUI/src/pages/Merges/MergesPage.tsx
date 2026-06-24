import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import {
  MergeType as MergeIcon,
  Close as DismissIcon,
  Refresh as RefreshIcon,
  CompareArrows as CompareIcon,
  CheckCircleOutline as DoneIcon,
  ImageNotSupported as NoImageIcon,
} from '@mui/icons-material';
import whatsAppProductService, { MergeCandidateDto } from '../../services/whatsAppProductService';
import { useAuth } from '../../contexts/AuthContext';
import mediaService from '../../services/mediaService';

// ── Similarity helpers ────────────────────────────────────────────────────────

/** Convert raw similarityScore (Hamming distance 0-64) to 0-100% similarity */
const hammingToPercent = (distance: number): number =>
  Math.round(((64 - distance) / 64) * 100);

const similarityColor = (distance: number): 'success' | 'warning' | 'error' => {
  if (distance <= 2) return 'success';
  if (distance <= 4) return 'warning';
  return 'error';
};

const similarityLabel = (distance: number): string => {
  if (distance <= 2) return 'Near Identical';
  if (distance <= 4) return 'Very Similar';
  return 'Possible Match';
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface ProductCardProps {
  title: string;
  sku: string;
  imagePath: string;
  mediaId: string;
  tenantId: string;
  label: 'A' | 'B';
}

const ProductCard: React.FC<ProductCardProps> = ({ title, sku, imagePath, mediaId, tenantId, label }) => {
  const [imgError, setImgError] = useState(false);

  // Prefer the thumbnail URL from the media service if we have a mediaId
  const imageUrl = mediaId && !imgError
    ? mediaService.getThumbnailUrl(mediaId, tenantId)
    : (!imgError && imagePath) ? imagePath : null;

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Label badge */}
      <Box
        sx={{
          px: 2,
          py: 0.75,
          bgcolor: label === 'A' ? 'primary.main' : 'secondary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="caption" fontWeight={700} color="white" letterSpacing={1}>
          PRODUCT {label}
        </Typography>
      </Box>

      {/* Image */}
      <Box
        sx={{
          height: 220,
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <CardMedia
            component="img"
            image={imageUrl}
            alt={title}
            onError={() => setImgError(true)}
            sx={{ height: '100%', width: '100%', objectFit: 'contain', p: 1 }}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
            <NoImageIcon sx={{ fontSize: 48 }} />
            <Typography variant="caption">No image</Typography>
          </Box>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap title={title}>
          {title || '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          SKU: <strong>{sku || 'N/A'}</strong>
        </Typography>
      </CardContent>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const MergesPage: React.FC = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';

  const [candidates, setCandidates] = useState<MergeCandidateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // candidateId being acted on
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await whatsAppProductService.listMergeCandidates();
      setCandidates(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load merge candidates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleMerge = async (candidate: MergeCandidateDto) => {
    if (!window.confirm(
      `Merge "${candidate.productBTitle}" into "${candidate.productATitle}"?\n\nThis will transfer all media and listings to Product A.`
    )) return;

    setActionLoading(candidate.id);
    try {
      const result = await whatsAppProductService.mergeProducts(
        candidate.productAId,
        candidate.productBId,
        candidate.id
      );
      setSnackbar({ open: true, message: result.message || 'Products merged successfully.', severity: 'success' });
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Merge failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (candidate: MergeCandidateDto) => {
    setActionLoading(candidate.id);
    try {
      const result = await whatsAppProductService.dismissMerge(candidate.id);
      setSnackbar({ open: true, message: result.message || 'Candidate dismissed.', severity: 'success' });
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Dismiss failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Box>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <CompareIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h4" fontWeight={700}>
              Merge Review
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Review visually similar products detected by perceptual hashing and approve or dismiss potential duplicates.
          </Typography>
        </Box>

        <Tooltip title="Refresh list">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCandidates}
            disabled={loading}
            id="btn-refresh-candidates"
          >
            Refresh
          </Button>
        </Tooltip>
      </Box>

      {/* ── Summary strip ── */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 4, display: 'flex', gap: 4, borderRadius: 2, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>{loading ? '—' : candidates.length}</Typography>
          <Typography variant="caption" color="text.secondary">Pending Review</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {loading ? '—' : candidates.filter((c) => c.similarityScore <= 2).length}
          </Typography>
          <Typography variant="caption" color="text.secondary">Near Identical</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {loading ? '—' : candidates.filter((c) => c.similarityScore >= 3).length}
          </Typography>
          <Typography variant="caption" color="text.secondary">Very Similar</Typography>
        </Box>
      </Paper>

      {/* ── Error State ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Loading ── */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Empty State ── */}
      {!loading && !error && candidates.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 12,
            gap: 2,
            color: 'text.secondary',
          }}
        >
          <DoneIcon sx={{ fontSize: 64, color: 'success.main' }} />
          <Typography variant="h6" fontWeight={600}>
            All caught up!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No merge candidates pending review. New duplicates will appear here as they are detected.
          </Typography>
        </Box>
      )}

      {/* ── Candidate Cards ── */}
      {!loading && (
        <Stack spacing={3}>
          {candidates.map((candidate) => {
            const distance = candidate.similarityScore;
            const pct = hammingToPercent(distance);
            const color = similarityColor(distance);
            const label = similarityLabel(distance);
            const isActing = actionLoading === candidate.id;

            return (
              <Paper
                key={candidate.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                {/* ── Card Header ── */}
                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'background.default',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chip
                      label={label}
                      color={color}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {pct}% visual similarity · Hamming distance {distance}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled">
                    Detected: {new Date(candidate.detectedAt).toLocaleString()}
                  </Typography>
                </Box>

                {/* ── Side-by-side product panels ── */}
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <ProductCard
                      label="A"
                      title={candidate.productATitle}
                      sku={candidate.productASku}
                      imagePath={candidate.productAImagePath}
                      mediaId={candidate.productAMediaId}
                      tenantId={tenantId}
                    />

                    {/* Center separator */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 1,
                        minWidth: 48,
                        color: 'text.disabled',
                      }}
                    >
                      <CompareIcon sx={{ fontSize: 32 }} />
                      <Typography variant="caption" sx={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: 10 }}>
                        vs
                      </Typography>
                    </Box>

                    <ProductCard
                      label="B"
                      title={candidate.productBTitle}
                      sku={candidate.productBSku}
                      imagePath={candidate.productBImagePath}
                      mediaId={candidate.productBMediaId}
                      tenantId={tenantId}
                    />
                  </Box>
                </Box>

                {/* ── Actions ── */}
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Button
                    id={`btn-dismiss-${candidate.id}`}
                    variant="outlined"
                    color="inherit"
                    startIcon={isActing ? <CircularProgress size={16} /> : <DismissIcon />}
                    onClick={() => handleDismiss(candidate)}
                    disabled={isActing}
                    sx={{ minWidth: 130 }}
                  >
                    {isActing ? 'Working…' : 'Not a Duplicate'}
                  </Button>

                  <Button
                    id={`btn-merge-${candidate.id}`}
                    variant="contained"
                    color={color === 'error' ? 'warning' : 'primary'}
                    startIcon={isActing ? <CircularProgress size={16} color="inherit" /> : <MergeIcon />}
                    onClick={() => handleMerge(candidate)}
                    disabled={isActing}
                    sx={{ minWidth: 130 }}
                  >
                    {isActing ? 'Working…' : 'Merge into A'}
                  </Button>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ── Toast Notifications ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MergesPage;
