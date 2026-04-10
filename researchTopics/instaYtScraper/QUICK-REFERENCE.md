# 📚 Competitor Intelligence - Quick Reference Guide

## 📁 Documentation Index

All planning documents are in: `C:\productivity\deeplens\researchTopics\instaYtScraper\`

| Document                       | Purpose                               | Read When                      |
| ------------------------------ | ------------------------------------- | ------------------------------ |
| **README.md (Executive Summary section)**  | 📌 **START HERE** - Executive overview | First time setup               |
| **architecture-comparison.md** | Why we chose simple over complex      | Understanding design decisions |
| **event-driven-architecture.md** | Detailed technical architecture       | Development phase              |
| **implementation-roadmap.md**  | Step-by-step development plan         | Weekly planning                |
| **config.example.yaml**        | Configuration reference               | Setting up scraper             |
| **ui.md**                      | UI structure overview                 | Frontend development           |
| **Orchestrator UI...md**       | Original research (reference only)    | Advanced features (future)     |
| **SomeMoreBestPractices.md**   | Instagram scraping tips               | Avoiding bans                  |

**Database Schema**: `C:\productivity\deeplens\migrations\competitor_intel_schema.sql`

---

## 🚀 Quick Start Commands

### 1. Deploy Database Schema

```bash
# Navigate to deeplens root
cd C:\productivity\deeplens

# Run migration (adjust connection details)
psql -U deeplens_user -d deeplens -f migrations\competitor_intel_schema.sql

# Verify tables created
psql -U deeplens_user -d deeplens -c "\dt competitor*"
```

Expected output:
```
 competitor_watchlist
 competitor_videos
 scraper_jobs
 video_insights
 engagement_snapshots
```

---

### 2. Create MinIO Buckets

```bash
# Using MinIO client (mc)
mc mb deeplens/competitor-intel-media
mc mb deeplens/competitor-intel-thumbnails
mc mb deeplens/competitor-intel-metadata

# Verify
mc ls deeplens/
```

---

### 3. Install Python Dependencies

```bash
# Create virtual environment
cd C:\productivity\deeplens\src\competitor-scraper
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install instaloader yt-dlp fastapi sqlalchemy psycopg2-binary minio pyyaml apscheduler pillow python-multipart uvicorn
```

---

### 4. Test Instagram Authentication

```bash
# Manual login to create session
python -c "
import instaloader
L = instaloader.Instaloader()
L.interactive_login('your_scraper_username')
L.save_session_to_file('instagram_session')
print('✅ Session saved!')
"

# Test session
python -c "
import instaloader
L = instaloader.Instaloader()
L.load_session_from_file('your_scraper_username', 'instagram_session')
print('✅ Session loaded successfully!')
"
```

---

### 5. Test Basic Scraping

```python
# test_scrape.py
import instaloader

L = instaloader.Instaloader()
L.load_session_from_file('your_scraper_username', 'instagram_session')

# Test with a competitor
profile = instaloader.Profile.from_username(L.context, 'competitor_username')

print(f"Profile: {profile.full_name}")
print(f"Followers: {profile.followers}")
print(f"Posts: {profile.mediacount}")

# Fetch first 5 posts
for idx, post in enumerate(profile.get_posts()):
    if idx >= 5:
        break
    print(f"  Post {idx+1}: {post.shortcode} - {post.likes} likes")
```

---

## 🎯 Development Phases

### ✅ Phase 1: Foundation (Now)
**Status**: Planning complete  
**Next**: Deploy database schema

Tasks:
- [ ] Deploy `competitor_intel_schema.sql`
- [ ] Create MinIO buckets
- [ ] Create Instagram scraper account
- [ ] Test session creation

**Estimated**: 1-2 days

---

### 🔄 Phase 2: Core Scraper (Next)
**Status**: Not started  
**Duration**: 4-5 days

Key files to create:
- `src/competitor-scraper/instagram_scraper.py`
- `src/competitor-scraper/youtube_scraper.py`
- `src/competitor-scraper/scheduler.py`
- `src/competitor-scraper/storage_service.py`

---

### ⏳ Phase 3: API Layer
**Status**: Not started  
**Duration**: 2-3 days

Key files to create:
- `src/competitor-intel-api/main.py`
- `src/competitor-intel-api/routers/videos.py`
- `src/competitor-intel-api/routers/watchlist.py`

---

### ⏳ Phase 4: UI Integration
**Status**: Not started  
**Duration**: 4-5 days

Key files to create:
- `src/DeepLens.WebUI/src/pages/CompetitorIntel/VideosGrid.tsx`
- `src/DeepLens.WebUI/src/pages/CompetitorIntel/SkuTagging.tsx`
- `src/DeepLens.WebUI/src/pages/CompetitorIntel/InsightsDashboard.tsx`

---

## 📊 Key Database Queries

### View Recent Videos

```sql
SELECT 
    v.title,
    v.url,
    v.posted_at,
    v.view_count,
    v.like_count,
    w.username AS competitor
FROM competitor_videos v
JOIN competitor_watchlist w ON v.watchlist_id = w.id
ORDER BY v.posted_at DESC
LIMIT 20;
```

---

### Check Scraper Health

```sql
SELECT 
    w.platform,
    w.username,
    w.enabled,
    w.last_scraped_at,
    COUNT(v.id) as total_videos,
    MAX(v.posted_at) as latest_video
FROM competitor_watchlist w
LEFT JOIN competitor_videos v ON v.watchlist_id = w.id
GROUP BY w.id, w.platform, w.username, w.enabled, w.last_scraped_at
ORDER BY w.last_scraped_at DESC NULLS LAST;
```

---

### Find Trending Videos

```sql
SELECT 
    v.title,
    v.url,
    v.view_count,
    v.like_count,
    ROUND((v.like_count::DECIMAL / NULLIF(v.view_count, 0)) * 100, 2) as engagement_rate,
    w.username,
    v.posted_at
FROM competitor_videos v
JOIN competitor_watchlist w ON v.watchlist_id = w.id
WHERE v.posted_at > NOW() - INTERVAL '7 days'
  AND v.view_count > 1000
ORDER BY engagement_rate DESC
LIMIT 10;
```

---

### Get Untagged Videos

```sql
SELECT 
    v.id,
    v.title,
    v.url,
    v.thumbnail_url,
    w.username,
    v.posted_at
FROM competitor_videos v
JOIN competitor_watchlist w ON v.watchlist_id = w.id
WHERE (v.tagged_sku_ids IS NULL OR array_length(v.tagged_sku_ids, 1) IS NULL)
  AND v.media_type IN ('video', 'image')
ORDER BY v.posted_at DESC
LIMIT 20;
```

---

## ⚙️ Configuration Reference

### Add Competitor to Watchlist

```sql
INSERT INTO competitor_watchlist (platform, username, display_name, tags, enabled)
VALUES 
    ('instagram', 'competitor_sarees', 'Competitor Sarees Store', 
     ARRAY['sarees', 'premium', 'wedding'], true);
```

---

### Configure Scraping Schedule

Edit `src/competitor-scraper/config.yaml`:

```yaml
scraping:
  schedule:
    instagram: "0 */6 * * *"   # Every 6 hours
    youtube: "0 */12 * * *"    # Every 12 hours
  
  instagram:
    posts_per_account: 50        # Max posts to fetch
    delay_between_posts: [3, 7]  # Random delay (seconds)
```

---

### Rate Limits (Conservative)

| Platform  | Setting        | Value   | Why                       |
| --------- | -------------- | ------- | ------------------------- |
| Instagram | Posts/hour     | 40      | Avoid rate limits         |
| Instagram | Delay/post     | 3-7s    | Mimic human behavior      |
| Instagram | Delay/account  | 60-120s | Account safety            |
| YouTube   | Videos/channel | 50      | Sufficient for monitoring |
| YouTube   | Delay/video    | 2-5s    | API rate limit compliance |

---

## 🐛 Troubleshooting

### Instagram Session Expires

**Symptom**: `LoginRequiredException`

**Solution**:
```bash
# Re-login
python -c "
import instaloader
L = instaloader.Instaloader()
L.interactive_login('your_scraper_username')
L.save_session_to_file('instagram_session')
"
```

**Prevention**: Sessions last 30-90 days, refresh monthly

---

### Rate Limit Error (429)

**Symptom**: Scraper stops with "Too Many Requests"

**Solution**:
1. Check recent scraping frequency
2. Increase delays in `config.yaml`
3. Wait 24 hours before resuming
4. Review `scraper_jobs` table for patterns

```sql
SELECT created_at, status, error_message
FROM scraper_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

### Videos Not Downloading

**Symptom**: Metadata saved but no media files in MinIO

**Check**:
1. MinIO accessibility
   ```bash
   mc ls deeplens/competitor-intel-media/
   ```

2. Download settings in config
   ```yaml
   instagram:
     download_videos: true  # Should be true
   ```

3. Storage space
   ```sql
   SELECT 
       COUNT(*),
       SUM(LENGTH(media_url)) as total_bytes
   FROM competitor_videos
   WHERE media_url IS NOT NULL;
   ```

---

### Database Connection Issues

**Symptom**: `psycopg2.OperationalError`

**Check**:
1. PostgreSQL running
   ```bash
   docker ps | grep postgres
   ```

2. Connection string correct
   ```bash
   echo $DATABASE_URL
   ```

3. Database exists
   ```bash
   psql -U deeplens_user -d deeplens -c "SELECT version();"
   ```

---

## 📈 Success Metrics

Track these weekly:

### Scraping Health
```sql
-- Jobs in last 7 days
SELECT 
    status,
    COUNT(*) as count
FROM scraper_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

Expected: All `completed` or `partial`, no `failed`

---

### Data Growth
```sql
-- Videos added this week
SELECT 
    DATE(scraped_at) as date,
    COUNT(*) as videos_added
FROM competitor_videos
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(scraped_at)
ORDER BY date;
```

Expected: ~50-150 videos/day depending on competitor count

---

### SKU Tagging Progress
```sql
-- Tagging statistics
SELECT 
    COUNT(*) as total_videos,
    COUNT(tagged_sku_ids) FILTER (WHERE array_length(tagged_sku_ids, 1) > 0) as tagged,
    ROUND(
        COUNT(tagged_sku_ids) FILTER (WHERE array_length(tagged_sku_ids, 1) > 0)::DECIMAL 
        / COUNT(*)::DECIMAL * 100, 
    2) as tagged_percent
FROM competitor_videos
WHERE posted_at > NOW() - INTERVAL '30 days';
```

Target: >50% tagged within 48 hours

---

## 🔐 Security Checklist

- [ ] Instagram scraper account uses strong password
- [ ] PostgreSQL user has minimum required permissions
- [ ] MinIO buckets are private (not public)
- [ ] API requires authentication
- [ ] Session files have restricted permissions (chmod 600)
- [ ] config.yaml excluded from git (.gitignore)
- [ ] Environment variables used for secrets

---

## 📞 Support Resources

### Official Documentation
- **Instaloader**: https://instaloader.github.io/
- **yt-dlp**: https://github.com/yt-dlp/yt-dlp
- **FastAPI**: https://fastapi.tiangolo.com/
- **APScheduler**: https://apscheduler.readthedocs.io/

### Getting Help
- Instaloader issues: Check if session expired
- YouTube issues: Check `yt-dlp --version` (keep updated)
- Database issues: Check PostgreSQL logs
- MinIO issues: Check `mc admin info deeplens`

---

## 🎓 Learning Resources

### Understanding the Stack

1. **Instagram Scraping**
   - Read: `SomeMoreBestPractices.md`
   - Practice: Scrape your own account first
   - Key: Session management and rate limiting

2. **Python APScheduler**
   - Tutorial: https://apscheduler.readthedocs.io/en/3.x/userguide.html
   - Cron syntax: https://crontab.guru/

3. **FastAPI Development**
   - Tutorial: https://fastapi.tiangolo.com/tutorial/
   - Focus: SQLAlchemy integration, async endpoints

4. **React Masonry Layout**
   - Library: `react-masonry-css`
   - Example: See `implementation-roadmap.md` Day 15-16

---

## ✅ Pre-Launch Checklist

Before going live:

### Infrastructure
- [ ] Database schema deployed and verified
- [ ] MinIO buckets created
- [ ] Instagram session working
- [ ] Test scrape completed successfully
- [ ] Watchlist populated with 3-5 test competitors

### Code
- [ ] Scraper handles errors gracefully
- [ ] Retry logic tested
- [ ] Rate limits configured conservatively
- [ ] Logging implemented

### Monitoring
- [ ] Health endpoint responding
- [ ] Database queries working
- [ ] Can view videos in PostgreSQL
- [ ] Can view media files in MinIO

### Documentation
- [ ] config.yaml filled out
- [ ] Deployment steps documented
- [ ] Troubleshooting guide reviewed

---

## 🚢 Deployment Day

When ready to deploy:

1. **Morning**: Deploy scraper service
2. **Afternoon**: Monitor first scrape cycle
3. **Evening**: Review data quality
4. **Next Day**: Enable scheduler
5. **Week 1**: Manual monitoring daily
6. **Week 2+**: Weekly health checks

---

## 📝 Weekly Maintenance Routine

### Every Monday (10 minutes)

```sql
-- 1. Check scraper health
SELECT * FROM vw_scraper_health;

-- 2. Review failed jobs
SELECT * FROM scraper_jobs 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '7 days';

-- 3. Count new videos
SELECT COUNT(*) 
FROM competitor_videos 
WHERE scraped_at > NOW() - INTERVAL '7 days';

-- 4. Check trending content
SELECT title, view_count, like_count, url
FROM competitor_videos
WHERE posted_at > NOW() - INTERVAL '7 days'
ORDER BY view_count DESC
LIMIT 5;
```

### Monthly (30 minutes)
- Refresh Instagram session (if needed)
- Review storage usage
- Update competitor watchlist
- Review and tune rate limits

---

## 🎯 Next Steps

**Right Now:**
1. Read `README.md (Executive Summary section)` (10 min)
2. Deploy database schema (5 min)
3. Create MinIO buckets (2 min)

**This Week:**
1. Create Instagram scraper account
2. Test basic scraping (1 hour)
3. Verify data in database

**Next Week:**
1. Start Phase 2 development
2. Build core scraper service
3. Test with 5 competitors

---

**Questions?** Review the detailed docs:
- Architecture: `event-driven-architecture.md`
- Development: `implementation-roadmap.md`
- Decisions: `architecture-comparison.md`


