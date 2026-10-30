import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { WhatsAppAuthCard, WhatsAppAuthCardProps } from '@/components/tamagui-ui/molecules/WhatsAppAuthCard/WhatsAppAuthCard';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/WhatsAppAuthCard',
  component: WhatsAppAuthCard,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WhatsAppAuthCard>;

export const PhoneEntry: Story = {
  name: '1. Phone Entry State (Initial)',
  render: () => {
    const [phone, setPhone] = useState('9876543210');
    return (
      <WhatsAppAuthCard
        step="phone"
        phone={phone}
        onPhoneChange={setPhone}
        otp=""
        onOtpChange={() => {}}
        onSendOtp={() => alert('Sending OTP...')}
        onVerifyOtp={() => {}}
      />
    );
  },
};

export const OtpVerification: Story = {
  name: '2. OTP Verification (Mock Mode Active)',
  render: () => {
    const [otp, setOtp] = useState('4281');
    return (
      <WhatsAppAuthCard
        step="otp"
        phone="+91 98765 43210"
        onPhoneChange={() => {}}
        otp={otp}
        onOtpChange={setOtp}
        mockOtpHint="428190"
        resendCountdown={45}
        onSendOtp={() => alert('Resending...')}
        onVerifyOtp={() => alert('Verifying OTP...')}
        onEditPhone={() => alert('Editing phone...')}
      />
    );
  },
};

export const OtpVerificationError: Story = {
  name: '3. OTP Error (Invalid Code)',
  render: () => {
    const [otp, setOtp] = useState('111111');
    return (
      <WhatsAppAuthCard
        step="otp"
        phone="+91 98765 43210"
        onPhoneChange={() => {}}
        otp={otp}
        onOtpChange={setOtp}
        errorMessage="Invalid verification code. 3 attempt(s) remaining."
        resendCountdown={0}
        onSendOtp={() => alert('Resending...')}
        onVerifyOtp={() => alert('Verifying OTP...')}
        onEditPhone={() => alert('Editing phone...')}
      />
    );
  },
};

export const AuthenticatedMember: Story = {
  name: '4. Authenticated 365-Day Session',
  render: () => {
    return (
      <WhatsAppAuthCard
        step="authenticated"
        phone="+91 98765 43210"
        onPhoneChange={() => {}}
        otp=""
        onOtpChange={() => {}}
        onSendOtp={() => {}}
        onVerifyOtp={() => {}}
        onLogout={() => alert('Signing out...')}
        customerProfile={{
          userId: 'usr_wa_919876543210',
          phone: '+919876543210',
          fullName: 'Priya Sharma',
        }}
      />
    );
  },
};
