import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { LuX, LuCalendar, LuClock, LuCheckCircle2, LuTruck } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { searchApiClient } from '@/api/client';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';
import { PickupResponseDto } from '@/types/logistics';

export interface SchedulePickupModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (pickupInfo?: {
    pickupDate: string;
    pickupTime: string;
    pickupId?: string;
    displayInfo: string;
  }) => void;
  pickupLocation: string; // Delhivery registered warehouse name
  expectedPackageCount?: number;
  orderGrpId?: string;
  awbNumber?: string;
  isReschedule?: boolean;
}

interface DateTile {
  label: string;   // TODAY / TOM / MON etc.
  date: string;    // YYYY-MM-DD
  display: string; // "11 Oct"
}

interface TimeSlot {
  label: string;   // "2:00 PM – 6:00 PM"
  value: string;   // "14:00:00"
  display: string; // "14:00 - 18:00"
}

const TIME_SLOTS: TimeSlot[] = [
  { label: '2:00 PM – 6:00 PM', value: '14:00:00', display: '14:00 - 18:00' },
  { label: '6:00 PM – 9:00 PM', value: '18:00:00', display: '18:00 - 21:00' },
];

function buildDateTiles(): DateTile[] {
  const today = new Date();
  return [0, 1, 2].map(offset => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const label =
      offset === 0 ? 'TODAY' :
      offset === 1 ? 'TOM' :
      d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const display = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
    const date = d.toISOString().split('T')[0];
    return { label, date, display };
  });
}

export function SchedulePickupModal({
  visible,
  onDismiss,
  onSuccess,
  pickupLocation,
  expectedPackageCount = 1,
  orderGrpId,
  awbNumber,
  isReschedule = false,
}: SchedulePickupModalProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const dates = buildDateTiles();
  const [selectedDate, setSelectedDate] = useState<DateTile>(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>(TIME_SLOTS[0]);
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState('');
  const [lastPickupInfo, setLastPickupInfo] = useState<{
    pickupDate: string;
    pickupTime: string;
    pickupId?: string;
    displayInfo: string;
  } | null>(null);

  const handleSchedule = async () => {
    if (!pickupLocation) {
      Alert.alert('Missing Info', 'No pickup location configured for this warehouse.');
      return;
    }
    setLoading(true);
    try {
      const res = await searchApiClient.post<PickupResponseDto>('/api/v1/logistics/pickups/schedule', {
        pickupLocation: pickupLocation.trim(),
        pickupDate: selectedDate.date,
        pickupTime: selectedSlot.value,
        expectedPackageCount,
        orderGrpId,
        awbNumber,
      });

      if (res && res.success === false) {
        const errMsg = res.message || 'Failed to schedule pickup.';
        Alert.alert('Pickup Failed', errMsg);
        return;
      }

      const pId = res?.pickupId || undefined;
      const slotText = res?.pickupSlot || selectedSlot.display;
      setLastPickupInfo({
        pickupDate: selectedDate.display,
        pickupTime: slotText,
        pickupId: pId,
        displayInfo: `${selectedDate.display} • ${slotText}`,
      });

      if (res?.prExist || res?.message?.toLowerCase().includes('already exist')) {
        const idText = pId ? ` (Request ID: ${pId})` : '';
        setScheduledInfo(
          `A pickup visit is already confirmed for this warehouse on ${selectedDate.display} between ${slotText}${idText}. This package will be collected during that visit when scanned by Delhivery.`
        );
      } else {
        const idSuffix = pId ? ` (ID: ${pId})` : '';
        setScheduledInfo(`${selectedDate.display} between ${slotText}${idSuffix}`);
      }
      setConfirmVisible(true);
    } catch (err: any) {
      let errMsg = 'Unknown error';
      if (err?.error?.message) {
        errMsg = err.error.message;
      } else if (err?.message) {
        errMsg = err.message;
      }
      Alert.alert('Pickup Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = () => {
    setConfirmVisible(false);
    onSuccess(lastPickupInfo || undefined);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
        >
          <YStack
            backgroundColor={tokens.background}
            borderTopLeftRadius={tokens.radius.xl}
            borderTopRightRadius={tokens.radius.xl}
            borderTopWidth={1}
            borderColor={tokens.border}
            paddingTop={4}
            paddingBottom={Math.max(insets.bottom, 16)}
            style={{ maxHeight: '88%' }}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: tokens.border,
                alignSelf: 'center',
                marginBottom: 8,
                marginTop: 8,
              }}
            />

            {/* Header */}
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={16}
              paddingBottom={12}
              borderBottomWidth={1}
              borderBottomColor={tokens.border}
            >
              <XStack alignItems="center" gap={10}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: `${tokens.accent}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LuTruck size={16} color={tokens.accent} />
                </View>
                <YStack>
                  <Text fontSize={15} fontWeight="800" color={tokens.text}>
                    {isReschedule ? 'Reschedule Pickup' : 'Schedule Pickup'}
                  </Text>
                  <Text fontSize={11} color={tokens.textMuted}>
                    {pickupLocation || 'Warehouse'}
                  </Text>
                </YStack>
              </XStack>
              <Pressable
                onPress={onDismiss}
                hitSlop={12}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.5 : 1,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: tokens.surfaceRaised,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <LuX size={16} color={tokens.textMuted} />
              </Pressable>
            </XStack>

            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Date Selection */}
              <YStack gap={10}>
                <XStack alignItems="center" gap={6}>
                  <LuCalendar size={14} color={tokens.textMuted} />
                  <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8}>
                    SELECT DATE
                  </Text>
                </XStack>
                <XStack gap={8}>
                  {dates.map(tile => {
                    const isSelected = tile.date === selectedDate.date;
                    return (
                      <Pressable
                        key={tile.date}
                        onPress={() => setSelectedDate(tile)}
                        style={({ pressed }) => ({
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 8,
                          borderRadius: tokens.radius.md,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? tokens.accent : tokens.border,
                          backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surface,
                          alignItems: 'center',
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <Text
                          fontSize={10}
                          fontWeight="700"
                          color={isSelected ? tokens.accent : tokens.textMuted}
                          letterSpacing={0.5}
                        >
                          {tile.label}
                        </Text>
                        <Text
                          fontSize={13}
                          fontWeight="800"
                          color={isSelected ? tokens.accent : tokens.text}
                          marginTop={2}
                        >
                          {tile.display}
                        </Text>
                      </Pressable>
                    );
                  })}
                </XStack>
              </YStack>

              {/* Time Slot Selection */}
              <YStack gap={10}>
                <XStack alignItems="center" gap={6}>
                  <LuClock size={14} color={tokens.textMuted} />
                  <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8}>
                    SELECT TIME SLOT
                  </Text>
                </XStack>
                <YStack gap={8}>
                  {TIME_SLOTS.map(slot => {
                    const isSelected = slot.value === selectedSlot.value;
                    return (
                      <Pressable
                        key={slot.value}
                        onPress={() => setSelectedSlot(slot)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 14,
                          paddingHorizontal: 14,
                          borderRadius: tokens.radius.md,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? tokens.accent : tokens.border,
                          backgroundColor: isSelected ? `${tokens.accent}10` : tokens.surface,
                          opacity: pressed ? 0.75 : 1,
                          gap: 12,
                        })}
                      >
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: isSelected ? 5 : 1.5,
                            borderColor: isSelected ? tokens.accent : tokens.border,
                            backgroundColor: tokens.background,
                          }}
                        />
                        <YStack flex={1}>
                          <Text
                            fontSize={14}
                            fontWeight="700"
                            color={isSelected ? tokens.accent : tokens.text}
                          >
                            {slot.display}
                          </Text>
                          <Text fontSize={11} color={tokens.textMuted}>
                            {slot.label}
                          </Text>
                        </YStack>
                        {isSelected && (
                          <LuCheckCircle2 size={16} color={tokens.accent} />
                        )}
                      </Pressable>
                    );
                  })}
                </YStack>
              </YStack>
            </ScrollView>

            {/* Schedule Button */}
            <YStack paddingHorizontal={16} paddingTop={12} gap={0}>
              <Pressable
                onPress={handleSchedule}
                disabled={loading}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: tokens.radius.md,
                  backgroundColor: loading || pressed ? `${tokens.accent}CC` : tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                })}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={tokens.accentForeground} />
                ) : (
                  <>
                    <LuTruck size={16} color={tokens.accentForeground} />
                    <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.5}>
                      {isReschedule ? 'CONFIRM RESCHEDULE' : 'SCHEDULE PICKUP'}
                    </Text>
                  </>
                )}
              </Pressable>
            </YStack>
          </YStack>
        </View>
      </Modal>

      {/* Success Dialog */}
      <ConfirmDialog
        visible={confirmVisible}
        title={
          scheduledInfo.toLowerCase().includes('already confirmed') ||
          scheduledInfo.toLowerCase().includes('already exist')
            ? 'Pickup Already Confirmed'
            : 'Pickup Scheduled'
        }
        message={
          scheduledInfo.toLowerCase().includes('already confirmed') ||
          scheduledInfo.toLowerCase().includes('already exist')
            ? scheduledInfo
            : `Your pickup has been scheduled for ${scheduledInfo}.`
        }
        intent="success"
        icon={<LuCheckCircle2 size={20} color="#16a34a" />}
        singleButton
        confirmLabel="Done"
        onConfirm={handleConfirmClose}
        onCancel={handleConfirmClose}
        dismissOnBackdropPress
      />
    </>
  );
}
