import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';

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
