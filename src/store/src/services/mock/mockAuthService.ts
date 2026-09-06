export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  isGuest: boolean;
  deliveryPincode?: string;
  city?: string;
  preferences?: string[];
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  message?: string;
}

export const mockAuthService = {
  async sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 600));
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      return { success: false, message: 'Please enter a valid 10-digit Indian mobile number.' };
    }
    return { success: true, message: 'OTP sent! Use code 123456 for testing.' };
  },

  async verifyPhoneOtp(phone: string, otp: string): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 800));
    if (otp !== '123456') {
      return { success: false, message: 'Invalid OTP code. Please use 123456 for testing.' };
    }
    const user: UserProfile = {
      id: `usr-${Date.now()}`,
      name: `Artisan Patron (+91 ${phone.slice(-4)})`,
      phone: `+91 ${phone}`,
      isGuest: false,
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      token: `mock-jwt-${Date.now()}`,
      user,
      message: 'Welcome back to Vayyari!',
    };
  },

  async signInWithGoogle(): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 900));
    const user: UserProfile = {
      id: `google-${Date.now()}`,
      name: 'Priyanka Sharma',
      email: 'priyanka.sharma@example.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isGuest: false,
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      token: `mock-google-jwt-${Date.now()}`,
      user,
      message: 'Signed in with Google successfully!',
    };
  },

  createGuestUser(): UserProfile {
    return {
      id: `guest-${Date.now()}`,
      name: 'Guest Explorer',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
  }
};
