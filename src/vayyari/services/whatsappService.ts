import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';

// ─── Accounts (Baileys session registry) ─────────────────────────────────────

export interface WaAccount {
  id: string;
  sessionId: string;
  phoneNumber: string | null;
  accountName: string | null;
  label: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWaAccountPayload {
  sessionId: string;
  label: string;
  phoneNumber?: string;
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export interface WhatsAppChannel {
  id: string;
  name: string;
  description?: string;
}

export interface CustomerChannelMembership {
  id: string;
  customerId: string;
  channelId: string;
  channelName: string;
  status: 'OPTED_IN' | 'OPTED_OUT';
  optedInAt: string;
  optedOutAt?: string;
}

export interface ChannelSubscriber {
  customerId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  status: string;
  optedInAt: string;
}

export const whatsappService = {
  // ── Accounts ──────────────────────────────────────────────────────────────

  getAccounts: async (): Promise<WaAccount[]> => {
    return await productMgmtApiClient.get<WaAccount[]>(API_ROUTES.WHATSAPP.ACCOUNTS);
  },

  createAccount: async (payload: CreateWaAccountPayload): Promise<WaAccount> => {
    return await productMgmtApiClient.post<WaAccount>(API_ROUTES.WHATSAPP.ACCOUNTS, payload);
  },

  deleteAccount: async (id: string): Promise<void> => {
    await productMgmtApiClient.delete(API_ROUTES.WHATSAPP.DELETE_ACCOUNT(id));
  },

  // ── Channels ──────────────────────────────────────────────────────────────

  getChannels: async () => {
    return await productMgmtApiClient.get<WhatsAppChannel[]>(API_ROUTES.WHATSAPP.CHANNELS);
  },

  createChannel: async (name: string, description?: string) => {
    return await productMgmtApiClient.post<WhatsAppChannel>(API_ROUTES.WHATSAPP.CHANNELS, { name, description });
  },

  deleteChannel: async (id: string) => {
    return await productMgmtApiClient.delete(API_ROUTES.WHATSAPP.DELETE_CHANNEL(id));
  },

  getChannelSubscribers: async (channelId: string) => {
    return await productMgmtApiClient.get<ChannelSubscriber[]>(API_ROUTES.WHATSAPP.SUBSCRIBERS(channelId));
  },

  getCustomerMemberships: async (customerId: string) => {
    return await productMgmtApiClient.get<CustomerChannelMembership[]>(API_ROUTES.WHATSAPP.MEMBERSHIPS(customerId));
  },

  subscribe: async (customerId: string, channelId: string) => {
    return await productMgmtApiClient.post(API_ROUTES.WHATSAPP.SUBSCRIBE(customerId, channelId));
  },

  unsubscribe: async (customerId: string, channelId: string) => {
    return await productMgmtApiClient.post(API_ROUTES.WHATSAPP.UNSUBSCRIBE(customerId, channelId));
  },
};

