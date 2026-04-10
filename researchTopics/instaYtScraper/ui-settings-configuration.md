# Settings & Configuration UI - Complete Specification

## Overview

Comprehensive configuration interface for the Competitor Intel module, consolidating all settings from:
- Account rotation strategy
- Engagement tracking
- Follower tracking
- Anti-detection patterns
- Media download preferences
- SKU linking

---

## Page Structure

```
Competitor Intel Module
└── Settings
    ├── 1. Account Management
    ├── 2. Scraping Configuration
    ├── 3. Engagement Tracking
    ├── 4. Follower Tracking
    ├── 5. Media Download
    ├── 6. Anti-Detection
    ├── 7. SKU Linking
    ├── 8. Alerts & Notifications
    └── 9. Advanced Settings
```

---

## Section 1: Account Management

**Purpose**: Manage Instagram/YouTube scraper accounts and sessions

### UI Components

#### Account Pool Configuration

```tsx
<Card title="Scraper Accounts">
  <Table>
    <Column header="Platform" />
    <Column header="Username" />
    <Column header="Status" />
    <Column header="Last Used" />
    <Column header="Health" />
    <Column header="Actions" />
  </Table>
  
  <Button>+ Add Account</Button>
  
  <FormGroup label="Account Strategy">
    <Radio value="single">Single Account (Simple)</Radio>
    <Radio value="pool_rotation">Account Pool (Anti-Detection)</Radio>
    <Radio value="round_robin">Round Robin</Radio>
    <Radio value="random">Random Selection</Radio>
  </FormGroup>
  
  <FormGroup label="Use Different Account for Media Download">
    <Switch
      name="use_different_account_for_download"
      defaultValue={false}
      helpText="Anti-detection: Use different account for metadata vs media download"
    />
  </FormGroup>
</Card>
```

**Settings**:
- `account_strategy`: "single" | "pool_rotation" | "round_robin" | "random"
- `use_same_account_as_metadata`: boolean
- `scraper_accounts[]`: Array of account configs

**See**: `ui-account-management.md`, `account-rotation-strategy.md`

---

## Section 2: Scraping Configuration

**Purpose**: Core scraping behavior and scheduling

### UI Components

```tsx
<Card title="Scraping Schedule">
  <FormGroup label="Discovery Frequency">
    <Select name="discovery_frequency">
      <Option value="3h">Every 3 hours</Option>
      <Option value="6h">Every 6 hours (Recommended)</Option>
      <Option value="12h">Every 12 hours</Option>
      <Option value="24h">Once per day</Option>
    </Select>
    <HelpText>How often to check for new posts from competitors</HelpText>
  </FormGroup>
  
  <FormGroup label="Discovery Time">
    <TimePicker name="discovery_time" defaultValue="06:00" />
    <HelpText>Preferred time for scheduled scraping (UTC)</HelpText>
  </FormGroup>
  
  <FormGroup label="Max Posts Per Scrape">
    <NumberInput
      name="max_posts_per_scrape"
      defaultValue={50}
      min={10}
      max={200}
    />
    <HelpText>Limit posts fetched per competitor per run</HelpText>
  </FormGroup>
</Card>

<Card title="Rate Limiting">
  <FormGroup label="Delay Between Competitors (seconds)">
    <RangeInput
      name="delay_between_competitors"
      min={5}
      max={60}
      defaultValue={[10, 20]}
    />
    <HelpText>Random delay: 10-20 seconds (anti-detection)</HelpText>
  </FormGroup>
  
  <FormGroup label="Delay Between Requests (seconds)">
    <RangeInput
      name="delay_between_requests"
      min={2}
      max={10}
      defaultValue={[3, 7]}
    />
  </FormGroup>
  
  <FormGroup label="Max Retries">
    <NumberInput name="max_retries" defaultValue={3} min={1} max={5} />
  </FormGroup>
</Card>
```

**Settings**:
- `discovery_frequency`: "3h" | "6h" | "12h" | "24h"
- `discovery_time`: string (HH:MM format)
- `max_posts_per_scrape`: number
- `delay_between_competitors`: [min, max] seconds
- `delay_between_requests`: [min, max] seconds
- `max_retries`: number
- `timeout_seconds`: number

---

## Section 3: Engagement Tracking

**Purpose**: Configure time-series engagement metric collection

### UI Components

```tsx
<Card title="Engagement Tracking">
  <Switch
    name="engagement_tracking_enabled"
    label="Enable Engagement Tracking"
    defaultValue={true}
  />
  
  <Divider />
  
  <SectionHeader>Early Phase (New Content)</SectionHeader>
  <FormGroup label="Age Range">
    <Text>0-3 days old</Text>
  </FormGroup>
  
  <FormGroup label="Tracking Frequency">
    <Select name="early_phase_frequency_hours" defaultValue={3}>
      <Option value={1}>Every hour</Option>
      <Option value={3}>Every 3 hours (Recommended)</Option>
      <Option value={6}>Every 6 hours</Option>
    </Select>
  </FormGroup>
  
  <Alert type="info">
    Early phase: ~8 snapshots per day for first 3 days
  </Alert>
  
  <Divider />
  
  <SectionHeader>Mature Phase (Established Content)</SectionHeader>
  <FormGroup label="Age Range">
    <NumberInput name="mature_phase_start_days" defaultValue={4} min={4} max={7} />
    <Text>to</Text>
    <NumberInput name="mature_phase_end_days" defaultValue={30} min={7} max={90} />
    <Text>days</Text>
  </FormGroup>
  
  <FormGroup label="Tracking Frequency">
    <Select name="mature_phase_frequency_hours" defaultValue={24}>
      <Option value={12}>Every 12 hours</Option>
      <Option value={24}>Once per day (Recommended)</Option>
    </Select>
  </FormGroup>
  
  <FormGroup label="Snapshot Time">
    <TimePicker name="mature_phase_snapshot_time" defaultValue="12:00" />
  </FormGroup>
  
  <Divider />
  
  <SectionHeader>Archive Phase (Old Content)</SectionHeader>
  <FormGroup label="Archive After">
    <NumberInput name="archive_phase_start_days" defaultValue={31} min={14} max={180} />
    <Text>days</Text>
  </FormGroup>
  
  <FormGroup label="Continue Tracking">
    <Switch name="archive_phase_enabled" defaultValue={false} />
  </FormGroup>
  
  <FormGroup label="Archive Frequency" disabled={!archive_phase_enabled}>
    <Select name="archive_phase_frequency_days" defaultValue={7}>
      <Option value={7}>Weekly</Option>
      <Option value={30}>Monthly</Option>
    </Select>
  </FormGroup>
</Card>
```

**Settings**:
- `engagement_tracking.enabled`: boolean
- `engagement_tracking.early_phase.age_days`: number (default: 3)
- `engagement_tracking.early_phase.frequency_hours`: number (default: 3)
- `engagement_tracking.mature_phase.start_age_days`: number (default: 4)
- `engagement_tracking.mature_phase.end_age_days`: number (default: 30)
- `engagement_tracking.mature_phase.frequency_hours`: number (default: 24)
- `engagement_tracking.mature_phase.snapshot_time`: string
- `engagement_tracking.archive_phase.start_age_days`: number (default: 31)
- `engagement_tracking.archive_phase.enabled`: boolean
- `engagement_tracking.archive_phase.frequency_days`: number

**See**: `engagement-tracking-strategy.md`

---

## Section 4: Follower Tracking

**Purpose**: Configure follower/following count tracking (counts only, no individual lists)

### UI Components

```tsx
<Card title="Follower Count Tracking">
  <Switch
    name="follower_tracking_enabled"
    label="Enable Follower Count Tracking"
    defaultValue={true}
  />
  
  <Alert type="info">
    📊 Tracks follower/following counts only (no individual follower lists for safety and efficiency)
  </Alert>
  
  <Divider />
  
  <FormGroup label="Tracking Frequency">
    <Select name="follower_tracking_frequency" defaultValue="twice_daily">
      <Option value="hourly">Every hour</Option>
      <Option value="every_6h">Every 6 hours</Option>
      <Option value="twice_daily">Twice per day (Recommended)</Option>
      <Option value="daily">Once per day</Option>
    </Select>
  </FormGroup>
  
  <FormGroup label="Tracking Times (UTC)" disabled={follower_tracking_frequency !== 'twice_daily'}>
    <TimePicker name="follower_tracking_time_1" defaultValue="06:00" />
    <Text>and</Text>
    <TimePicker name="follower_tracking_time_2" defaultValue="18:00" />
    <HelpText>Recommended: 6 AM and 6 PM for twice-daily tracking</HelpText>
  </FormGroup>
  
  <FormGroup label="Delay Between Competitors (seconds)">
    <NumberInput name="follower_tracking_delay" defaultValue={30} min={10} max={120} />
    <HelpText>Wait time between processing competitors (rate limiting)</HelpText>
  </FormGroup>
  
  <Divider />
  
  <FormGroup label="Growth Spike Alerts">
    <Switch name="alert_on_follower_spike" defaultValue={true} />
    <NumberInput name="follower_spike_threshold" defaultValue={10} min={5} max={50} />
    <Text>% growth in 12 hours</Text>
    <HelpText>Alert when follower count increases by this percentage</HelpText>
  </FormGroup>
  
  <FormGroup label="Follower Drop Alerts">
    <Switch name="alert_on_follower_drop" defaultValue={true} />
    <NumberInput name="follower_drop_threshold" defaultValue={5} min={1} max={20} />
    <Text>% drop in 12 hours</Text>
    <HelpText>Alert when follower count decreases (mass unfollow or Instagram purge)</HelpText>
  </FormGroup>
  
  <Divider />
  
  <Alert type="success">
    <strong>Storage Efficient</strong>
    <Text>Counts-only tracking: ~7MB/year for 100 competitors ✅</Text>
  </Alert>
  
  <Alert type="success">
    <strong>Safe & Fast</strong>
    <Text>30 seconds per competitor, very low Instagram ban risk ✅</Text>
  </Alert>
</Card>
```

**Settings**:
- `follower_tracking.enabled`: boolean
- `follower_tracking.frequency`: "hourly" | "every_6h" | "twice_daily" | "daily"
- `follower_tracking.schedules[]`: Array of cron schedules
- `follower_tracking.delay_between_competitors_seconds`: number
- `follower_tracking.alerts.growth_spike_threshold_percent`: number
- `follower_tracking.alerts.drop_threshold_percent`: number

**See**: `follower-tracking-strategy.md` (simplified, counts-only)

---

## Section 5: Media Download

**Purpose**: Configure media download behavior

### UI Components

```tsx
<Card title="Media Download">
  <FormGroup label="Download Strategy">
    <Radio value="direct" defaultChecked>
      <strong>Direct URL</strong>
      <Text color="muted">Use media URL from metadata (same account, faster)</Text>
    </Radio>
    <Radio value="refetch">
      <strong>Refetch</strong>
      <Text color="muted">Re-fetch post with different account (anti-detection, slower)</Text>
    </Radio>
  </FormGroup>
  
  <FormGroup label="Video Quality">
    <Select name="video_quality" defaultValue="best[height<=1080]">
      <Option value="best">Best Available</Option>
      <Option value="best[height<=1080]">1080p Max (Recommended)</Option>
      <Option value="best[height<=720]">720p Max</Option>
      <Option value="best[height<=480]">480p Max</Option>
    </Select>
  </FormGroup>
  
  <FormGroup label="Max File Size">
    <NumberInput name="max_file_size_mb" defaultValue={500} min={10} max={2000} />
    <Text>MB</Text>
    <HelpText>Skip videos larger than this</HelpText>
  </FormGroup>
  
  <FormGroup label="Download Delay (Anti-Detection)">
    <RangeInput
      name="download_delay_seconds"
      min={0}
      max={600}
      defaultValue={[60, 300]}
    />
    <HelpText>Wait 1-5 minutes before downloading media</HelpText>
  </FormGroup>
  
  <FormGroup label="Generate Thumbnails">
    <Switch name="generate_thumbnails" defaultValue={true} />
  </FormGroup>
  
  <FormGroup label="Thumbnail Width" disabled={!generate_thumbnails}>
    <NumberInput name="thumbnail_width" defaultValue={400} min={100} max={800} />
    <Text>px</Text>
  </FormGroup>
</Card>
```

**Settings**:
- `media_download.download_strategy`: "direct" | "refetch"
- `media_download.video_quality`: string
- `media_download.max_file_size_mb`: number
- `media_download.download_delay_seconds`: [min, max]
- `media_download.generate_thumbnails`: boolean
- `media_download.thumbnail_width`: number

**See**: `account-rotation-strategy.md`, `event-driven-architecture.md`

---

## Section 6: Anti-Detection

**Purpose**: Configure randomization and stealth patterns

### UI Components

```tsx
<Card title="Anti-Detection Settings">
  <Alert type="info">
    These settings help avoid detection by randomizing scraping patterns
  </Alert>
  
  <FormGroup label="Randomize Scraping Time">
    <Switch name="randomize_scraping_time" defaultValue={true} />
    <NumberInput name="time_jitter_minutes" defaultValue={60} min={0} max={180} />
    <HelpText>Add ±60 minutes jitter to scheduled tasks</HelpText>
  </FormGroup>
  
  <FormGroup label="Randomize Competitor Order">
    <Switch name="randomize_competitor_order" defaultValue={true} />
    <HelpText>Don't always scrape competitors in same order</HelpText>
  </FormGroup>
  
  <FormGroup label="Batch Processing">
    <Switch name="enable_batching" defaultValue={true} />
  </FormGroup>
  
  <FormGroup label="Batch Size" disabled={!enable_batching}>
    <NumberInput name="batch_size" defaultValue={10} min={5} max={50} />
  </FormGroup>
  
  <FormGroup label="Delay Between Batches (minutes)" disabled={!enable_batching}>
    <RangeInput
      name="batch_delay_minutes"
      min={5}
      max={60}
      defaultValue={[15, 30]}
    />
    <HelpText>Wait 15-30 minutes between batches</HelpText>
  </FormGroup>
  
  <FormGroup label="Use Refetch for Media Download">
    <Switch name="refetch_for_download" defaultValue={false} />
    <HelpText>Re-fetch media URL with different account (advanced anti-detection)</HelpText>
  </FormGroup>
</Card>
```

**Settings**:
- `anti_detection.randomize_scraping_time`: boolean
- `anti_detection.time_jitter_minutes`: number
- `anti_detection.randomize_competitor_order`: boolean
- `anti_detection.enable_batching`: boolean
- `anti_detection.batch_size`: number
- `anti_detection.batch_delay_minutes`: [min, max]
- `anti_detection.refetch_for_download`: boolean

**See**: `account-rotation-strategy.md`

---

## Section 7: SKU Linking

**Purpose**: Configure automatic and manual SKU linking

### UI Components

```tsx
<Card title="SKU Linking">
  <FormGroup label="Linking Strategy">
    <Checkbox value="keyword_match">
      <strong>Keyword Matching</strong>
      <Text>Match based on title/description keywords</Text>
    </Checkbox>
    <Checkbox value="ai_suggestion">
      <strong>AI Suggestions</strong>
      <Text>Use AI to suggest SKU matches</Text>
    </Checkbox>
    <Checkbox value="manual_review">
      <strong>Manual Review Queue</strong>
      <Text>Require manual approval for matches</Text>
    </Checkbox>
  </FormGroup>
  
  <FormGroup label="AI Similarity Threshold">
    <Slider
      name="ai_similarity_threshold"
      min={0.5}
      max={0.95}
      step={0.05}
      defaultValue={0.75}
      marks={{
        0.5: 'Low',
        0.75: 'Medium',
        0.95: 'High'
      }}
    />
    <HelpText>Higher = more strict matching</HelpText>
  </FormGroup>
  
  <FormGroup label="Auto-Link Threshold">
    <NumberInput name="auto_link_threshold" defaultValue={0.9} min={0.7} max={1.0} step={0.05} />
    <HelpText>Auto-link if confidence >= 90%</HelpText>
  </FormGroup>
  
  <FormGroup label="Process SKU Linking">
    <Select name="sku_linking_frequency" defaultValue="daily">
      <Option value="realtime">Immediately after scraping</Option>
      <Option value="hourly">Every hour</Option>
      <Option value="daily">Once per day (Recommended)</Option>
    </Select>
  </FormGroup>
</Card>
```

**Settings**:
- `sku_linking.strategies[]`: ["keyword_match", "ai_suggestion", "manual_review"]
- `sku_linking.ai_similarity_threshold`: number
- `sku_linking.auto_link_threshold`: number
- `sku_linking.frequency`: "realtime" | "hourly" | "daily"

**See**: `event-driven-architecture.md`

---

## Section 8: Alerts & Notifications

**Purpose**: Configure alerts for important events

### UI Components

```tsx
<Card title="Alerts & Notifications">
  <FormGroup label="Alert Channels">
    <Checkbox value="email">Email</Checkbox>
    <Checkbox value="slack">Slack</Checkbox>
    <Checkbox value="in_app">In-App Notifications</Checkbox>
  </FormGroup>
  
  <Divider />
  
  <SectionHeader>Alert Triggers</SectionHeader>
  
  <FormGroup label="Viral Spike Detection">
    <Switch name="alert_viral_spike" defaultValue={true} />
    <NumberInput name="viral_spike_threshold" defaultValue={200} min={50} max={500} />
    <Text>% growth in 3 hours</Text>
  </FormGroup>
  
  <FormGroup label="Follower Growth Spike">
    <Switch name="alert_follower_spike" defaultValue={true} />
    <NumberInput name="follower_spike_threshold" defaultValue={10} min={5} max={50} />
    <Text>% growth per day</Text>
  </FormGroup>
  
  <FormGroup label="New Competitor Detected">
    <Switch name="alert_new_competitor" defaultValue={true} />
    <HelpText>Alert when mentioned competitor is not in watchlist</HelpText>
  </FormGroup>
  
  <FormGroup label="Session Expired">
    <Switch name="alert_session_expired" defaultValue={true} />
    <HelpText>Alert when scraper account needs re-authentication</HelpText>
  </FormGroup>
  
  <FormGroup label="Scraping Failure">
    <Switch name="alert_scraping_failure" defaultValue={true} />
    <NumberInput name="consecutive_failures_threshold" defaultValue={3} min={1} max={10} />
    <Text>consecutive failures</Text>
  </FormGroup>
</Card>
```

**Settings**:
- `alerts.channels[]`: ["email", "slack", "in_app"]
- `alerts.viral_spike.enabled`: boolean
- `alerts.viral_spike.threshold_percent`: number
- `alerts.follower_spike.enabled`: boolean
- `alerts.follower_spike.threshold_percent`: number
- `alerts.new_competitor.enabled`: boolean
- `alerts.session_expired.enabled`: boolean
- `alerts.scraping_failure.enabled`: boolean
- `alerts.scraping_failure.consecutive_threshold`: number

---

## Section 9: Advanced Settings

**Purpose**: System-level and developer settings

### UI Components

```tsx
<Card title="Advanced Settings">
  <Alert type="warning">
    ⚠️ Advanced settings. Change only if you know what you're doing.
  </Alert>
  
  <FormGroup label="Kafka Configuration">
    <TextInput name="kafka_brokers" defaultValue="kafka:9092" />
    <TextInput name="kafka_consumer_group" defaultValue="competitor-intel" />
  </FormGroup>
  
  <FormGroup label="Database">
    <NumberInput name="snapshot_retention_days" defaultValue={365} min={30} max={730} />
    <HelpText>Keep engagement snapshots for N days</HelpText>
  </FormGroup>
  
  <FormGroup label="Worker Configuration">
    <NumberInput name="instagram_worker_replicas" defaultValue={3} min={1} max={10} />
    <NumberInput name="youtube_worker_replicas" defaultValue={2} min={1} max={10} />
  </FormGroup>
  
  <FormGroup label="Debug Mode">
    <Switch name="debug_mode" defaultValue={false} />
    <HelpText>Enable verbose logging</HelpText>
  </FormGroup>
  
  <FormGroup label="Dry Run Mode">
    <Switch name="dry_run_mode" defaultValue={false} />
    <HelpText>Simulate scraping without actually downloading media</HelpText>
  </FormGroup>
</Card>

<Card title="Data Management">
  <Button variant="danger" onClick={cleanupOldSnapshots}>
    Clean Up Old Snapshots
  </Button>
  <HelpText>Remove engagement snapshots older than retention period</HelpText>
  
  <Button variant="danger" onClick={resetAllJobs}>
    Reset All Jobs
  </Button>
  <HelpText>Clear all pending scraper jobs</HelpText>
  
  <Button onClick={exportConfiguration}>
    Export Configuration
  </Button>
  <HelpText>Download config as YAML file</HelpText>
  
  <Button onClick={importConfiguration}>
    Import Configuration
  </Button>
</Card>
```

**Settings**:
- `advanced.kafka_brokers`: string
- `advanced.kafka_consumer_group`: string
- `advanced.snapshot_retention_days`: number
- `advanced.instagram_worker_replicas`: number
- `advanced.youtube_worker_replicas`: number
- `advanced.debug_mode`: boolean
- `advanced.dry_run_mode`: boolean

---

## Complete Configuration Schema

### TypeScript Type Definition

```typescript
interface CompetitorIntelConfig {
  // 1. Account Management
  account_management: {
    strategy: 'single' | 'pool_rotation' | 'round_robin' | 'random';
    use_same_account_as_metadata: boolean;
    accounts: Array<{
      platform: 'instagram' | 'youtube';
      username: string;
      enabled: boolean;
    }>;
  };
  
  // 2. Scraping Configuration
  scraping: {
    discovery_frequency: '3h' | '6h' | '12h' | '24h';
    discovery_time: string;  // HH:MM
    max_posts_per_scrape: number;
    delay_between_competitors: [number, number];
    delay_between_requests: [number, number];
    max_retries: number;
    timeout_seconds: number;
  };
  
  // 3. Engagement Tracking
  engagement_tracking: {
    enabled: boolean;
    early_phase: {
      age_days: number;
      frequency_hours: number;
    };
    mature_phase: {
      start_age_days: number;
      end_age_days: number;
      frequency_hours: number;
      snapshot_time: string;
    };
    archive_phase: {
      start_age_days: number;
      enabled: boolean;
      frequency_days: number;
    };
  };
  
  // 4. Follower Tracking
  follower_tracking: {
    counts: {
      enabled: boolean;
      frequency: '12h' | 'daily' | 'weekly';
      schedule_cron: string;
    };
    full_lists: {
      enabled: boolean;
      max_competitors: number;
      max_followers_per_competitor: number;
      frequency: 'weekly' | 'biweekly' | 'monthly';
      growth_spike_threshold: number;
    };
  };
  
  // 5. Media Download
  media_download: {
    download_strategy: 'direct' | 'refetch';
    video_quality: string;
    max_file_size_mb: number;
    download_delay_seconds: [number, number];
    generate_thumbnails: boolean;
    thumbnail_width: number;
  };
  
  // 6. Anti-Detection
  anti_detection: {
    randomize_scraping_time: boolean;
    time_jitter_minutes: number;
    randomize_competitor_order: boolean;
    enable_batching: boolean;
    batch_size: number;
    batch_delay_minutes: [number, number];
    refetch_for_download: boolean;
  };
  
  // 7. SKU Linking
  sku_linking: {
    strategies: Array<'keyword_match' | 'ai_suggestion' | 'manual_review'>;
    ai_similarity_threshold: number;
    auto_link_threshold: number;
    frequency: 'realtime' | 'hourly' | 'daily';
  };
  
  // 8. Alerts
  alerts: {
    channels: Array<'email' | 'slack' | 'in_app'>;
    viral_spike: {
      enabled: boolean;
      threshold_percent: number;
    };
    follower_spike: {
      enabled: boolean;
      threshold_percent: number;
    };
    new_competitor: { enabled: boolean };
    session_expired: { enabled: boolean };
    scraping_failure: {
      enabled: boolean;
      consecutive_threshold: number;
    };
  };
  
  // 9. Advanced
  advanced: {
    kafka_brokers: string;
    kafka_consumer_group: string;
    snapshot_retention_days: number;
    instagram_worker_replicas: number;
    youtube_worker_replicas: number;
    debug_mode: boolean;
    dry_run_mode: boolean;
  };
}
```

---

## API Endpoints

### GET /api/settings

**Response**:
```json
{
  "account_management": { /* ... */ },
  "scraping": { /* ... */ },
  "engagement_tracking": { /* ... */ },
  // ... all sections
}
```

### PUT /api/settings

**Request Body**: Full config object

### PATCH /api/settings/{section}

**Example**: `PATCH /api/settings/engagement_tracking`

**Request Body**: Partial config for that section

---

## Default Configuration (Recommended)

```yaml
account_management:
  strategy: "single"  # Start simple
  use_same_account_as_metadata: true

scraping:
  discovery_frequency: "6h"
  discovery_time: "06:00"
  max_posts_per_scrape: 50
  delay_between_competitors: [10, 20]
  delay_between_requests: [3, 7]
  max_retries: 3
  timeout_seconds: 60

engagement_tracking:
  enabled: true
  early_phase:
    age_days: 3
    frequency_hours: 3
  mature_phase:
    start_age_days: 4
    end_age_days: 30
    frequency_hours: 24
    snapshot_time: "12:00"
  archive_phase:
    start_age_days: 31
    enabled: false

follower_tracking:
  enabled: true
  frequency: "twice_daily"
  schedules:
    - cron: "0 6 * * *"   # 6:00 AM UTC (morning snapshot)
      name: "morning"
    - cron: "0 18 * * *"  # 6:00 PM UTC (evening snapshot)
      name: "evening"
  delay_between_competitors_seconds: 30
  
  # Alerts
  alerts:
    growth_spike_threshold_percent: 10  # Alert if >10% growth in 12h
    drop_threshold_percent: 5  # Alert if >5% follower loss in 12h

anti_detection:
  randomize_scraping_time: true
  time_jitter_minutes: 60
  randomize_competitor_order: true
  enable_batching: true
  batch_size: 10
  batch_delay_minutes: [15, 30]
  refetch_for_download: false  # Advanced, disabled by default

sku_linking:
  strategies: ["keyword_match", "ai_suggestion"]
  ai_similarity_threshold: 0.75
  auto_link_threshold: 0.9
  frequency: "daily"

alerts:
  channels: ["in_app", "email"]
  viral_spike:
    enabled: true
    threshold_percent: 200
  follower_spike:
    enabled: true
    threshold_percent: 10
  session_expired:
    enabled: true
  scraping_failure:
    enabled: true
    consecutive_threshold: 3

advanced:
  snapshot_retention_days: 365
  instagram_worker_replicas: 3
  youtube_worker_replicas: 2
  debug_mode: false
  dry_run_mode: false
```

---

## Summary

**Total Configuration Sections**: 9  
**Total Settings**: ~60+ individual configurations  
**UI Components**: Forms, toggles, sliders, tables, time pickers  
**Complexity**: Medium-High (but well-organized)

**All configurations from**:
- ✅ Account rotation strategy
- ✅ Engagement tracking strategy
- ✅ Follower tracking strategy
- ✅ Anti-detection patterns
- ✅ Media download preferences
- ✅ SKU linking
- ✅ Alerts and notifications
- ✅ Advanced system settings

**Status**: ✅ Complete configuration UI specification  
**See Also**: All strategy documents referenced
