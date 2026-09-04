import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { LuPlus, LuCheck, LuMapPin } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type AddressData = {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  type: 'home' | 'work' | 'studio';
  isDefault?: boolean;
};

export const INITIAL_ADDRESSES: AddressData[] = [
  {
    id: 'addr1',
    name: 'Priya Sharma',
    phone: '9876543210',
    street: 'Flat 402, Royal Palms Residency, 12th Main, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    type: 'home',
    isDefault: true,
  },
  {
    id: 'addr2',
    name: 'Priya Sharma (Artisan Studio)',
    phone: '9876543210',
    street: 'Studio 14, Heritage Craft Block, HSR Layout Sector 3',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560102',
    type: 'studio',
  },
];

export type AddressSelectorProps = {
  addresses?: AddressData[];
  selectedAddressId?: string;
  onSelectAddress?: (id: string) => void;
  onAddNewAddress?: (address: Omit<AddressData, 'id'>) => void;
};

export function AddressSelector({
  addresses = INITIAL_ADDRESSES,
  selectedAddressId = 'addr1',
  onSelectAddress,
  onAddNewAddress,
}: AddressSelectorProps) {
  const { tokens } = useTheme();
  const [selectedId, setSelectedId] = useState(selectedAddressId);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [type, setType] = useState<'home' | 'work' | 'studio'>('home');
  const [error, setError] = useState('');

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectAddress?.(id);
  };

  const handleSaveAddress = () => {
    if (!name.trim() || !phone.trim() || !street.trim() || !pincode.trim()) {
      setError('Please fill in all required address fields');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError('Please enter a valid 6-digit PIN code');
      return;
    }

    setError('');
    onAddNewAddress?.({
      name: name.trim(),
      phone: phone.trim(),
      pincode: pincode.trim(),
      street: street.trim(),
      city: city.trim() || 'Bengaluru',
      state: state.trim() || 'Karnataka',
      type,
      isDefault: false,
    });
    setIsAddingNew(false);
  };

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={16}
      gap={14}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap={8}>
          <LuMapPin size={16} color={tokens.accent} />
          <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.8}>
            Select Delivery Address
          </Text>
        </XStack>

        <XStack
          cursor="pointer"
          paddingHorizontal={12}
          paddingVertical={5}
          borderRadius={6}
          borderWidth={1}
          borderColor={tokens.accent}
          onPress={() => setIsAddingNew((o) => !o)}
          hoverStyle={{ backgroundColor: tokens.accentSubtle }}
        >
          <Text fontSize={11} fontWeight="800" color={tokens.accent} textTransform="uppercase">
            {isAddingNew ? 'Cancel' : '+ Add New Address'}
          </Text>
        </XStack>
      </XStack>

      {/* Address Cards List */}
      <YStack gap={10}>
        {addresses.map((addr) => {
          const isSelected = selectedId === addr.id;
          return (
            <XStack
              key={addr.id}
              padding={14}
              borderRadius={12}
              borderWidth={1.5}
              borderColor={isSelected ? '#e53935' : tokens.border}
              backgroundColor={isSelected ? tokens.surfaceRaised : tokens.background}
              cursor="pointer"
              onPress={() => handleSelect(addr.id)}
              gap={12}
              alignItems="flex-start"
            >
              {/* Radio Indicator */}
              <XStack
                width={20}
                height={20}
                borderRadius={10}
                borderWidth={2}
                borderColor={isSelected ? '#e53935' : tokens.borderStrong}
                alignItems="center"
                justifyContent="center"
                marginTop={2}
              >
                {isSelected && (
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#e53935" />
                )}
              </XStack>

              {/* Address Details */}
              <YStack flex={1} gap={4}>
                <XStack alignItems="center" gap={8} flexWrap="wrap">
                  <Text fontSize={14} fontWeight="800" color={tokens.text}>
                    {addr.name}
                  </Text>
                  <XStack
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={4}
                    backgroundColor={tokens.surface}
                    borderWidth={1}
                    borderColor={tokens.border}
                  >
                    <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                      {addr.type}
                    </Text>
                  </XStack>
                  {addr.isDefault && (
                    <XStack
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={4}
                      backgroundColor="rgba(46, 125, 50, 0.1)"
                    >
                      <Text fontSize={10} fontWeight="800" color="#2e7d32">
                        DEFAULT
                      </Text>
                    </XStack>
                  )}
                </XStack>

                <Text fontSize={12} color={tokens.textSecondary} lineHeight={18}>
                  {addr.street}, {addr.city}, {addr.state} - <Text fontWeight="700" color={tokens.text}>{addr.pincode}</Text>
                </Text>

                <Text fontSize={12} color={tokens.textSecondary} marginTop={2}>
                  Mobile: <Text fontWeight="700" color={tokens.text}>+91 {addr.phone}</Text>
                </Text>
              </YStack>
            </XStack>
          );
        })}
      </YStack>

      {/* Add New Address Form */}
      {isAddingNew && (
        <YStack
          marginTop={8}
          paddingTop={14}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          gap={12}
        >
          <Text fontSize={12} fontWeight="800" color={tokens.text}>
            Add New Address
          </Text>

          {/* Form Fields */}
          <XStack gap={10} flexWrap="wrap">
            <XStack flex={1} minWidth={200}>
              <Input
                placeholder="Full Name *"
                value={name}
                onChangeText={setName}
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
              />
            </XStack>
            <XStack flex={1} minWidth={200}>
              <Input
                placeholder="Mobile Number (10 digits) *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
              />
            </XStack>
          </XStack>

          <Input
            placeholder="Flat, House no., Building, Street Address *"
            value={street}
            onChangeText={setStreet}
            size="$3"
            fontSize={12}
            backgroundColor={tokens.background}
            color={tokens.text}
          />

          <XStack gap={10} flexWrap="wrap">
            <XStack flex={1} minWidth={140}>
              <Input
                placeholder="Pincode (6 digits) *"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
              />
            </XStack>
            <XStack flex={1} minWidth={140}>
              <Input
                placeholder="City / Town *"
                value={city}
                onChangeText={setCity}
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
              />
            </XStack>
            <XStack flex={1} minWidth={140}>
              <Input
                placeholder="State *"
                value={state}
                onChangeText={setState}
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
              />
            </XStack>
          </XStack>

          {/* Address Type Selector */}
          <XStack alignItems="center" gap={10}>
            <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
              Address Type:
            </Text>
            {(['home', 'studio', 'work'] as const).map((t) => (
              <XStack
                key={t}
                paddingHorizontal={12}
                paddingVertical={5}
                borderRadius={6}
                cursor="pointer"
                backgroundColor={type === t ? tokens.accent : tokens.surfaceRaised}
                onPress={() => setType(t)}
              >
                <Text
                  fontSize={11}
                  fontWeight="700"
                  color={type === t ? tokens.accentForeground : tokens.text}
                  textTransform="capitalize"
                >
                  {t}
                </Text>
              </XStack>
            ))}
          </XStack>

          {error ? (
            <Text fontSize={11} color={tokens.error} fontWeight="700">
              {error}
            </Text>
          ) : null}

          <XStack
            cursor="pointer"
            backgroundColor="#e53935"
            paddingVertical={12}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            onPress={handleSaveAddress}
          >
            <Text fontSize={12} fontWeight="900" color="#ffffff" letterSpacing={0.8}>
              SAVE & DELIVER HERE
            </Text>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
