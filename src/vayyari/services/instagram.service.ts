import { searchApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';
import type { InstagramLink } from '../utils/instagram-helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

export enum InstagramMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL_ALBUM = 'CAROUSEL_ALBUM',
  UNKNOWN = 'UNKNOWN'
}

export interface ProfileClassificationResult {
  username?: string;
  isCompetitor: boolean;
  profileCategory: string;
  competitorNiche?: string;
  niche?: string;
  confidenceScore?: number;
  confidence?: number;
  reasoning?: string;
  explanation?: string;
  suggestedNiches?: string[];
  message?: string;
  success?: boolean;
}

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followersCount: number;
  followingCount?: number;
  mediaCount: number;
  profilePictureUrl?: string;
  storagePath?: string;
  isActive: boolean;
  profileCategory: string;
  isCompetitor?: boolean;
  competitorNiche?: string;
  isDataDeleted: boolean;
  isPinned?: boolean;
  lastSyncedAt?: string;
  isInWatchlist?: boolean;
  storiesPostedLast24h?: number;
  isTracked?: boolean;
  niche?: string;
  breakoutCount?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  viewCount?: number;
}

export interface CompetitorProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followersCount: number;
  followingCount?: number;
  mediaCount: number;
  profilePictureUrl?: string;
  storagePath?: string;
  isActive: boolean;
  isTracked?: boolean;
  isCompetitor?: boolean;
  profileCategory?: string;
  competitorNiche?: string;
  niche?: string;
  lastSyncedAt?: string;
  breakoutCount?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  viewCount?: number;
}

export interface CompetitorsSummaryResponse {
  totalCompetitors: number;
  activeCount: number;
  totalLimit: number;
  breakoutsTodayCount: number;
  dayOneTakeoffsCount?: number;
  delayedSpikesCount?: number;
  lastUpdated?: string;
  profiles?: CompetitorProfile[];
}

export interface OutlierDataPoint {
  day: number;
  actualLikes: number;
  baselineLikes: number;
  actualViews?: number;
  baselineViews?: number;
  actualComments?: number;
  baselineComments?: number;
}

export interface HighPerformingCompetitorPost extends InstagramPost {
  watchlistId?: string;
  niche?: string;
  outlierType?: 'day_one_takeoff' | 'delayed_spike' | 'inspiration' | 'breakout' | string;
  multiplier: number;
  dayNumber: number;
  baselineAvgLikes?: number;
  baselineAvgViews?: number;
  baselineAvgComments?: number;
  currentLikes?: number;
  currentViews?: number;
  currentComments?: number;
  deltaLikes?: number;
  deltaViews?: number;
  deltaComments?: number;
  platformVideoId?: string;
  curvePoints?: OutlierDataPoint[];
  isFullMediaDownloaded?: boolean;
  postUrl?: string;
  permalink?: string;
}

export interface GetHighPerformingOptions {
  niche?: string;
  outlierType?: string;
  days?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'multiplier' | 'views' | 'likes' | 'comments' | 'velocity' | 'date' | string;
  sortOrder?: 'asc' | 'desc';
  minViews?: number;
}

export type HighPerformingParams = GetHighPerformingOptions;

export interface CompetitorProfileCurveResponse {
  profileId: string;
  postId?: string;
  points: OutlierDataPoint[];
  baselineAvgLikes: number;
  multiplier: number;
  dayNumber: number;
  growthCategory: 'day_one_takeoff' | 'delayed_spike' | 'steady' | 'normal' | string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  postUrl?: string;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  deltaLikes?: number;
  deltaViews?: number;
  deltaComments?: number;
  timestamp?: string;
  mediaType?: InstagramMediaType | string;
  mediaProductType?: string;
  storagePath?: string;
  productCode?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  status?: 'active' | 'suspend' | 'ignore';
  suspendUntil?: string;
  lastReviewedAt?: string;
  ownerUsername?: string;
  ownerProfilePictureUrl?: string;
  isStarred?: boolean;
  lastPostedAt?: string;
  rightSwipes?: number;
  leftSwipes?: number;
  shareCount?: number;
  sharedAt?: string;
  historyId?: string;
  platformVideoId?: string;
  isFullMediaDownloaded?: boolean;
  isCompetitor?: boolean;
  profileCategory?: string;
  multiplier?: number;
  outlierType?: string;
  dayNumber?: number;
  baselineAvgLikes?: number;
  baselineAvgViews?: number;
  baselineAvgComments?: number;
  curvePoints?: OutlierDataPoint[];
}

export interface ProfileMetrics {
  avgLikes: number;
  engagementRate: number;
  postFrequency: number;
}

export interface ProfileDetailsResponse {
  profile: {
    userId: string;
    username: string;
    name?: string;
    biography?: string;
    followersCount: number;
    followingCount: number;
    mediaCount: number;
    profilePictureUrl?: string;
    storagePath?: string;
    website?: string;
    isActive: boolean;
    isVerified: boolean;
    isBusiness: boolean;
    profileCategory: string;
    lastSyncedAt?: string;
    isDataDeleted: boolean;
  };
  videos: InstagramPost[];
  metrics: ProfileMetrics;
}

export interface SyncResult {
  message: string;
  profile: any;
  postCount: number;
  posts: InstagramPost[];
  newPosts?: number;
  engagementUpdated?: number;
  jobId?: string;
}

export interface TokenHealth {
  lastRefreshed: string;
  expiresAt: string;
  daysRemaining: number;
  needsRefresh: boolean;
  isExpired: boolean;
}

export interface ScraperJob {
  id: string;
  username: string;
  jobType: string;
  status: string;
  targetCount: number;
  scrapedCount: number;
  priority: number;
  nextRunAt?: string;
  completedAt?: string;
  origin?: string;
}

export interface MetaQuotaInfo {
  requestsInLastHour: number;
  estimatedRemainingRequests: number;
  metrics: {
    callCount: number;
    totalCpuTime: number;
    totalTime: number;
  };
  lastUpdated: string;
}

// ── Data Normalization ────────────────────────────────────────────────────────

export const mapToMediaType = (rawType: any): InstagramMediaType => {
  if (rawType === undefined || rawType === null) return InstagramMediaType.UNKNOWN;
  const typeStr = rawType.toString().toUpperCase();

  if (typeStr === 'VIDEO' || typeStr === 'REEL' || typeStr === '2' || typeStr === '10' || rawType === 2 || rawType === 10) {
      return InstagramMediaType.VIDEO;
  }
  if (typeStr === 'IMAGE' || typeStr === '1' || rawType === 1) {
      return InstagramMediaType.IMAGE;
  }
  if (typeStr === 'CAROUSEL_ALBUM' || typeStr === 'CAROUSEL' || typeStr === '8' || rawType === 8) {
      return InstagramMediaType.CAROUSEL_ALBUM;
  }
  return InstagramMediaType.UNKNOWN;
};

export const normalizeProfile = (data: any): InstagramProfile => {
  if (!data) return {} as InstagramProfile;
  const followers = data.followersCount || data.FollowersCount || 0;
  const avgLikes = data.avgLikes || data.AvgLikes || (followers ? Math.round(followers * 0.04) : 0);
  const avgComments = data.avgComments || data.AvgComments || (avgLikes ? Math.round(avgLikes * 0.03) : 0);
  const avgViews = data.avgViews || data.AvgViews || (avgLikes ? avgLikes * 8 : (followers ? Math.round(followers * 0.35) : 0));
  const viewCount = data.viewCount || data.ViewCount || avgViews;
  const profileCategory = data.profileCategory || data.ProfileCategory || data.category || data.Category || 'Competitors';
  const competitorNiche = data.competitorNiche || data.CompetitorNiche || data.niche || data.Niche;
  const isCompetitor = data.isCompetitor !== undefined
    ? data.isCompetitor
    : (profileCategory?.toLowerCase() === 'competitors' || profileCategory?.toLowerCase() === 'competitor');

  return {
      ...data,
      id: data.id || data.Id || data.userId || data.UserId,
      username: data.username || data.Username,
      name: data.name || data.Name,
      biography: data.biography || data.Biography,
      followersCount: followers,
      followingCount: data.followingCount || data.FollowingCount || 0,
      mediaCount: data.mediaCount || data.MediaCount || 0,
      profilePictureUrl: data.profilePictureUrl || data.ProfilePictureUrl,
      storagePath: data.storagePath || data.StoragePath,
      isPinned: data.isPinned !== undefined ? data.isPinned : data.IsPinned,
      lastSyncedAt: data.lastSyncedAt || data.LastSyncedAt || data.lastScrapedAt || data.LastScrapedAt,
      storiesPostedLast24h: data.storiesPostedLast24h !== undefined ? data.storiesPostedLast24h : (data.StoriesPostedLast24h || 0),
      isTracked: data.isTracked !== undefined ? data.isTracked : (data.IsTracked ?? data.isActive ?? data.IsActive ?? true),
      isCompetitor,
      profileCategory,
      competitorNiche,
      niche: competitorNiche || profileCategory,
      breakoutCount: data.breakoutCount || data.BreakoutCount || 0,
      avgLikes,
      avgComments,
      avgViews,
      viewCount,
  };
};

export const normalizeCompetitorProfile = (data: any): CompetitorProfile => {
  if (!data) return {} as CompetitorProfile;
  const followers = data.followersCount || data.FollowersCount || 0;
  const avgLikes = data.avgLikes || data.AvgLikes || (followers ? Math.round(followers * 0.04) : 0);
  const avgComments = data.avgComments || data.AvgComments || (avgLikes ? Math.round(avgLikes * 0.03) : 0);
  const avgViews = data.avgViews || data.AvgViews || (avgLikes ? avgLikes * 8 : (followers ? Math.round(followers * 0.35) : 0));
  const viewCount = data.viewCount || data.ViewCount || avgViews;
  const profileCategory = data.profileCategory || data.ProfileCategory || data.category || data.Category || 'Competitors';
  const competitorNiche = data.competitorNiche || data.CompetitorNiche || data.niche || data.Niche;
  const isCompetitor = data.isCompetitor !== undefined
    ? data.isCompetitor
    : (profileCategory?.toLowerCase() === 'competitors' || profileCategory?.toLowerCase() === 'competitor');

  return {
      id: data.id || data.Id || data.userId || data.UserId,
      username: data.username || data.Username || '',
      name: data.name || data.Name || '',
      biography: data.biography || data.Biography,
      followersCount: followers,
      followingCount: data.followingCount || data.FollowingCount || 0,
      mediaCount: data.mediaCount || data.MediaCount || 0,
      profilePictureUrl: data.profilePictureUrl || data.ProfilePictureUrl || data.profile_pic_url || data.profilepicurl,
      storagePath: data.storagePath || data.StoragePath || data.storagepath || data.storage_path,
      isActive: data.isActive !== undefined ? data.isActive : (data.IsActive ?? true),
      isTracked: data.isTracked !== undefined ? data.isTracked : (data.IsTracked ?? (data.isActive !== undefined ? data.isActive : (data.IsActive ?? true))),
      isCompetitor,
      profileCategory,
      competitorNiche,
      niche: competitorNiche || profileCategory,
      lastSyncedAt: data.lastSyncedAt || data.LastSyncedAt || data.lastScrapedAt || data.LastScrapedAt,
      breakoutCount: data.breakoutCount || data.BreakoutCount || 0,
      avgLikes,
      avgComments,
      avgViews,
      viewCount,
  };
};

export const normalizeData = (data: any): InstagramPost => {
  if (!data) return {} as InstagramPost;
  const id = data.postId || data.id || data.Id || data.platformId || data.PlatformId || data.postid;
  const rawMediaType = data.mediaType !== undefined ? data.mediaType : (data.MediaType !== undefined ? data.MediaType : (data.mediatype !== undefined ? data.mediatype : data.media_type));
  const mediaType = mapToMediaType(rawMediaType);
  const storagePath = data.storagePath || data.StoragePath || data.storagepath || data.storage_path;
  const thumbnailUrl = data.thumbnailUrl || data.ThumbnailUrl || data.thumbnailurl || data.thumbnail_url;
  const mediaUrl = data.mediaUrl || data.MediaUrl || data.mediaurl || data.media_url;
  const postUrl = data.postUrl || data.PostUrl || data.permalink || data.Permalink || data.url || data.Url || data.post_url || data.posturl;
  const permalink = postUrl;
  const platformVideoId = data.platformVideoId || data.PlatformVideoId || data.id || data.Id || data.platformId || data.PlatformId || data.platformvideoid;
  const ownerUsername = data.profileUsername || data.ownerUsername || data.OwnerUsername || data.username || data.Username || data.ownerusername || data.profileusername;
  const ownerProfilePictureUrl = data.profilePicUrl || data.profilePicStoragePath || data.ownerProfilePictureUrl || data.OwnerProfilePictureUrl || data.profilePictureUrl || data.ProfilePictureUrl || data.profilepicurl || data.profilepicstoragepath;
  const isFullMediaDownloaded = data.isFullMediaDownloaded !== undefined ? data.isFullMediaDownloaded : (data.IsFullMediaDownloaded !== undefined ? data.IsFullMediaDownloaded : data.isfullmediadownloaded);
  const likeCount = Number(data.likeCount || data.LikeCount || data.likecount || data.like_count || 0);
  const commentCount = Number(data.commentCount || data.CommentCount || data.commentcount || data.comment_count || 0);
  const viewCount = Number(data.viewCount || data.ViewCount || data.viewcount || data.views || data.playCount || data.PlayCount || (likeCount ? likeCount * 7 : 0));
  const isCompetitor = data.isCompetitor !== undefined ? data.isCompetitor : (data.profileCategory === 'Competitors' || data.profileCategory === 'Competitor' || (data.multiplier !== undefined && data.multiplier > 1));
  const dayNumber = data.dayOffset ?? data.dayNumber ?? data.DayNumber ?? 1;
  const multiplier = Number(data.outlierScore ?? data.viralityMultiplier ?? data.multiplier ?? data.Multiplier ?? 1.0);
  const baselineAvgViews = Number(data.profileBaselineViews ?? data.nicheBaselineViews ?? data.baselineAvgViews ?? data.BaselineAvgViews ?? 0);
  const baselineAvgLikes = Number(data.profileBaselineLikes ?? data.nicheBaselineLikes ?? data.baselineAvgLikes ?? data.BaselineAvgLikes ?? 0);
  const baselineAvgComments = Number(data.baselineAvgComments ?? data.BaselineAvgComments ?? Math.round(((data.profileBaselineLikes ?? data.nicheBaselineLikes ?? baselineAvgLikes) || 0) * 0.035));

  let outlierType: string;
  if (data.isDay1Breakout || data.breakoutArchetype === 'day_one_breakout' || data.breakoutArchetype === 'day_one_takeoff') {
    outlierType = 'day_one_takeoff';
  } else if (data.isDelayedBreakout || data.breakoutArchetype === 'delayed_breakout' || data.breakoutArchetype === 'delayed_spike') {
    outlierType = 'delayed_spike';
  } else if (data.isInspirationCandidate) {
    outlierType = 'inspiration';
  } else if (data.outlierType || data.OutlierType) {
    outlierType = data.outlierType || data.OutlierType;
  } else {
    outlierType = 'all';
  }

  const rawTrajectory = data.trajectory || data.Trajectory || data.curvePoints || data.CurvePoints;
  const curvePoints: OutlierDataPoint[] = Array.isArray(rawTrajectory) && rawTrajectory.length > 0
    ? rawTrajectory.map((t: any) => ({
        day: t.dayOffset ?? t.DayOffset ?? t.day ?? 0,
        actualViews: Number(t.cumulativeViews ?? t.CumulativeViews ?? t.actualViews ?? 0),
        actualLikes: Number(t.cumulativeLikes ?? t.CumulativeLikes ?? t.actualLikes ?? 0),
        actualComments: Number(t.cumulativeComments ?? t.CumulativeComments ?? t.actualComments ?? Math.round((t.cumulativeLikes || t.CumulativeLikes || 0) * 0.035)),
        baselineViews: Number(t.baselineMedianViews ?? t.BaselineMedianViews ?? t.baselineViews ?? 0),
        baselineLikes: Number(t.baselineMedianLikes ?? t.BaselineMedianLikes ?? t.baselineLikes ?? Math.round((t.baselineMedianViews || t.BaselineMedianViews || 0) * 0.1)),
        baselineComments: Number(t.baselineMedianComments ?? t.BaselineMedianComments ?? t.baselineComments ?? Math.round((t.baselineMedianLikes || t.BaselineMedianLikes || 0) * 0.035)),
      }))
    : [
        { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
        { day: 1, actualLikes: Math.round(likeCount * (dayNumber === 1 ? 0.7 : 0.2)), baselineLikes: Math.round(baselineAvgLikes * 0.3), actualViews: Math.round(viewCount * (dayNumber === 1 ? 0.7 : 0.2)), baselineViews: Math.round(baselineAvgViews * 0.3), actualComments: Math.round(commentCount * (dayNumber === 1 ? 0.7 : 0.2)), baselineComments: Math.round(baselineAvgComments * 0.3) },
        { day: 2, actualLikes: Math.round(likeCount * (dayNumber === 1 ? 0.9 : 0.4)), baselineLikes: Math.round(baselineAvgLikes * 0.5), actualViews: Math.round(viewCount * (dayNumber === 1 ? 0.9 : 0.4)), baselineViews: Math.round(baselineAvgViews * 0.5), actualComments: Math.round(commentCount * (dayNumber === 1 ? 0.9 : 0.4)), baselineComments: Math.round(baselineAvgComments * 0.5) },
        { day: 3, actualLikes: likeCount, baselineLikes: Math.round(baselineAvgLikes * 0.7), actualViews: viewCount, baselineViews: Math.round(baselineAvgViews * 0.7), actualComments: commentCount, baselineComments: Math.round(baselineAvgComments * 0.7) },
        { day: 5, actualLikes: Math.round(likeCount * 1.1), baselineLikes: Math.round(baselineAvgLikes * 0.85), actualViews: Math.round(viewCount * 1.1), baselineViews: Math.round(baselineAvgViews * 0.85), actualComments: Math.round(commentCount * 1.1), baselineComments: Math.round(baselineAvgComments * 0.85) },
        { day: 7, actualLikes: Math.round(likeCount * 1.15), baselineLikes: baselineAvgLikes, actualViews: Math.round(viewCount * 1.15), baselineViews: baselineAvgViews, actualComments: Math.round(commentCount * 1.15), baselineComments: baselineAvgComments },
      ];

  return {
      ...data,
      id,
      mediaType,
      storagePath,
      thumbnailUrl,
      mediaUrl,
      permalink,
      postUrl,
      ownerUsername,
      ownerProfilePictureUrl,
      likeCount,
      commentCount,
      viewCount,
      deltaLikes: data.deltaLikes ?? data.DeltaLikes,
      deltaViews: data.deltaViews ?? data.DeltaViews,
      deltaComments: data.deltaComments ?? data.DeltaComments,
      caption: data.caption || data.Caption || data.description || data.title,
      productCode: data.productCode || data.ProductCode,
      youtubeVideoId: data.youtubeVideoId || data.YoutubeVideoId,
      youtubeUrl: data.youtubeUrl || data.YoutubeUrl,
      isStarred: data.isStarred !== undefined ? data.isStarred : (data.IsStarred !== undefined ? data.IsStarred : (data.isstarred !== undefined ? data.isstarred : data.is_starred)),
      lastPostedAt: data.lastPostedAt || data.LastPostedAt || data.lastpostedat || data.last_posted_at,
      rightSwipes: data.rightSwipes ?? data.RightSwipes ?? data.rightswipes ?? data.right_swipes ?? 0,
      leftSwipes: data.leftSwipes ?? data.LeftSwipes ?? data.leftswipes ?? data.left_swipes ?? 0,
      shareCount: data.shareCount ?? data.ShareCount ?? data.sharecount ?? data.share_count ?? 0,
      historyId: data.historyId || data.HistoryId || data.historyid || data.history_id,
      platformVideoId,
      isFullMediaDownloaded,
      isCompetitor,
      profileCategory: data.profileCategory || data.ProfileCategory,
      multiplier,
      dayNumber,
      outlierType,
      baselineAvgLikes,
      baselineAvgViews,
      baselineAvgComments,
      curvePoints,
  };
};

export const normalizeHighPerformingPost = (item: any): HighPerformingCompetitorPost => {
  const base = normalizeData(item);
  const multiplier = Number(item.outlierScore ?? item.viralityMultiplier ?? item.multiplier ?? item.Multiplier ?? base.multiplier ?? 1.0);
  const dayNumber = item.dayOffset ?? item.dayNumber ?? item.DayNumber ?? base.dayNumber ?? 1;

  let outlierType: string;
  if (item.isDay1Breakout || item.breakoutArchetype === 'day_one_breakout' || item.breakoutArchetype === 'day_one_takeoff') {
    outlierType = 'day_one_takeoff';
  } else if (item.isDelayedBreakout || item.breakoutArchetype === 'delayed_breakout' || item.breakoutArchetype === 'delayed_spike') {
    outlierType = 'delayed_spike';
  } else if (item.isInspirationCandidate) {
    outlierType = 'inspiration';
  } else if (item.outlierType || item.OutlierType || (base.outlierType && base.outlierType !== 'all')) {
    outlierType = item.outlierType || item.OutlierType || base.outlierType;
  } else {
    outlierType = dayNumber <= 1 ? 'day_one_takeoff' : 'delayed_spike';
  }

  const likeCount = base.likeCount || 0;
  const commentCount = base.commentCount || 0;
  const viewCount = base.viewCount || (likeCount ? likeCount * 7 : 0);

  const baselineAvgLikes = Number(item.profileBaselineLikes ?? item.nicheBaselineLikes ?? item.baselineAvgLikes ?? item.BaselineAvgLikes ?? base.baselineAvgLikes ?? (multiplier > 0 ? Math.round(likeCount / multiplier) : 0));
  const baselineAvgViews = Number(item.profileBaselineViews ?? item.nicheBaselineViews ?? item.baselineAvgViews ?? item.BaselineAvgViews ?? base.baselineAvgViews ?? (multiplier > 0 ? Math.round(viewCount / multiplier) : 0));
  const baselineAvgComments = Number(item.baselineAvgComments ?? item.BaselineAvgComments ?? base.baselineAvgComments ?? Math.round((baselineAvgLikes || 0) * 0.035));

  const deltaLikes = item.deltaLikes ?? item.DeltaLikes ?? (likeCount - baselineAvgLikes);
  const deltaViews = item.deltaViews ?? item.DeltaViews ?? (viewCount - baselineAvgViews);
  const deltaComments = item.deltaComments ?? item.DeltaComments ?? (commentCount - baselineAvgComments);

  const rawTrajectory = item.trajectory || item.Trajectory || item.curvePoints || item.CurvePoints || base.curvePoints;
  const curvePoints: OutlierDataPoint[] = Array.isArray(rawTrajectory) && rawTrajectory.length > 0
    ? rawTrajectory.map((t: any) => ({
        day: t.dayOffset ?? t.DayOffset ?? t.day ?? 0,
        actualViews: Number(t.cumulativeViews ?? t.CumulativeViews ?? t.actualViews ?? 0),
        actualLikes: Number(t.cumulativeLikes ?? t.CumulativeLikes ?? t.actualLikes ?? 0),
        actualComments: Number(t.cumulativeComments ?? t.CumulativeComments ?? t.actualComments ?? Math.round((t.cumulativeLikes || t.CumulativeLikes || 0) * 0.035)),
        baselineViews: Number(t.baselineMedianViews ?? t.BaselineMedianViews ?? t.baselineViews ?? 0),
        baselineLikes: Number(t.baselineMedianLikes ?? t.BaselineMedianLikes ?? t.baselineLikes ?? Math.round((t.baselineMedianViews || t.BaselineMedianViews || 0) * 0.1)),
        baselineComments: Number(t.baselineMedianComments ?? t.BaselineMedianComments ?? t.baselineComments ?? Math.round((t.baselineMedianLikes || t.BaselineMedianLikes || 0) * 0.035)),
      }))
    : base.curvePoints || [
        { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
        { day: 1, actualLikes: Math.round(likeCount * (dayNumber === 1 ? 0.7 : 0.2)), baselineLikes: Math.round(baselineAvgLikes * 0.3), actualViews: Math.round(viewCount * (dayNumber === 1 ? 0.7 : 0.2)), baselineViews: Math.round(baselineAvgViews * 0.3), actualComments: Math.round(commentCount * (dayNumber === 1 ? 0.7 : 0.2)), baselineComments: Math.round(baselineAvgComments * 0.3) },
        { day: 2, actualLikes: Math.round(likeCount * (dayNumber === 1 ? 0.9 : 0.4)), baselineLikes: Math.round(baselineAvgLikes * 0.5), actualViews: Math.round(viewCount * (dayNumber === 1 ? 0.9 : 0.4)), baselineViews: Math.round(baselineAvgViews * 0.5), actualComments: Math.round(commentCount * (dayNumber === 1 ? 0.9 : 0.4)), baselineComments: Math.round(baselineAvgComments * 0.5) },
        { day: 3, actualLikes: likeCount, baselineLikes: Math.round(baselineAvgLikes * 0.7), actualViews: viewCount, baselineViews: Math.round(baselineAvgViews * 0.7), actualComments: commentCount, baselineComments: Math.round(baselineAvgComments * 0.7) },
        { day: 5, actualLikes: Math.round(likeCount * 1.1), baselineLikes: Math.round(baselineAvgLikes * 0.85), actualViews: Math.round(viewCount * 1.1), baselineViews: Math.round(baselineAvgViews * 0.85), actualComments: Math.round(commentCount * 1.1), baselineComments: Math.round(baselineAvgComments * 0.85) },
        { day: 7, actualLikes: Math.round(likeCount * 1.15), baselineLikes: baselineAvgLikes, actualViews: Math.round(viewCount * 1.15), baselineViews: baselineAvgViews, actualComments: Math.round(commentCount * 1.15), baselineComments: baselineAvgComments },
      ];

  const ownerUsername = item.profileUsername || item.ownerUsername || item.OwnerUsername || item.username || item.Username || base.ownerUsername;
  const ownerProfilePictureUrl = item.profilePicUrl || item.profilePicStoragePath || item.ownerProfilePictureUrl || item.OwnerProfilePictureUrl || item.profilePictureUrl || item.ProfilePictureUrl || base.ownerProfilePictureUrl;

  return {
    ...base,
    id: item.postId || item.id || item.Id || base.id,
    ownerUsername,
    ownerProfilePictureUrl,
    likeCount,
    commentCount,
    viewCount,
    deltaLikes,
    deltaViews,
    deltaComments,
    baselineAvgLikes,
    baselineAvgViews,
    baselineAvgComments,
    currentLikes: item.currentLikes ?? item.CurrentLikes ?? likeCount,
    currentViews: item.currentViews ?? item.CurrentViews ?? viewCount,
    currentComments: item.currentComments ?? item.CurrentComments ?? commentCount,
    watchlistId: item.watchlistId || item.WatchlistId,
    niche: item.niche || item.Niche,
    outlierType,
    multiplier,
    dayNumber,
    platformVideoId: item.platformVideoId || item.PlatformVideoId || item.id || item.Id || base.platformVideoId || base.id,
    curvePoints,
    isFullMediaDownloaded: item.isFullMediaDownloaded ?? item.IsFullMediaDownloaded ?? base.isFullMediaDownloaded,
    postUrl: item.postUrl || item.PostUrl || item.permalink || item.Permalink || item.url || item.Url || item.post_url || base.postUrl,
    permalink: item.postUrl || item.PostUrl || item.permalink || item.Permalink || item.url || item.Url || item.post_url || base.permalink,
    isCompetitor: true,
  };
};

export const transformOutlier = normalizeHighPerformingPost;

// ── Service ───────────────────────────────────────────────────────────────────

class InstagramService {
  private _lastFetchedPosts: InstagramPost[] = [];

  setLastFetchedPosts(posts: InstagramPost[]) {
    this._lastFetchedPosts = posts;
  }

  getLastFetchedPosts(): InstagramPost[] {
    return this._lastFetchedPosts;
  }

  // ── Watchlist Management ────────────────────────────────────────────────────

  getWatchlist = async (): Promise<InstagramProfile[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta');
    return raw ? raw.map(normalizeProfile) : [];
  };

  getRecentStories = async (profileId: string): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/watchlist/${profileId}/recent-stories`);
    return raw ? raw.map(normalizeData) : [];
  };

  getProfileDetails = async (username: string, sortBy = 'date', sortOrder = 'desc', fromDate?: string, toDate?: string, limit = 100, offset = 0): Promise<ProfileDetailsResponse> => {
    let url = `/api/v1/Insta/profile/${username}?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=${limit}&offset=${offset}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return searchApiClient.get<ProfileDetailsResponse>(url);
  };

  addToWatchlist = async (username: string, options?: { isActive?: boolean; profileCategory?: string }): Promise<{ message: string; profile: InstagramProfile }> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}`, options);
  };

  removeFromWatchlist = async (username: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/profile/${username}`);
  };

  deleteProfileData = async (username: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/profile/${username}/data`);
  };

  // ── On-Demand Sync (Graph API) ──────────────────────────────────────────────

  syncProfile = async (username: string, maxPosts = 50, options?: { isActive?: boolean; profileCategory?: string }): Promise<SyncResult> => {
    return searchApiClient.post<SyncResult>(`/api/v1/Insta/profile/${username}/sync?maxPosts=${maxPosts}`, options);
  };

  // ── Token Management ────────────────────────────────────────────────────────

  getTokenHealth = async (): Promise<TokenHealth> => {
    return searchApiClient.get<TokenHealth>('/api/v1/Insta/token');
  };

  refreshToken = async (): Promise<{ message: string; health: TokenHealth }> => {
    return searchApiClient.post('/api/v1/Insta/token/refresh');
  };

  exchangeToken = async (shortLivedToken: string, appId?: string, appSecret?: string): Promise<{ message: string; token: string }> => {
    return searchApiClient.post('/api/v1/Insta/token/exchange', { shortLivedToken, appId, appSecret });
  };

  getQuota = async (): Promise<MetaQuotaInfo> => {
    return searchApiClient.get<MetaQuotaInfo>('/api/v1/Insta/quota');
  };


  // ── Configuration Management ────────────────────────────────────────────────

  getConfigurations = async (): Promise<any[]> => {
    return searchApiClient.get<any[]>("/api/v1/Insta/config");
  };

  createConfiguration = async (config: any): Promise<any> => {
    return searchApiClient.post("/api/v1/Insta/config", config);
  };

  updateConfiguration = async (id: string, config: any): Promise<void> => {
    return searchApiClient.put(`/api/v1/Insta/config/${id}`, config);
  };

  deleteConfiguration = async (id: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/config/${id}`);
  };

  setDefaultConfiguration = async (id: string): Promise<void> => {
    return searchApiClient.post(`/api/v1/Insta/config/${id}/default`, {});
  };
  // ── Job & Queue Management ──────────────────────────────────────────────────

  getActiveJobs = async (): Promise<ScraperJob[]> => {
    return searchApiClient.get<ScraperJob[]>('/api/v1/Insta/jobs/active');
  };

  getJobHistory = async (): Promise<ScraperJob[]> => {
    return searchApiClient.get<ScraperJob[]>('/api/v1/Insta/jobs/history');
  };

  createJob = async (payload: any): Promise<void> => {
    return searchApiClient.post('/api/v1/Insta/jobs', payload);
  };

  updateJob = async (id: string, payload: any): Promise<void> => {
    return searchApiClient.patch(`/api/v1/Insta/jobs/${id}`, payload);
  };

  getJobLogs = async (jobId: string): Promise<any[]> => {
    return searchApiClient.get<any[]>(`/api/v1/Insta/jobs/${jobId}/logs`);
  };

  toggleWatchStatus = async (username: string, active: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/watchlist/toggle?username=${username}&active=${active}`, {});
  };

  setProfileCategory = async (username: string, category: string): Promise<any> => {
    return searchApiClient.post(API_ROUTES.INSTAGRAM.SET_CATEGORY(username, category), {});
  };

  togglePinStatus = async (username: string, isPinned: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}/toggle-pin?isPinned=${isPinned}`, {});
  };

  deleteJob = async (id: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/jobs/${id}`);
  };

  healQueue = async (): Promise<void> => {
    return searchApiClient.post('/api/v1/Insta/jobs/heal');
  };

  lookupPost = async (url: string): Promise<InstagramPost> => {
    return searchApiClient.get<InstagramPost>(`/api/v1/Insta/video/lookup?url=${encodeURIComponent(url)}`);
  };

  getVideoDetails = async (id: string): Promise<InstagramPost> => {
    return searchApiClient.get<InstagramPost>(`/api/v1/Insta/video/${id}`);
  };

  updateVideoStatus = async (id: string, payload: { status?: 'active' | 'suspend' | 'ignore'; suspendDays?: number; lastReviewedAt?: string }): Promise<{ success: boolean }> => {
    return searchApiClient.patch(`/api/v1/Insta/video/${id}`, payload);
  };

  getSuspendedVideos = async (): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta/videos/suspended');
    return raw ? raw.map(normalizeData) : [];
  };

  getIgnoredVideos = async (): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta/videos/ignored');
    return raw ? raw.map(normalizeData) : [];
  };

  getOwnAccountsVideos = async (sortBy = 'date', sortOrder = 'desc', limit = 100, offset = 0, search?: string): Promise<InstagramPost[]> => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/own-accounts/videos?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=${limit}&offset=${offset}${searchParam}`);
    return raw ? raw.map(normalizeData) : [];
  };



  getPostMedia = async (id: string): Promise<InstagramPost[]> => {
    return searchApiClient.get<InstagramPost[]>(`/api/v1/Insta/video/${id}/media`);
  };

  getInstagramLinksAsync = async (id: string): Promise<InstagramLink[]> => {
    return searchApiClient.get<InstagramLink[]>(`/api/v1/products/instagram/${id}/links`);
  };

  unlinkInstagramPostAsync = async (postId: string, productId: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/products/instagram/${postId}/links/${productId}`);
  };

  refreshPostMedia = async (id: string): Promise<{ message: string }> => {
    return searchApiClient.post(`/api/v1/Insta/video/${id}/refresh`);
  };

  updateYoutubeStatus = async (id: string, data: any): Promise<void> => {
    return searchApiClient.post(`/api/v1/Insta/video/${id}/youtube`, data);
  };

  syncPostComments = async (competitorVideoId: string, accessToken: string, deepSync = false): Promise<void> => {
    return searchApiClient.post(`/api/v1/Insta/video/${competitorVideoId}/comments/sync`, { accessToken, deepSync });
  };

  /**
   * Gets list of synchronized comments for a specific post.
   */
  getPostComments = async (competitorVideoId: string): Promise<InstagramComment[]> => {
    return searchApiClient.get<InstagramComment[]>(`/api/v1/Insta/video/${competitorVideoId}/comments`);
  };

  // ── Story Planner ─────────────────────────────────────────────────────────

  getStoryGroups = async (search?: string): Promise<StoryGroup[]> => {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/story-groups${searchParam}`);
    return raw.map(g => ({
      ...g,
      posts: g.posts ? g.posts.map(normalizeData) : []
    })) as StoryGroup[];
  };

  getStoryGroup = async (id: string): Promise<StoryGroup> => {
    const raw = await searchApiClient.get<any>(`/api/v1/Insta/story-groups/${id}`);
    return {
      ...raw,
      posts: raw.posts ? raw.posts.map(normalizeData) : []
    } as StoryGroup;
  };

  createStoryGroup = async (payload: CreateStoryGroupPayload): Promise<{ success: boolean; groupId: string }> => {
    return searchApiClient.post('/api/v1/Insta/story-groups', payload);
  };

  updateStoryGroup = async (id: string, payload: UpdateStoryGroupPayload): Promise<{ success: boolean }> => {
    return searchApiClient.patch(`/api/v1/Insta/story-groups/${id}`, payload);
  };

  renewStoryGroup = async (id: string): Promise<{ success: boolean }> => {
    return searchApiClient.post(`/api/v1/Insta/story-groups/${id}/renew`, {});
  };

  mergeStoryGroups = async (group1Id: string, group2Id: string): Promise<{ success: boolean; parentGroupId: string; mergedGroupId: string }> => {
    return searchApiClient.post('/api/v1/Insta/story-groups/merge', { group1Id, group2Id });
  };

  deleteStoryGroup = async (id: string): Promise<{ success: boolean }> => {
    return searchApiClient.delete(`/api/v1/Insta/story-groups/${id}`);
  };

  markGroupPosted = async (id: string, targetWatchlistId: string): Promise<{ success: boolean; historyId: string }> => {
    return searchApiClient.post(`/api/v1/Insta/story-groups/${id}/post?targetWatchlistId=${targetWatchlistId}`, {});
  };

  markPostPosted = async (id: string, targetWatchlistId: string, groupId?: string): Promise<{ success: boolean; historyId: string }> => {
    const groupParam = groupId ? `&groupId=${groupId}` : '';
    return searchApiClient.post(`/api/v1/Insta/story-posts/${id}/post?targetWatchlistId=${targetWatchlistId}${groupParam}`, {});
  };

  queueForStory = async (id: string, targetWatchlistId: string, groupId?: string): Promise<{ success: boolean; historyId: string; duplicate?: boolean }> => {
    const groupParam = groupId ? `&groupId=${groupId}` : '';
    return searchApiClient.post(`/api/v1/Insta/story-posts/${id}/queue?targetWatchlistId=${targetWatchlistId}${groupParam}`, {});
  };

  removeFromStoryQueue = async (historyId: string): Promise<{ success: boolean }> => {
    return searchApiClient.delete(`/api/v1/Insta/story-queue/${historyId}`);
  };

  getStoryQueue = async (targetWatchlistId: string): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/story-queue/${targetWatchlistId}`);
    return raw ? raw.map(normalizeData) : [];
  };

  finishStoryGroup = async (id: string, targetWatchlistId: string): Promise<{ success: boolean }> => {
    return searchApiClient.post(`/api/v1/Insta/story-groups/${id}/finish?targetWatchlistId=${targetWatchlistId}`, {});
  };

  getEligibleShares = async (targetWatchlistId: string, limit = 50, offset = 0): Promise<{ items: UnifiedPlannerItem[]; totalCount: number }> => {
    const raw = await searchApiClient.get<{ items: any[]; totalCount: number }>(
      `/api/v1/Insta/story-planner/eligible/${targetWatchlistId}?limit=${limit}&offset=${offset}`
    );
    const items = ((raw && raw.items) || []).map(item => {
      if (item.type === 'post' && item.post) {
        return {
          ...item,
          post: normalizeData(item.post)
        };
      } else if (item.type === 'group' && item.group) {
        return {
          ...item,
          group: {
            ...item.group,
            posts: item.group.posts ? item.group.posts.map(normalizeData) : []
          }
        };
      }
      return item;
    }) as UnifiedPlannerItem[];
    return {
      items,
      totalCount: raw?.totalCount || 0
    };
  };

  getPendingSwipeCards = async (): Promise<StoryPostingHistory[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta/story-groups/pending-swipes');
    return (raw || []).map(h => ({
      ...h,
      post: h.post ? normalizeData(h.post) : undefined,
      posts: h.posts ? h.posts.map(normalizeData) : []
    })) as StoryPostingHistory[];
  };

  submitSwipes = async (swipes: SwipeResponseItem[]): Promise<{ success: boolean }> => {
    return searchApiClient.post('/api/v1/Insta/story-groups/swipes', swipes);
  };

  suggestGroupMetadata = async (postIds: string[]): Promise<{ title: string; keywords: string }> => {
    return searchApiClient.post('/api/v1/Insta/suggest-group-metadata', { postIds });
  };

  getStoryPlannerFeed = async (limit = 100, offset = 0, search?: string, sortAsc = false): Promise<{ items: UnifiedPlannerItem[]; totalCount: number; groupCount: number }> => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortParam = `&sortAsc=${sortAsc}`;
    const raw = await searchApiClient.get<{ items: any[]; totalCount: number; groupCount: number }>(`/api/v1/Insta/story-planner/feed?limit=${limit}&offset=${offset}${searchParam}${sortParam}`);
    const items = ((raw && raw.items) || []).map(item => {
      if (item.type === 'post' && item.post) {
        return {
          ...item,
          post: normalizeData(item.post)
        };
      } else if (item.type === 'group' && item.group) {
        return {
          ...item,
          group: {
            ...item.group,
            posts: item.group.posts ? item.group.posts.map(normalizeData) : []
          }
        };
      }
      return item;
    }) as UnifiedPlannerItem[];
    return {
      items,
      totalCount: raw?.totalCount || 0,
      groupCount: raw?.groupCount || 0
    };
  };

  // ── Competitor Intelligence & Outliers ──────────────────────────────────────

  getCompetitorsSummary = async (): Promise<CompetitorsSummaryResponse> => {
    try {
      const raw = await searchApiClient.get<any>(API_ROUTES.INSTAGRAM.COMPETITORS_SUMMARY);
      if (raw) {
        return {
          totalCompetitors: raw.totalCompetitorsCount ?? raw.totalCompetitors ?? raw.TotalCompetitors ?? 0,
          activeCount: raw.activeCompetitorsCount ?? raw.activeCount ?? raw.ActiveCount ?? 0,
          totalLimit: raw.totalLimit ?? raw.TotalLimit ?? 50,
          breakoutsTodayCount: raw.breakoutsTodayCount ?? raw.BreakoutsTodayCount ?? 0,
          dayOneTakeoffsCount: raw.dayOneTakeoffsCount ?? raw.DayOneTakeoffsCount ?? 0,
          delayedSpikesCount: raw.delayedSpikesCount ?? raw.DelayedSpikesCount ?? 0,
          lastUpdated: raw.lastUpdated ?? raw.LastUpdated,
          profiles: (raw.profiles || raw.Profiles || []).map(normalizeCompetitorProfile),
        };
      }
      return {
        totalCompetitors: 0,
        activeCount: 0,
        totalLimit: 50,
        breakoutsTodayCount: 0,
        profiles: [],
      };
    } catch (err) {
      console.warn('Failed to fetch competitors summary, falling back to local watchlist calculation', err);
      const watchlist = await this.getWatchlist().catch(() => []);
      const compProfiles = watchlist.filter(p => {
        const cat = (p.profileCategory || '').toLowerCase();
        return cat !== 'mybusiness' && cat !== 'my business';
      });
      const activeCount = compProfiles.filter(p => p.isActive).length;
      return {
        totalCompetitors: compProfiles.length,
        activeCount: activeCount,
        totalLimit: 50,
        breakoutsTodayCount: 0,
        profiles: compProfiles.map(p => ({
          ...p,
          isTracked: p.isActive,
          niche: p.profileCategory || 'Competitors',
        })),
      };
    }
  };

  toggleCompetitorTracking = async (username: string, data?: { isTracked?: boolean; active?: boolean } | boolean): Promise<{ success: boolean; isTracked?: boolean }> => {
    const isTracked = typeof data === 'boolean' ? data : (data?.isTracked ?? data?.active ?? true);
    try {
      const resp = await searchApiClient.post<any>(API_ROUTES.INSTAGRAM.COMPETITORS_TOGGLE_TRACKING(username), { isTracked, active: isTracked });
      return { success: true, isTracked: resp?.isTracked ?? isTracked };
    } catch {
      await this.toggleWatchStatus(username, isTracked).catch(() => {});
      return { success: true, isTracked };
    }
  };

  getHighPerformingCompetitors = async (params?: GetHighPerformingOptions): Promise<HighPerformingCompetitorPost[]> => {
    const queryParams = new URLSearchParams();
    if (params?.niche && params.niche !== 'All' && params.niche !== 'all') queryParams.append('niche', params.niche);
    if (params?.outlierType && params.outlierType !== 'All' && params.outlierType !== 'all') {
      queryParams.append('outlierType', params.outlierType);
      queryParams.append('archetype', params.outlierType);
    }
    queryParams.append('minMultiplier', '1.0');
    if (params?.days !== undefined) queryParams.append('days', params.days.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.minViews !== undefined) queryParams.append('minViews', params.minViews.toString());
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    try {
      const raw = await searchApiClient.get<any>(`${API_ROUTES.INSTAGRAM.COMPETITORS_HIGH_PERFORMING}${queryString}`);
      const items = Array.isArray(raw) ? raw : (raw?.items || raw?.Items || raw?.posts || raw?.Posts || []);
      if (Array.isArray(items) && items.length > 0) {
        return items.map(transformOutlier);
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch high performing competitors from API', err);
      return [];
    }
  };

  getCompetitorProfileCurve = async (profileId: string, postId?: string): Promise<CompetitorProfileCurveResponse> => {
    const postParam = postId ? `?postId=${encodeURIComponent(postId)}` : '';
    try {
      return await searchApiClient.get<CompetitorProfileCurveResponse>(`${API_ROUTES.INSTAGRAM.COMPETITORS_PROFILE_CURVE(profileId)}${postParam}`);
    } catch {
      return await searchApiClient.get<CompetitorProfileCurveResponse>(`/api/v1/Insta/competitors/${encodeURIComponent(profileId)}/curve${postParam}`);
    }
  };

  autoClassifyProfile = async (username: string): Promise<ProfileClassificationResult> => {
    return searchApiClient.post<ProfileClassificationResult>(API_ROUTES.INSTAGRAM.AUTO_CLASSIFY(username), {});
  };

  getPostPlannerChannels = async (): Promise<PostPlannerChannelOption[]> => {
    return searchApiClient.get<PostPlannerChannelOption[]>(API_ROUTES.INSTAGRAM.POST_PLANNER_CHANNELS);
  };

  getPostPlannerItems = async (category?: string): Promise<PostPlannerItem[]> => {
    return searchApiClient.get<PostPlannerItem[]>(API_ROUTES.INSTAGRAM.POST_PLANNER_ITEMS(category));
  };

  matchProductChannels = async (payload: MatchProductChannelsPayload): Promise<{ success: boolean; productId: string; planningStatus: string }> => {
    return searchApiClient.post(API_ROUTES.INSTAGRAM.POST_PLANNER_MATCH_CHANNELS, payload);
  };

  recordPostAction = async (payload: RecordPostActionPayload): Promise<{ success: boolean; status: string; publishedAt?: string; scheduledAt?: string }> => {
    return searchApiClient.post(API_ROUTES.INSTAGRAM.POST_PLANNER_RECORD_ACTION, payload);
  };

  classifyChannel = async (payload: ClassifyChannelPayload): Promise<{ success: boolean; watchlistId: string; channelType: string }> => {
    return searchApiClient.post(API_ROUTES.INSTAGRAM.POST_PLANNER_CLASSIFY_CHANNEL, payload);
  };
}

export interface UnifiedPlannerItem {
  type: 'post' | 'group';
  id: string;
  timestamp: string;
  post?: InstagramPost;
  group?: StoryGroup;
}

export interface InstagramComment {
  id: string;
  commentText: string;
  postedAt: string;
  likeCount: number;
  isHidden: boolean;
  username?: string;
  fullName?: string;
}

export interface StoryGroup {
  id: string;
  name: string;
  status: 'active' | 'suspend' | 'ignore';
  suspendUntil?: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  posts: InstagramPost[];
  eligibleAccounts: string[];
  needsReview: boolean;
  keywords?: string;
  rightSwipes?: number;
  leftSwipes?: number;
  shareCount?: number;
  lastPostedAt?: string;
}

export interface CreateStoryGroupPayload {
  name: string;
  postIds: string[];
  targetWatchlistIds: string[];
  keywords?: string;
}

export interface UpdateStoryGroupPayload {
  name?: string;
  status?: 'active' | 'suspend' | 'ignore';
  suspendDays?: number;
  postIds?: string[];
  starredPostIds?: string[];
  targetWatchlistIds?: string[];
  keywords?: string;
}

export interface StoryPostingHistory {
  id: string;
  groupId?: string;
  groupName?: string;
  postId?: string;
  targetWatchlistId: string;
  targetUsername: string;
  postedAt: string;
  swipeStatus: 'pending' | 'left' | 'right';
  swipedAt?: string;
  post?: InstagramPost;
  posts: InstagramPost[];
}

export interface SwipeResponseItem {
  historyId: string;
  direction: 'left' | 'right';
}

export interface PostPlannerChannelOption {
  watchlistId: string;
  username: string;
  displayName?: string;
  profilePicUrl?: string;
  channelType: 'focus' | 'dump';
  categoryFocus: string[];
  targetDemography?: string;
}

export interface PostPlannerChannelAssignment {
  assignmentId: string;
  watchlistId: string;
  username: string;
  channelType: 'focus' | 'dump';
  status: 'assigned' | 'scheduled' | 'shared' | 'excluded' | 'unassigned';
  scheduledAt?: string;
  publishedAt?: string;
  publishedUrl?: string;
  captionUsed?: string;
}

export interface PostPlannerItem {
  productId: string;
  productCode: string;
  title: string;
  category: string;
  fabric?: string;
  price: number;
  primaryImageUrl?: string;
  isStarred: boolean;
  planningStatus: 'in_progress' | 'complete';
  channelAssignments: PostPlannerChannelAssignment[];
}

export interface MatchProductChannelsPayload {
  productId: string;
  watchlistIds: string[];
  isDonePlanning: boolean;
}

export interface RecordPostActionPayload {
  productId: string;
  watchlistId: string;
  actionType: 'shared_now' | 'scheduled' | 'excluded';
  scheduledAt?: string;
  publishedUrl?: string;
  externalPostId?: string;
  captionUsed?: string;
}

export interface ClassifyChannelPayload {
  watchlistId: string;
  channelType: 'focus' | 'dump';
  categoryFocus: string[];
  targetDemography?: string;
}

export const instagramService = new InstagramService();

