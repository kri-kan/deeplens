export interface VIPMember {
  id: string;
  name: string;
  email: string;
  vipCode: string;
  joinedAt: string;
  interests: string[];
}

export interface CapsuleItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  fabric: string;
  origin: string;
  description: string;
  previewImage?: string;
  tag: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'gold';
  message: string;
}
