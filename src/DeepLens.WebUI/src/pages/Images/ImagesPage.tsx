import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, CircularProgress, useTheme, useMediaQuery, Fade, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { mediaService, MediaDto } from '../../services/mediaService';
import { useAuth } from '../../contexts/AuthContext';

const ImagesPage = () => {
  const [mediaItems, setMediaItems] = useState<MediaDto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const observer = useRef<IntersectionObserver | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaDto | null>(null);

  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prevPage: number) => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const data = await mediaService.listMedia(page, 20, user?.tenantId);
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setMediaItems((prev: MediaDto[]) => {
            const existingIds = new Set(prev.map(item => item.id));
            const newItems = data.filter((item: MediaDto) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.error('Failed to fetch media', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [page, user?.tenantId]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Target row height for justified layout
  const rowHeight = isMobile ? 180 : isTablet ? 240 : 300;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
          Visual Catalog
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          Browse all tracked assets across vendors. Recently uploaded first.
        </Typography>
      </Box>

      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        '&:after': {
          content: '""',
          flexGrow: 999999,
        }
      }}>
        {mediaItems.map((item: MediaDto, index: number) => {
          // Use natural aspect ratio if available, otherwise fallback to 1:1
          const aspectRatio = (item.width && item.height) ? item.width / item.height : 1;
          const flexWidth = rowHeight * aspectRatio;
          const isVideo = item.mediaType === 2;

          return (
            <Fade in={true} timeout={500 + (index % 10) * 100} key={item.id}>
              <Box
                ref={index === mediaItems.length - 1 ? lastItemRef : null}
                sx={{
                  flexGrow: aspectRatio,
                  flexBasis: `${flexWidth}px`,
                  minWidth: isMobile ? 'calc(50% - 16px)' : 'auto',
                  height: rowHeight,
                  overflow: 'hidden',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    '& .overlay': { opacity: 1 },
                    '& .media-content': { transform: 'scale(1.08)' }
                  }
                }}
                onClick={() => setSelectedMedia(item)}
              >
                <Box className="media-content" sx={{ width: '100%', height: '100%', transition: 'transform 0.6s ease' }}>
                  <img
                    src={mediaService.getThumbnailUrl(item.id, user?.tenantId || '')}
                    alt={item.productTitle || 'Product'}
                    loading="lazy"
                    onMouseOver={(e) => {
                      if (isVideo && item.previewPath) {
                        e.currentTarget.src = mediaService.getPreviewUrl(item.id, user?.tenantId || '');
                      }
                    }}
                    onMouseOut={(e) => {
                      if (isVideo) {
                        e.currentTarget.src = mediaService.getThumbnailUrl(item.id, user?.tenantId || '');
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {isVideo && (
                    <Box sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(0,0,0,0.4)',
                      borderRadius: '50%',
                      width: 48,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                      pointerEvents: 'none'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </Box>
                  )}
                </Box>

                {/* Info Overlay */}
                <Box
                  className="overlay"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: 'white',
                    opacity: isMobile ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    height: '50%'
                  }}
                >
                  <Typography variant="caption" sx={{
                    fontWeight: 700,
                    color: 'primary.light',
                    textTransform: 'uppercase',
                    fontSize: '0.65rem',
                    letterSpacing: '1px'
                  }}>
                    {item.sku || 'PENDING SKU'}
                  </Typography>
                  <Typography variant="subtitle2" sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.productTitle || 'Catalog Item'}
                  </Typography>
                </Box>

                {/* Status Indicator */}
                {item.status === 2 && (
                  <Box sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    bgcolor: 'rgba(76, 175, 80, 0.9)',
                    color: 'white',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    backdropFilter: 'blur(4px)'
                  }}>
                    SMART INDEXED
                  </Box>
                )}
              </Box>
            </Fade>
          );
        })}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, gap: 2 }}>
          <CircularProgress size={40} thickness={4} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Syncing catalog...
          </Typography>
        </Box>
      )}

      {!hasMore && (
        <Box sx={{ mt: 10, mb: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            End of Collection
          </Typography>
          <Box sx={{ width: 40, height: 2, bgcolor: 'divider', mx: 'auto', mt: 1 }} />
        </Box>
      )}

      {/* Media Viewer Modal */}
      <Dialog
        fullScreen
        open={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            backgroundImage: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }
        }}
      >
        <IconButton
          onClick={() => setSelectedMedia(null)}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            zIndex: 10
          }}
        >
          <CloseIcon />
        </IconButton>

        {selectedMedia && (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}>
            {selectedMedia.mediaType === 2 ? (
              <video
                src={mediaService.getRawUrl(selectedMedia.id, user?.tenantId || '')}
                controls
                autoPlay
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 100px)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  borderRadius: '8px'
                }}
              />
            ) : (
              <img
                src={mediaService.getRawUrl(selectedMedia.id, user?.tenantId || '')}
                alt={selectedMedia.productTitle || ''}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 100px)',
                  objectFit: 'contain',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  borderRadius: '4px'
                }}
              />
            )}

            <Box sx={{ mt: 3, textAlign: 'center', color: 'white', maxWidth: 800 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedMedia.productTitle || 'Untitled Asset'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                SKU: {selectedMedia.sku || 'N/A'} • {selectedMedia.width}x{selectedMedia.height}
                {selectedMedia.durationSeconds && ` • ${selectedMedia.durationSeconds.toFixed(1)}s`}
              </Typography>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default ImagesPage;
