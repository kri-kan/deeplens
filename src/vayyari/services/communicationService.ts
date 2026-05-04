import { productMgmtApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';

export interface BroadcastChannel {
  id: string;
  name: string;
  description?: string;
  channelType: string;
  metadata?: string;
  createdAt: string;
}

export interface PurposeMapping {
  id: string;
  purposeKey: string;
  channelId: string;
  channelName: string;
  createdAt: string;
}

export interface PurposeWithChannels {
  purposeKey: string;
  channels: PurposeMapping[];
}

export interface PurposeCustomer {
  customerId: string;
  customerName: string;
  phoneNumber: string;
  createdAt: string;
  assignedChannelId?: string;
  assignedChannelName?: string;
}

export interface ChannelType {
  typeKey: string;
  name: string;
  memberLimit: number;
  description?: string;
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  channelType: string;
  metadata?: string;
}

class CommunicationService {
  async getAllChannels(): Promise<BroadcastChannel[]> {
    return productMgmtApiClient.get<BroadcastChannel[]>(API_ROUTES.COMMUNICATION.CHANNELS);
  }

  async getChannelById(id: string): Promise<BroadcastChannel> {
    return productMgmtApiClient.get<BroadcastChannel>(API_ROUTES.COMMUNICATION.CHANNEL_DETAIL(id));
  }

  async createChannel(request: CreateChannelRequest): Promise<BroadcastChannel> {
    return productMgmtApiClient.post<BroadcastChannel>(API_ROUTES.COMMUNICATION.CHANNELS, request);
  }

  async deleteChannel(id: string): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.COMMUNICATION.CHANNEL_DETAIL(id));
  }

  async getChannelTypes(): Promise<ChannelType[]> {
    return productMgmtApiClient.get<ChannelType[]>(API_ROUTES.COMMUNICATION.CHANNEL_TYPES);
  }

  async getPurposes(): Promise<string[]> {
    return productMgmtApiClient.get<string[]>(API_ROUTES.COMMUNICATION.PURPOSES);
  }

  async createPurpose(purposeKey: string, name: string): Promise<void> {
    return productMgmtApiClient.post(API_ROUTES.COMMUNICATION.PURPOSES, { purposeKey, name });
  }
  
  async getPurposesDetailed(): Promise<PurposeWithChannels[]> {
    return productMgmtApiClient.get<PurposeWithChannels[]>(API_ROUTES.COMMUNICATION.PURPOSES_DETAILED);
  }

  async getChannelsByPurpose(purposeKey: string): Promise<PurposeMapping[]> {
    return productMgmtApiClient.get<PurposeMapping[]>(API_ROUTES.COMMUNICATION.PURPOSE_CHANNELS(purposeKey));
  }

  async getUnlinkedChannels(purposeKey: string): Promise<BroadcastChannel[]> {
    return productMgmtApiClient.get<BroadcastChannel[]>(API_ROUTES.COMMUNICATION.UNLINKED_CHANNELS(purposeKey));
  }

  async addChannelToPurpose(purposeKey: string, channelId: string): Promise<void> {
    return productMgmtApiClient.post(API_ROUTES.COMMUNICATION.ADD_TO_PURPOSE(purposeKey, channelId));
  }

  async removeChannelFromPurpose(purposeKey: string, channelId: string): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.COMMUNICATION.REMOVE_FROM_PURPOSE(purposeKey, channelId));
  }

  async getPurposeCustomers(purposeKey: string): Promise<PurposeCustomer[]> {
    return productMgmtApiClient.get<PurposeCustomer[]>(API_ROUTES.COMMUNICATION.PURPOSE_CUSTOMERS(purposeKey));
  }

  async getUnassignedPurposeCustomers(purposeKey: string): Promise<PurposeCustomer[]> {
    return productMgmtApiClient.get<PurposeCustomer[]>(API_ROUTES.COMMUNICATION.UNASSIGNED_CUSTOMERS(purposeKey));
  }

  async addCustomersToPurpose(purposeKey: string, customerIds: string[]): Promise<void> {
    return productMgmtApiClient.post(API_ROUTES.COMMUNICATION.PURPOSE_CUSTOMERS(purposeKey), customerIds);
  }

  async removeCustomersFromPurpose(purposeKey: string, customerIds: string[]): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.COMMUNICATION.PURPOSE_CUSTOMERS(purposeKey), customerIds);
  }

  async distributeToChannels(purposeKey: string): Promise<{ count: number }> {
    return productMgmtApiClient.post<{ count: number }>(API_ROUTES.COMMUNICATION.DISTRIBUTE(purposeKey));
  }
}

export const communicationService = new CommunicationService();
