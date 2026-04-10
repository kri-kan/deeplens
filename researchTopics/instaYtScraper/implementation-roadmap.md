# Implementation Roadmap: Self-Hosted Competitor Intelligence

## UI Component Structure

DeepLens WebUI Structure:
 Dashboard (existing)
 SKU Management (existing)  
 **Competitor Intel** (NEW)
     Videos Grid
        Day-wise sections (as in your doc)
        Platform filter (Instagram/YouTube)
        Competitor filter
        Performance badges ( Trending,  Spike)
     SKU Tagging
        Video preview
        AI-suggested SKU matches
        Manual tag interface
     Insights Dashboard
         Top performing videos (last 7 days)
         Engagement trends chart
         New design alerts

---
# Implementation Roadmap: Self-Hosted Competitor Intelligence

## Overview

This roadmap breaks down the implementation into manageable phases, with estimated time and priorities.

## 📅 Timeline Summary

- **Phase 1** (Foundation): 3-4 days
- **Phase 2** (Core Scraper): 4-5 days  
- **Phase 3** (API Layer): 2-3 days
- **Phase 4** (UI Integration): 4-5 days
- **Phase 5** (Insights & Polish): 3-4 days

**Total: ~3 weeks for MVP**

---

## Phase 1: Foundation & Infrastructure (3-4 days)

### Goals
- Set up database schema
- Configure MinIO buckets
- Set up basic project structure
- Get Instagram session working

### Tasks

#### Day 1: Database Setup
- [ ] Review and run `competitor_intel_schema.sql`
- [ ] Verify tables created correctly
- [ ] Test views and functions
- [ ] Insert test watchlist entries
- [ ] Document any DeepLens DB connection info needed

#### Day 2: MinIO Configuration
- [ ] Create MinIO buckets:
  - `competitor-intel-media`
  - `competitor-intel-thumbnails`
  - `competitor-intel-metadata`
- [ ] Set bucket policies (private, with pre-signed URL access)
- [ ] Test upload/download with sample files
- [ ] Document MinIO credentials

#### Day 3: Project Structure
- [ ] Create directory structure:
  ```
  src/
  ├── competitor-intel-api/
  ├── competitor-scraper/
  └── DeepLens.WebUI/src/pages/CompetitorIntel/
  ```
- [ ] Initialize Python virtual environment
- [ ] Install base dependencies:
  - instaloader
  - yt-dlp
  - fastapi
  - sqlalchemy
  - minio
  - pyyaml
  - apscheduler

#### Day 4: Instagram Session Setup
- [ ] Create Instagram scraper account (NEW account, not business)
- [ ] Install instaloader: `pip install instaloader`
- [ ] Manual login and session save:
  ```bash
  instaloader --login your_username --sessionfile session-file
  ```
- [ ] Test session persistence
- [ ] Document session file location
- [ ] Test basic profile scraping

**Deliverables**: 
- ✅ Database schema deployed
- ✅ MinIO configured
- ✅ Instagram session working
- ✅ Project scaffolded

---

## Phase 2: Core Scraper Service (4-5 days)

### Goals
- Build Instagram scraper
- Build YouTube scraper
- Implement scheduling
- Test with real data

### Tasks

#### Day 5-6: Instagram Scraper

**File**: `src/competitor-scraper/instagram_scraper.py`

Core functionality:
- [ ] Load session from file
- [ ] Fetch profile posts (with pagination)
- [ ] Extract metadata (likes, comments, views)
- [ ] Download media to MinIO
- [ ] Generate thumbnails
- [ ] Store metadata in PostgreSQL
- [ ] Handle rate limiting (sleep between posts)
- [ ] Error handling and retry logic

```python
# Key function signatures
def scrape_instagram_account(username: str, max_posts: int) -> Dict
def download_instagram_post(post, storage_service) -> str
def extract_post_metadata(post) -> Dict
```

Testing:
- [ ] Test with 1 competitor account
- [ ] Verify ~20 posts scraped successfully
- [ ] Check MinIO for uploaded files
- [ ] Check PostgreSQL for metadata

#### Day 7-8: YouTube Scraper

**File**: `src/competitor-scraper/youtube_scraper.py`

Core functionality:
- [ ] Use yt-dlp to fetch channel videos
- [ ] Extract video metadata
- [ ] Download videos to MinIO (with quality limits)
- [ ] Generate thumbnails
- [ ] Store metadata in PostgreSQL
- [ ] Extract subtitles if available
- [ ] Handle rate limiting

```python
# Key function signatures
def scrape_youtube_channel(channel_handle: str, max_videos: int) -> Dict
def download_youtube_video(video_info, storage_service) -> str
def extract_video_metadata(video_info) -> Dict
```

Testing:
- [ ] Test with 1 YouTube channel
- [ ] Verify videos downloaded
- [ ] Check subtitle extraction
- [ ] Validate metadata storage

#### Day 9: Scheduling & Orchestration

**File**: `src/competitor-scraper/scheduler.py`

- [ ] Implement APScheduler setup
- [ ] Load watchlist from database
- [ ] Schedule jobs based on config.yaml
- [ ] Job queue management (simple PostgreSQL-based)
- [ ] Job status updates
- [ ] Error handling and logging

```python
# Scheduler setup
scheduler = BackgroundScheduler()

# Instagram jobs: every 6 hours
scheduler.add_job(
    func=run_instagram_scraping,
    trigger="cron",
    hour="*/6",
    id="instagram_scraper"
)

# YouTube jobs: every 12 hours
scheduler.add_job(
    func=run_youtube_scraping,
    trigger="cron",
    hour="*/12",
    id="youtube_scraper"
)
```

Testing:
- [ ] Test manual job triggering
- [ ] Test scheduled execution
- [ ] Verify job logs in database
- [ ] Test restart/recovery

**Deliverables**:
- ✅ Working Instagram scraper
- ✅ Working YouTube scraper
- ✅ Automated scheduling
- ✅ Data flowing into database

---

## Phase 3: API Layer (2-3 days)

### Goals
- Create FastAPI service
- Expose REST endpoints
- Integrate with DeepLens auth

### Tasks

#### Day 10-11: FastAPI Implementation

**File**: `src/competitor-intel-api/main.py`

Core endpoints:
- [ ] `GET /api/watchlist` - List all monitored accounts
- [ ] `POST /api/watchlist` - Add new account to monitor
- [ ] `PUT /api/watchlist/{id}` - Update account (enable/disable)
- [ ] `DELETE /api/watchlist/{id}` - Remove account
- [ ] `GET /api/videos` - List videos (with filters)
  - Query params: platform, competitor, date_from, date_to, tags
- [ ] `GET /api/videos/{id}` - Get single video details
- [ ] `PUT /api/videos/{id}/tag-sku` - Tag video with SKU
- [ ] `GET /api/insights` - Get performance insights
- [ ] `GET /api/jobs` - List scraper jobs
- [ ] `POST /api/jobs/trigger` - Manually trigger scraping
- [ ] `GET /api/health` - Health check endpoint

**Models** (`src/competitor-intel-api/models/`):
- [ ] `WatchlistItem`
- [ ] `Video`
- [ ] `ScraperJob`
- [ ] `Insight`

**Services** (`src/competitor-intel-api/services/`):
- [ ] `video_service.py` - Video CRUD operations
- [ ] `watchlist_service.py` - Watchlist management
- [ ] `insights_service.py` - Calculate insights
- [ ] `storage_service.py` - MinIO integration

#### Day 12: Integration & Testing

- [ ] Test all endpoints with Postman/curl
- [ ] Add CORS middleware for WebUI
- [ ] Integrate with DeepLens Auth (NextGen.Identity.Api)
- [ ] Add request validation
- [ ] Add error handling middleware
- [ ] Generate API documentation (auto via FastAPI)

**Deliverables**:
- ✅ Working REST API
- ✅ OpenAPI documentation
- ✅ Integrated with DeepLens auth

---

## Phase 4: UI Integration (4-5 days)

### Goals
- Add Competitor Intel section to DeepLens WebUI
- Build video grid component
- Implement SKU tagging interface
- Create insights dashboard

### Tasks

#### Day 13-14: Navigation & Basic Layout

**Files to modify**:
- `src/DeepLens.WebUI/src/components/Layout/Layout.tsx`
- `src/DeepLens.WebUI/src/App.tsx` (routing)

New components:
- [ ] Add "Competitor Intel" menu item to sidebar
- [ ] Create route `/competitor-intel`
- [ ] Create main layout component `CompetitorIntel.tsx`
- [ ] Add sub-navigation tabs:
  - Videos Grid
  - SKU Tagging
  - Insights
  - Settings (watchlist management)

**File**: `src/DeepLens.WebUI/src/pages/CompetitorIntel/CompetitorIntel.tsx`

```typescript
// Basic structure
const CompetitorIntel = () => {
  return (
    <div className="competitor-intel">
      <Header />
      <Tabs>
        <Tab label="Videos Grid" component={<VideosGrid />} />
        <Tab label="SKU Tagging" component={<SkuTagging />} />
        <Tab label="Insights" component={<InsightsDashboard />} />
        <Tab label="Settings" component={<WatchlistSettings />} />
      </Tabs>
    </div>
  );
};
```

#### Day 15-16: Videos Grid Component

**File**: `src/DeepLens.WebUI/src/pages/CompetitorIntel/VideosGrid.tsx`

Features:
- [ ] Fetch videos from API
- [ ] Day-wise sections (group by posted_at date)
- [ ] Masonry layout within each day
- [ ] Platform filter (Instagram/YouTube/Both)
- [ ] Competitor filter (multi-select)
- [ ] Date range picker
- [ ] Tag filter
- [ ] Performance badges (🔥 Trending, ⚡ Spike)
- [ ] Infinite scroll or pagination
- [ ] Video tile component with:
  - Thumbnail
  - Title (truncated)
  - Engagement metrics
  - Posted date
  - Platform icon
  - Play button overlay for videos

**Library**: Use `react-masonry-css` or `react-virtuoso` for performance

```typescript
// Video tile structure
interface VideoTile {
  id: string;
  platform: 'instagram' | 'youtube';
  thumbnail: string;
  title: string;
  postedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  mediaType: string;
  badges: ('trending' | 'spike' | 'new')[];
}
```

#### Day 17: SKU Tagging Interface

**File**: `src/DeepLens.WebUI/src/pages/CompetitorIntel/SkuTagging.tsx`

Features:
- [ ] Video preview panel (left side)
- [ ] SKU search/select panel (right side)
- [ ] AI-suggested SKUs (highlighted)
- [ ] Manual tag addition
- [ ] Tag confidence display
- [ ] Notes/comments field
- [ ] Save functionality
- [ ] Keyboard shortcuts (N for next, P for previous)

UI Layout:
```
┌─────────────────────────┬─────────────────────────┐
│  Video Preview          │  SKU Selection          │
│  ┌─────────────────┐   │  Search: [_______]      │
│  │                 │   │                         │
│  │  Video Player   │   │  AI Suggestions:        │
│  │                 │   │  ☑ SKU-1234 (92%)      │
│  └─────────────────┘   │  ☐ SKU-5678 (78%)      │
│                         │                         │
│  Title: "Wedding..."   │  Manual Tags:           │
│  Posted: 2 days ago    │  ☑ SKU-9012            │
│  Views: 12.5K          │  ☐ SKU-3456            │
│                         │                         │
│  [< Previous] [Next >] │  [Save Tags]           │
└─────────────────────────┴─────────────────────────┘
```

#### Day 18: Account Management Settings

**File**: `src/DeepLens.WebUI/src/pages/CompetitorIntel/Settings.tsx`

**Reference**: `ui-account-management.md` for complete design specs

Features:
- [ ] Scraper Accounts section
  - [ ] Account list view (Instagram/YouTube)
  - [ ] Status indicators (Active/Expired/Failed)
  - [ ] Health scores with progress bars
  - [ ] Recent activity log
- [ ] Add Instagram Account flow
  - [ ] Username/password form
  - [ ] 2FA support (manual code entry)
  - [ ] TOTP secret storage (optional)
  - [ ] Challenge/checkpoint handling
  - [ ] Manual session setup fallback
- [ ] Add YouTube Account flow
  - [ ] Google OAuth integration
  - [ ] Token management
- [ ] Re-authentication flows
  - [ ] Quick re-auth (use saved session)
  - [ ] Full re-auth (re-enter credentials)
  - [ ] Progress indicators
- [ ] Session health monitoring
  - [ ] Health dashboard widget
  - [ ] Automated health checks
  - [ ] Alert banners for expired sessions
- [ ] Test connection functionality

**Backend support needed**:
- [ ] Add `scraper_accounts` table to database
- [ ] API endpoints for account CRUD
- [ ] Session health check logic
- [ ] OAuth callback handler (YouTube)

```typescript
// Key components
interface ScraperAccount {
  id: string;
  platform: 'instagram' | 'youtube';
  username: string;
  status: 'active' | 'expired' | 'failed' | 'disabled';
  healthScore: number; // 0-100
  lastUsed: Date;
  lastHealthCheck: Date;
}
```

#### Day 19: Insights Dashboard

**File**: `src/DeepLens.WebUI/src/pages/CompetitorIntel/InsightsDashboard.tsx`

Widgets:
- [ ] Top performing videos (last 7 days)
  - Card grid with thumbnails
- [ ] Engagement trends chart
  - Line chart: views/likes over time
  - Use Chart.js or Recharts
- [ ] Platform breakdown (pie chart)
- [ ] New design alerts
  - List of videos with high design match scores
- [ ] Price mentions detected
- [ ] Posting frequency heatmap

**Deliverables**:
- ✅ Fully functional UI
- ✅ Video grid with masonry layout
- ✅ SKU tagging workflow
- ✅ Account management settings
- ✅ Insights dashboard

---

## Phase 5: Insights & Polish (3-4 days)

### Goals
- Implement analytics algorithms
- Add performance optimizations
- Create Docker containers
- Write documentation

### Tasks

#### Day 19: Analytics Algorithms

**File**: `src/competitor-intel-api/services/insights_service.py`

Implement:
- [ ] Engagement spike detection
  ```python
  def detect_engagement_spike(video_id: UUID) -> Optional[Insight]:
      # Calculate 30-day average engagement rate
      # Compare to current video
      # Flag if > 2x average
  ```
- [ ] Trending video detection
  ```python
  def identify_trending_videos(days: int = 7) -> List[Insight]:
      # Find videos from last 7 days
      # Calculate engagement rate
      # Flag top 10%
  ```
- [ ] Price extraction from text
  ```python
  def extract_prices(text: str) -> List[PriceMatch]:
      # Regex for ₹, Rs., INR patterns
      # Return detected prices with confidence
  ```

#### Day 20: Performance Optimization

- [ ] Add database query optimization:
  - Index tuning
  - Query explain analysis
- [ ] Add caching layer:
  - Cache video list responses (5 min TTL)
  - Cache insights (1 hour TTL)
- [ ] Optimize MinIO pre-signed URLs
- [ ] Add lazy loading to UI
- [ ] Optimize bundle size (code splitting)

#### Day 21: Docker & Deployment

**Files to create**:
- `docker/competitor-intel-api.Dockerfile`
- `docker/competitor-scraper.Dockerfile`
- `docker/docker-compose.competitor-intel.yml`

Docker setup:
- [ ] Create Dockerfile for API service
- [ ] Create Dockerfile for scraper service
- [ ] Create docker-compose configuration
- [ ] Add environment variable templates
- [ ] Test full stack with docker-compose up
- [ ] Document deployment steps

#### Day 22: Documentation & Testing

- [ ] Write README.md for competitor-intel module
- [ ] Document API endpoints (beyond auto-generated)
- [ ] Create user guide for UI
- [ ] Add troubleshooting guide
- [ ] End-to-end testing:
  - Add competitor → Scrape → View in UI → Tag SKU
- [ ] Create setup script for easy installation

**Deliverables**:
- ✅ Production-ready analytics
- ✅ Dockerized services
- ✅ Complete documentation
- ✅ MVP ready for use

---

## Post-MVP Enhancements (Future)

### Phase 6: Advanced Features (Optional)
- [ ] AI-powered design matching (CLIP model)
- [ ] Automated weekly email reports
- [ ] Slack/Discord notifications
- [ ] Multi-user access controls
- [ ] Export functionality (CSV, PDF reports)
- [ ] Advanced filters (hashtag search, caption search)
- [ ] Engagement growth charts (time-series)
- [ ] Competitor comparison tools

### Phase 7: Scale & Optimize (If Needed)
- [ ] Add Redis for job queue
- [ ] Horizontal scaling (multiple scraper workers)
- [ ] CDN integration for media delivery
- [ ] Advanced proxy rotation
- [ ] Account pool management (multiple scraper accounts)

---

## Risk Mitigation

### High-Risk Items

1. **Instagram Account Bans**
   - Mitigation: Conservative rate limits, session persistence
   - Backup plan: Have 2-3 backup accounts ready

2. **Session Expiration**
   - Mitigation: Automated session health checks
   - Backup plan: Email alert when session fails

3. **Platform API Changes**
   - Mitigation: Use maintained libraries (instaloader, yt-dlp)
   - Backup plan: Monitor library GitHub for issues

4. **Storage Costs**
   - Mitigation: Configurable cleanup policies
   - Backup plan: Download metadata only (disable video download)

---

## Success Criteria

### MVP Success Metrics

- ✅ Successfully scraping 10+ competitor accounts
- ✅ Zero manual intervention needed for 7 consecutive days
- ✅ <30 seconds from video publish → available in UI
- ✅ UI loads 100+ videos in <2 seconds
- ✅ SKU tagging workflow takes <30 seconds per video
- ✅ Insights generated within 1 hour of scraping

### Quality Gates

Before moving to next phase:
- [ ] All unit tests passing
- [ ] No critical bugs
- [ ] Performance benchmarks met
- [ ] Documentation complete

---

## Resource Requirements

### Infrastructure
- Existing: PostgreSQL, MinIO (already in DeepLens)
- New: None required (uses existing infrastructure)

### Development Time
- **Solo developer**: ~3 weeks full-time
- **Small team (2-3)**: ~2 weeks
- **Part-time**: ~6-8 weeks

### Ongoing Maintenance
- **Weekly**: Review failed jobs, update watchlist (15 min)
- **Monthly**: Session refresh if needed (10 min)
- **Quarterly**: Dependency updates (30 min)

**Total maintenance**: ~2-3 hours/month

---

## Next Immediate Steps

To get started right now:

1. **Run database migration**
   ```bash
   psql -U your_user -d deeplens < migrations/competitor_intel_schema.sql
   ```

2. **Create Instagram scraper account**
   - Sign up for new Instagram account
   - Verify email/phone
   - Wait 24-48 hours before using for scraping

3. **Set up MinIO buckets**
   ```bash
   mc mb deeplens/competitor-intel-media
   mc mb deeplens/competitor-intel-thumbnails
   ```

4. **Install Python dependencies**
   ```bash
   pip install instaloader yt-dlp fastapi sqlalchemy minio pyyaml apscheduler
   ```

5. **Test basic scraping**
   ```python
   import instaloader
   L = instaloader.Instaloader()
   # Test fetching a public profile
   profile = instaloader.Profile.from_username(L.context, "competitor_username")
   for post in profile.get_posts():
       print(post.shortcode, post.likes)
       break
   ```

Would you like me to start implementing any specific phase?

