import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getStoreApiUrl } from '@/utils/api-config';
import { identityService } from '@/services/identity.service';
import {
  DeviceFleetStats,
  StoreDeviceItem,
  HourlyActivitySummary,
} from '@/services/storeAdminService';

export interface DeviceTasteProfile {
  deviceId: string;
  primaryUserId?: string | null;
  isIdentified: boolean;
  householdClusterId?: string | null;
  totalSessions: number;
  tasteProfile: Record<string, any>;
  lastSeenAt: string;
}

export interface StitchIdentityPayload {
  deviceId: string;
  userId: string;
  linkSource?: string;
  confidenceScore?: number;
}

export interface StitchIdentityResponse {
  id: number;
  deviceId: string;
  userId: string;
  confidenceScore: number;
  linkSource: string;
  isActive: boolean;
  createdAt: string;
}

export interface RollupResult {
  sessionsProcessed: number;
  profilesUpdated: number;
  signalsPurged: number;
  cutoffUtc: string;
}

export const telemetryApi = createApi({
  reducerPath: 'telemetryApi',
  baseQuery: fetchBaseQuery({
    baseUrl: getStoreApiUrl(),
    prepareHeaders: async (headers) => {
      try {
        const token = await identityService.getAccessTokenWithRefresh();
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
          headers.set('x-store-admin-key', token);
        }
      } catch (err) {
        console.warn('[telemetryApi] Failed to acquire auth token for query:', err);
      }
      return headers;
    },
  }),
  tagTypes: ['FleetStats', 'Devices', 'HourlyActivity', 'DeviceProfile'],
  endpoints: (builder) => ({
    // 1. Get Fleet Overview KPI Stats
    getFleetStats: builder.query<DeviceFleetStats, void>({
      query: () => '/api/v1/admin/telemetry/stats',
      providesTags: ['FleetStats'],
    }),

    // 2. Get Registered Devices Fleet
    getRegisteredDevices: builder.query<StoreDeviceItem[], { platform?: string; limit?: number; offset?: number } | void>({
      query: (args) => {
        const searchParams = new URLSearchParams();
        if (args?.platform && args.platform !== 'all') {
          searchParams.append('platform', args.platform);
        }
        if (args?.limit) searchParams.append('limit', String(args.limit));
        if (args?.offset) searchParams.append('offset', String(args.offset));
        const qs = searchParams.toString();
        return `/api/v1/admin/telemetry/devices${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Devices'],
    }),

    // 3. Get 24-Hour Activity by Time of Day (IST)
    getHourlyActivity: builder.query<HourlyActivitySummary, { days?: number } | void>({
      query: (args) => `/api/v1/admin/telemetry/activity/hourly?days=${args?.days ?? 30}`,
      providesTags: ['HourlyActivity'],
    }),

    // 4. Get Specific Device Taste Profile & Identity
    getDeviceProfile: builder.query<DeviceTasteProfile, string>({
      query: (deviceId) => `/api/v1/admin/telemetry/devices/${encodeURIComponent(deviceId)}/profile`,
      providesTags: (_result, _error, deviceId) => [{ type: 'DeviceProfile', id: deviceId }],
    }),

    // 5. Stitch Anonymous Device to User Account
    stitchDevice: builder.mutation<StitchIdentityResponse, StitchIdentityPayload>({
      query: (body) => ({
        url: '/api/v1/telemetry/stitch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FleetStats', 'Devices'],
    }),

    // 6. Trigger Background Rollup & 30-Day Purge
    triggerRollup: builder.mutation<RollupResult, { retentionDays?: number } | void>({
      query: (args) => ({
        url: `/api/v1/admin/telemetry/rollup/trigger?retentionDays=${args?.retentionDays ?? 30}`,
        method: 'POST',
      }),
      invalidatesTags: ['FleetStats', 'Devices', 'HourlyActivity'],
    }),
  }),
});

export const {
  useGetFleetStatsQuery,
  useGetRegisteredDevicesQuery,
  useGetHourlyActivityQuery,
  useGetDeviceProfileQuery,
  useStitchDeviceMutation,
  useTriggerRollupMutation,
} = telemetryApi;
