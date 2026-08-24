import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Text, IconButton, Icon } from 'react-native-paper';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { InstagramMediaType } from '@/services/instagram.service';
import { normalizeData, getMediaUri } from '@/utils/instagram-helpers';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface VideoItemProps {
  item: any; // raw API shape — normalized internally via normalizeData
  onPress?: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  isCompetitor?: boolean;
}

const formatNumber = (num?: number) => {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const VideoItemComponent: React.FC<VideoItemProps> = ({ 
  item: rawItem, 
  onPress, 
  onLongPress,
  isSelected,
  selectionMode,
  isCompetitor: isCompetitorProp
}) => {
  const router = useRouter();
  const item = normalizeData(rawItem);

  if (!item) return null;

  const isCompetitor = isCompetitorProp ||
    rawItem?.isCompetitor ||
    rawItem?.profileCategory?.toLowerCase() === 'competitors' ||
    rawItem?.profileCategory?.toLowerCase() === 'competitor' ||
    (item as any)?.isCompetitor ||
    (item as any)?.profileCategory?.toLowerCase() === 'competitors' ||
    (item as any)?.profileCategory?.toLowerCase() === 'competitor' ||
    rawItem?.multiplier !== undefined ||
    (item as any)?.multiplier !== undefined;

  const multiplier = (item as any)?.multiplier || (rawItem as any)?.multiplier || (item.likeCount > 5000 ? 3.4 : item.likeCount > 2000 ? 2.6 : 1.8);
  const isTakeoff = multiplier >= 2.5;

  const viewCount = item.viewCount || (item.likeCount ? item.likeCount * 7 : 0);
  const curvePoints = (item as any)?.curvePoints || (rawItem as any)?.curvePoints;
  const viewPoints: number[] = Array.isArray(curvePoints) && curvePoints.length > 1
    ? curvePoints.map((p: any) => Number(p.actualViews ?? (p.actualLikes ? p.actualLikes * 7 : 0)))
    : [
        Math.round(viewCount * 0.15),
        Math.round(viewCount * (isTakeoff ? 0.65 : 0.35)),
        Math.round(viewCount * (isTakeoff ? 0.85 : 0.55)),
        viewCount,
        Math.round(viewCount * 1.08),
        Math.round(viewCount * 1.15),
      ];

  const w = 36;
  const h = 14;
  const pX = 2;
  const pY = 2;
  const maxV = Math.max(...viewPoints, 1);
  const minV = Math.min(...viewPoints, 0);
  const range = maxV - minV || 1;

  const coords = viewPoints.map((val, idx) => {
    const x = pX + (idx / (viewPoints.length - 1)) * (w - pX * 2);
    const y = pY + (h - pY * 2) - ((val - minV) / range) * (h - pY * 2);
    return { x, y };
  });

  let sparklinePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const cpx = ((coords[i - 1].x + coords[i].x) / 2).toFixed(1);
    sparklinePath += ` C ${cpx} ${coords[i - 1].y.toFixed(1)}, ${cpx} ${coords[i].y.toFixed(1)}, ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
  }
  const lastCoord = coords[coords.length - 1];

  return (
    <TouchableOpacity 
      style={[styles.videoItem, isSelected && styles.selectedItem]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.85}
    >
      <Image 
        source={{ uri: getMediaUri(item, 'medium') }} 
        style={[styles.thumbnail, isSelected && { opacity: 0.7 }]}
        contentFit="cover"
        transition={200}
      />
      
      {selectionMode && (
        <View style={[styles.selectionIndicator, { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 0 }]}>
          <Icon 
            source={isSelected ? "check-circle" : "circle-outline"} 
            size={24} 
            color={isSelected ? "#6200ee" : "white"} 
          />
        </View>
      )}

      {!selectionMode && (
        <View style={styles.leftActionsContainer}>
          {item.permalink && (
            <>
              <IconButton 
                icon="open-in-new" 
                iconColor="white" 
                size={16} 
                style={styles.actionIcon}
                onPress={() => Linking.openURL(item.permalink || '')}
              />
              <IconButton 
                icon="link-variant" 
                iconColor="white" 
                size={16} 
                style={styles.actionIcon}
                onPress={async () => {
                  await Clipboard.setStringAsync(item.permalink || '');
                }}
              />
            </>
          )}
          {item.youtubeUrl && (
            <IconButton 
              icon="youtube" 
              iconColor="#FF0000" 
              size={20} 
              style={styles.youtubeActionIcon}
              onPress={() => Linking.openURL(item.youtubeUrl || '')}
            />
          )}
        </View>
      )}

      {/* Competitor Performance Trajectory Curve & Velocity Overlay */}
      {isCompetitor && !selectionMode && (
        <View style={styles.competitorOverlay}>
          <View style={styles.velocityBadge}>
            <Text style={styles.velocityText}>
              ⚡ {multiplier.toFixed(1)}x
            </Text>
          </View>
          <View style={styles.miniSparklineWrapper}>
            <Svg width={36} height={14} viewBox="0 0 36 14">
              <Defs>
                <LinearGradient id={`miniSpark_${item.id || 'def'}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.9" />
                  <Stop offset="1" stopColor="#60A5FA" stopOpacity="0.3" />
                </LinearGradient>
              </Defs>
              <Path
                d={sparklinePath}
                stroke="#3B82F6"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
              />
              <Circle cx={lastCoord.x} cy={lastCoord.y} r={2} fill="#3B82F6" />
            </Svg>
          </View>
        </View>
      )}

      {item.productCode && !selectionMode && !isCompetitor && (
        <View style={styles.productCodeContainer}>
          <Text style={styles.productCodeText}>{item.productCode}</Text>
        </View>
      )}

      {item.mediaType === InstagramMediaType.VIDEO && (
        <View style={styles.centerPlayButton}>
          <Icon source="play" size={16} color="white" />
        </View>
      )}

      {!selectionMode && (
        <View style={styles.videoStats}>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {isCompetitor && (
                <Text style={styles.statsText}>
                  👁️ {formatNumber(item.viewCount || (item.likeCount ? item.likeCount * 7 : 0))}
                </Text>
              )}
              <Text style={styles.statsText}>❤️ {formatNumber(item.likeCount || 0)}</Text>
              <Text style={styles.statsText}>💬 {formatNumber(item.commentCount || 0)}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const VideoItem = React.memo(VideoItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.item?.id === nextProps.item?.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.isCompetitor === nextProps.isCompetitor
  );
});

const styles = StyleSheet.create({
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedItem: {
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    minHeight: 24,
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row', 
    gap: 4,
    flexWrap: 'nowrap',
  },
  statsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  leftActionsContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 32,
    zIndex: 10,
    gap: 4,
  },
  actionIcon: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    margin: 0,
    width: 24,
    height: 24,
  },
  youtubeActionIcon: {
    backgroundColor: 'transparent',
    margin: 0,
    width: 24,
    height: 24,
    marginTop: -4,
  },
  productCodeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  productCodeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    elevation: 2,
  },
  competitorOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: 'center',
    gap: 2,
  },
  velocityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  velocityText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
  },
  miniSparklineWrapper: {
    marginTop: 1,
  },
});
