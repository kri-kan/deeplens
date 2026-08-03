import Constants from 'expo-constants';

export interface FailedItem {
    messageId: string;
    groupId: string;
    groupName?: string;
    status: string;
    rawText: string;
    createdAt: string;
    updatedAt: string;
    errorReason: string;
}

const WHATSAPP_API = process.env.EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL;

export async function fetchFailedItems(): Promise<FailedItem[]> {
    if (!WHATSAPP_API) {
        throw new Error("EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL is not defined in .env");
    }

    const res = await fetch(`${WHATSAPP_API}/api/group-review/failed-items`);
    if (!res.ok) {
        throw new Error('Failed to fetch failed items');
    }
    return await res.json();
}

export async function retryFailedItem(groupId: string): Promise<boolean> {
    if (!WHATSAPP_API) {
        throw new Error("EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL is not defined in .env");
    }

    const res = await fetch(`${WHATSAPP_API}/api/group-review/${groupId}/retry`, {
        method: 'POST'
    });
    
    if (!res.ok) {
        throw new Error(`Failed to retry item ${groupId}`);
    }
    return true;
}
