import React, { useState } from 'react';
import { StyleSheet, View, Modal, ScrollView, Linking } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme, TextInput, Divider, Chip, Card, Badge } from 'react-native-paper';
import { NdrException, LogisticsOrder, NdrActionRequest } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';

interface NdrActionCenterProps {
  visible: boolean;
  onDismiss: () => void;
  order: LogisticsOrder;
  ndrException?: NdrException;
  onActionComplete: () => void;
}

export const NdrActionCenter: React.FC<NdrActionCenterProps> = ({
  visible,
  onDismiss,
  order,
  ndrException,
  onActionComplete,
}) => {
  const theme = useTheme();

  const [activeAction, setActiveAction] = useState<'Reattempt' | 'UpdateAddress' | 'RequestRTO' | 'BuyerContacted' | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [updatedAddress, setUpdatedAddress] = useState<string>(order.shippingAddress || '');
  const [updatedPhone, setUpdatedPhone] = useState<string>(order.customerPhone || '');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const currentNdr = ndrException || order.packages.find(p => p.ndrException)?.ndrException;

  const handleSendWhatsAppVerification = () => {
    const text = `Hi ${order.customerName},\nThis is from *Vayyari Logistics* regarding your Order *#${order.orderNumber}* (AWB: ${currentNdr?.awbNumber || ''}).\nOur courier agent attempted delivery today but could not reach you.\n\nPlease reply with:\n1. Preferred reattempt date & time\n2. Alternate contact number / landmark\n\nThank you!`;
    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`);
  };

  const handleExecuteAction = async (action: 'Reattempt' | 'UpdateAddress' | 'RequestRTO' | 'BuyerContacted') => {
    if (!currentNdr) return;
    try {
      setLoading(true);
      const req: NdrActionRequest = {
        ndrId: currentNdr.id,
        action,
        scheduledDate: action === 'Reattempt' ? scheduledDate : undefined,
        updatedAddress: action === 'UpdateAddress' ? updatedAddress : undefined,
        updatedPhone: action === 'UpdateAddress' ? updatedPhone : undefined,
        notes: notes.trim() || undefined,
      };
      await logisticsService.resolveNdrAction(req);
      onActionComplete();
      onDismiss();
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface
          style={[
            styles.sheet,
            {
              backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={5}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconButton icon="alert-octagon" size={26} iconColor={theme.colors.error} style={styles.headerIcon} />
              <View>
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  NDR Human-in-the-Loop Center
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Order #{order.orderNumber} • AWB: {currentNdr?.awbNumber || 'N/A'}
                </Text>
              </View>
            </View>
            <IconButton icon="close" size={22} onPress={onDismiss} />
          </View>

          <ScrollView style={styles.scrollArea}>
            {/* Exception Alert Card */}
            <Card style={styles.alertCard} mode="contained">
              <Card.Content>
                <View style={styles.alertCardHeader}>
                  <Chip
                    icon="clock-alert-outline"
                    style={{ backgroundColor: '#ffebee' }}
                    textStyle={{ color: '#c62828', fontWeight: 'bold' }}
                  >
                    Attempt #{currentNdr?.attemptNumber || 1} Failed
                  </Chip>
                  <Text style={styles.courierTag}>{currentNdr?.courier || 'Delhivery'}</Text>
                </View>

                <Text variant="titleSmall" style={styles.reasonTitle}>
                  Reason: {currentNdr?.reasonText || currentNdr?.reason || 'Customer Unavailable'}
                </Text>

                {currentNdr?.buyerFeedback && (
                  <View style={styles.feedbackBox}>
                    <Text variant="labelSmall" style={{ color: '#555', fontWeight: 'bold' }}>
                      Buyer Feedback / Courier Notes:
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#222', fontStyle: 'italic', marginTop: 2 }}>
                      "{currentNdr.buyerFeedback}"
                    </Text>
                  </View>
                )}

                <View style={styles.customerDetailRow}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Customer: <Text style={{ fontWeight: 'bold' }}>{order.customerName}</Text> ({order.customerPhone})
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    COD Balance: <Text style={{ fontWeight: 'bold', color: '#b71c1c' }}>₹{order.totalCodBalance}</Text>
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Quick Action Triggers */}
            <Text variant="titleSmall" style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>
              Resolution Actions:
            </Text>

            <View style={styles.actionsGrid}>
              {/* WhatsApp buyer */}
              <Surface style={styles.actionCard} elevation={1}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionIconBadge, { backgroundColor: '#e8f5e9' }]}>
                    <IconButton icon="whatsapp" size={22} iconColor="#25D366" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      WhatsApp Verification
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Send prefilled NDR inquiry message to buyer
                    </Text>
                  </View>
                </View>
                <Button
                  mode="outlined"
                  icon="whatsapp"
                  textColor="#1b5e20"
                  onPress={handleSendWhatsAppVerification}
                  style={styles.actionBtn}
                >
                  Send Message
                </Button>
              </Surface>

              {/* Schedule Reattempt */}
              <Surface style={styles.actionCard} elevation={1}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionIconBadge, { backgroundColor: '#e3f2fd' }]}>
                    <IconButton icon="calendar-clock" size={22} iconColor="#1565c0" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      Schedule Reattempt
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Set specific delivery date with courier
                    </Text>
                  </View>
                </View>
                {activeAction === 'Reattempt' ? (
                  <View style={styles.actionForm}>
                    <TextInput
                      mode="outlined"
                      label="Reattempt Date (YYYY-MM-DD)"
                      value={scheduledDate}
                      onChangeText={setScheduledDate}
                      style={styles.inputField}
                    />
                    <TextInput
                      mode="outlined"
                      label="Instructions / Landmark"
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="e.g. Call before delivery, deliver after 4 PM"
                      style={styles.inputField}
                    />
                    <View style={styles.formBtnRow}>
                      <Button mode="text" onPress={() => setActiveAction(null)}>Cancel</Button>
                      <Button
                        mode="contained"
                        loading={loading}
                        onPress={() => handleExecuteAction('Reattempt')}
                      >
                        Confirm Reattempt
                      </Button>
                    </View>
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    icon="calendar-sync"
                    onPress={() => setActiveAction('Reattempt')}
                    style={styles.actionBtn}
                  >
                    Select Date
                  </Button>
                )}
              </Surface>

              {/* Update Address */}
              <Surface style={styles.actionCard} elevation={1}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionIconBadge, { backgroundColor: '#fff3e0' }]}>
                    <IconButton icon="map-marker-radius" size={22} iconColor="#e65100" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      Update Address / Phone
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Correct delivery pincode, house # or phone
                    </Text>
                  </View>
                </View>
                {activeAction === 'UpdateAddress' ? (
                  <View style={styles.actionForm}>
                    <TextInput
                      mode="outlined"
                      label="Corrected Address"
                      multiline
                      value={updatedAddress}
                      onChangeText={setUpdatedAddress}
                      style={styles.inputField}
                    />
                    <TextInput
                      mode="outlined"
                      label="Alternate Phone Number"
                      value={updatedPhone}
                      onChangeText={setUpdatedPhone}
                      style={styles.inputField}
                    />
                    <View style={styles.formBtnRow}>
                      <Button mode="text" onPress={() => setActiveAction(null)}>Cancel</Button>
                      <Button
                        mode="contained"
                        loading={loading}
                        onPress={() => handleExecuteAction('UpdateAddress')}
                      >
                        Push Address to Delhivery
                      </Button>
                    </View>
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    icon="pencil-outline"
                    onPress={() => setActiveAction('UpdateAddress')}
                    style={styles.actionBtn}
                  >
                    Edit Shipping Details
                  </Button>
                )}
              </Surface>

              {/* Request RTO */}
              <Surface style={[styles.actionCard, { borderColor: '#ef9a9a' }]} elevation={1}>
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionIconBadge, { backgroundColor: '#ffebee' }]}>
                    <IconButton icon="keyboard-return" size={22} iconColor="#c62828" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#c62828' }}>
                      Request RTO (Return to Origin)
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Cancel reattempts & return package to Central Hub
                    </Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  buttonColor="#c62828"
                  textColor="#fff"
                  loading={loading}
                  icon="keyboard-return"
                  onPress={() => handleExecuteAction('RequestRTO')}
                  style={styles.actionBtn}
                >
                  Initiate RTO
                </Button>
              </Surface>
            </View>

            {/* Audit History */}
            {currentNdr?.history && currentNdr.history.length > 0 && (
              <View style={styles.historySection}>
                <Text variant="titleSmall" style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>
                  NDR Event History:
                </Text>
                {currentNdr.history.map((h, i) => (
                  <View key={h.id || i} style={styles.historyItem}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyTextContainer}>
                      <Text style={styles.historyAction}>{h.action}</Text>
                      {h.notes && <Text style={styles.historyNotes}>{h.notes}</Text>}
                      <Text style={styles.historyTime}>
                        {new Date(h.timestamp).toLocaleString()} • {h.actor}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    margin: 0,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollArea: {
    marginVertical: 4,
  },
  alertCard: {
    backgroundColor: '#fff8f8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    marginBottom: 14,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courierTag: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  reasonTitle: {
    fontWeight: 'bold',
    color: '#b71c1c',
    fontSize: 14,
  },
  feedbackBox: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 6,
  },
  customerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#ffebee',
  },
  sectionHeading: {
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 6,
  },
  actionsGrid: {
    gap: 10,
  },
  actionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    backgroundColor: '#fff',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTextCol: {
    flex: 1,
  },
  actionBtn: {
    borderRadius: 10,
    marginTop: 2,
  },
  actionForm: {
    marginTop: 8,
    gap: 8,
  },
  inputField: {
    fontSize: 13,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  historySection: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c62828',
    marginTop: 5,
    marginRight: 10,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyAction: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222',
  },
  historyNotes: {
    fontSize: 11,
    color: '#555',
  },
  historyTime: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
});
