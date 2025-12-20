import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, CircularProgress, useTheme, useMediaQuery, Fade } from '@mui/material';
import { imageService, ImageDto } from '../../services/imageService';
import { useAuth } from '../../contexts/AuthContext';

const ImagesPage = () => {
  const [images, setImages] = useState<ImageDto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const observer = useRef<IntersectionObserver | null>(null);

  const lastImageRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const data = await imageService.listImages(page, 20, user?.tenantId);
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setImages(prev => {
            // Deduplicate if needed (though API should handle this)
            const existingIds = new Set(prev.map(img => img.id));
            const newImages = data.filter(img => !existingIds.has(img.id));
            return [...prev, ...newImages];
          });
        }
      } catch (err) {
        console.error('Failed to fetch images', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
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
        {images.map((image, index) => {
          // Use natural aspect ratio if available, otherwise fallback to 1:1
          const aspectRatio = (image.width && image.height) ? image.width / image.height : 1;
          const flexWidth = rowHeight * aspectRatio;

          return (
            <Fade in={true} timeout={500 + (index % 10) * 100} key={image.id}>
              <Box
                ref={index === images.length - 1 ? lastImageRef : null}
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
                    '& img': { transform: 'scale(1.08)' }
                  }
                }}
              >
                <img
                  src={imageService.getThumbnailUrl(image.id, user?.tenantId || '')}
                  alt={image.productTitle || 'Product'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.6s ease'
                  }}
                />

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
                    {image.sku || 'PENDING SKU'}
                  </Typography>
                  <Typography variant="subtitle2" sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {image.productTitle || 'Catalog Item'}
                  </Typography>
                </Box>

                {/* Status Indicator */}
                {image.status === 2 && (
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
          <Box sx={{ width: 40, h: 2, bgcolor: 'divider', mx: 'auto', mt: 1 }} />
        </Box>
      )}
    </Box>
  );
};

export default ImagesPage;
