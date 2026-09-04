import React, { useState } from 'react';
import { StyleSheet, View, Modal, ScrollView, Linking } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme, TextInput, Divider, Chip, Card, Menu } from 'react-native-paper';
import { LogisticsEscalation, LogisticsOrder, CreateEscalationRequest, EscalationIssueType, CourierName } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';

interface EscalationTrackerProps {
  visible: boolean;
  onDismiss: () => void;
  order: LogisticsOrder;
  onEscalationCreated?: () => void;
  onActionComplete?: () => void;
}

const ISSUE_TYPE_LABELS: Record<EscalationIssueType, string> = {
  FakeDeliveryAttempt: 'Fake Delivery Attempt (Agent did not visit)',
  LostInTransit: 'Package Lost / Missing in Transit',
  DamagedGoods: 'Damaged Goods / Tampered Outer Box',
  WeightDiscrepancy: 'Weight Discrepancy / Overcharge Dispute',
  CodRemittanceDelay: 'COD Remittance / Cash Delay',
  CourierMisbehavior: 'Courier Staff Misbehavior / Unreachable',
  Other: 'Other Logistics Issue',
};

export const EscalationTracker: React.FC<EscalationTrackerProps> = ({
  visible,
  onDismiss,
  order,
  onEscalationCreated,
  onActionComplete,
}) => {
  const theme = useTheme();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<EscalationIssueType>('FakeDeliveryAttempt');
  const [issueMenuVisible, setIssueMenuVisible] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(order.packages[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const allEscalations = order.packages.flatMap(p => p.escalations || []);
  const activePackage = order.packages.find(p => p.id === selectedPackageId) || order.packages[0];

  const handleOpenDelhiveryCrm = () => {
    Linking.openURL('https://one.delhivery.com/support/tickets');
  };

  const handleSubmitEscalation = async () => {
    if (!title.trim() || !description.trim()) return;
    try {
      setLoading(true);
      const req: CreateEscalationRequest = {
        orderId: order.id,
        packageId: selectedPackageId || order.packages[0]?.id,
        awbNumber: activePackage?.delhiveryAwbNumber || activePackage?.vendorAwbNumber || 'PENDING-AWB',
        courier: (activePackage?.delhiveryAwbNumber ? 'Delhivery' : 'Custom') as CourierName,
        issueType: selectedIssueType,
        title: title.trim(),
        description: description.trim(),
        claimAmount: claimAmount ? parseFloat(claimAmount) : undefined,
      };

      await logisticsService.createEscalation(req);
      onEscalationCreated?.();
      onActionComplete?.();
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setClaimAmount('');
    } catch {
      // Error handling
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
              <IconButton icon="shield-alert-outline" size={26} iconColor="#e65100" style={styles.headerIcon} />
              <View>
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  Logistics Escalation & Dispute Center
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Order #{order.orderNumber} • {order.customerName}
                </Text>
              </View>
            </View>
            <IconButton icon="close" size={22} onPress={onDismiss} />
          </View>

          {/* Delhivery One CRM Quick Link Bar */}
          <Surface style={styles.crmLinkBar} elevation={1}>
            <View style={styles.crmInfo}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#000' }}>
                Delhivery One CRM Portal
              </Text>
              <Text variant="bodySmall" style={{ color: '#555' }}>
                Direct SLA escalation & ticket management
              </Text>
            </View>
            <Button
              mode="contained"
              buttonColor="#000"
              textColor="#fff"
              icon="open-in-new"
              onPress={handleOpenDelhiveryCrm}
              style={styles.crmBtn}
            >
              Open CRM
            </Button>
          </Surface>

          <ScrollView style={styles.scrollArea}>
            {/* If not creating, show active escalations + "Log Dispute" button */}
            {!isCreating ? (
              <View style={styles.listContainer}>
                <View style={styles.listHeaderRow}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                    Active Disputes ({allEscalations.length})
                  </Text>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => setIsCreating(true)}
                    style={styles.newDisputeBtn}
                  >
                    Log New Dispute
                  </Button>
                </View>

                {allEscalations.length === 0 ? (
                  <Surface style={styles.emptyCard} elevation={0}>
                    <IconButton icon="shield-check-outline" size={36} iconColor="#2e7d32" />
                    <Text variant="titleSmall" style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                      No Open Logistics Escalations
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
                      Courier SLA and delivery milestones are currently on track.
                    </Text>
                  </Surface>
                ) : (
                  allEscalations.map((esc) => (
                    <Card key={esc.id} style={styles.escCard} mode="contained">
                      <Card.Content>
                        <View style={styles.escTopRow}>
                          <Chip
                            icon="clock-alert"
                            style={{ backgroundColor: esc.status === 'Resolved' ? '#e8f5e9' : '#fff3e0' }}
                            textStyle={{ color: esc.status === 'Resolved' ? '#1b5e20' : '#e65100', fontWeight: 'bold' }}
                          >
                            {esc.status}
                          </Chip>
                          <Text style={styles.awbBadge}>AWB: {esc.awbNumber}</Text>
                        </View>

                        <Text variant="titleSmall" style={styles.escTitle}>
                          {esc.title}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#444', marginTop: 4 }}>
                          {esc.description}
                        </Text>

                        {esc.delhiveryCrmTicketId && (
                          <View style={styles.ticketBadgeRow}>
                            <Text style={styles.ticketLabel}>Delhivery CRM Ticket ID:</Text>
                            <Text style={styles.ticketVal}>{esc.delhiveryCrmTicketId}</Text>
                          </View>
                        )}

                        {esc.claimAmount && (
                          <Text style={styles.claimText}>Claim Value: ₹{esc.claimAmount}</Text>
                        )}

                        <Text style={styles.escDate}>
                          Logged: {new Date(esc.createdAt).toLocaleString()}
                        </Text>
                      </Card.Content>
                    </Card>
                  ))
                )}
              </View>
            ) : (
              /* Create Dispute Form */
              <View style={styles.createForm}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  Log Dispute / Carrier Claim
                </Text>

                <Menu
                  visible={issueMenuVisible}
                  onDismiss={() => setIssueMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      icon="alert-circle-outline"
                      onPress={() => setIssueMenuVisible(true)}
                      style={styles.dropdownBtn}
                    >
                      Issue: {ISSUE_TYPE_LABELS[selectedIssueType]}
                    </Button>
                  }
                >
                  {(Object.keys(ISSUE_TYPE_LABELS) as EscalationIssueType[]).map((key) => (
                    <Menu.Item
                      key={key}
                      onPress={() => {
                        setSelectedIssueType(key);
                        setIssueMenuVisible(false);
                      }}
                      title={ISSUE_TYPE_LABELS[key]}
                    />
                  ))}
                </Menu>

                <TextInput
                  mode="outlined"
                  label="Dispute Subject / Headline"
                  placeholder="e.g. Buyer claims delivery agent did not call"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.formInput}
                />

                <TextInput
                  mode="outlined"
                  label="Detailed Description & Evidence"
                  placeholder="Provide call logs, customer chat excerpts, or tracking timestamps"
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  style={styles.formInput}
                />

                <TextInput
                  mode="outlined"
                  label="Claim Amount (if item damaged/lost) - Optional"
                  keyboardType="numeric"
                  placeholder="₹ Amount"
                  value={claimAmount}
                  onChangeText={setClaimAmount}
                  style={styles.formInput}
                />

                <View style={styles.formActionButtons}>
                  <Button mode="text" onPress={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    loading={loading}
                    disabled={!title.trim() || !description.trim() || loading}
                    onPress={handleSubmitEscalation}
                  >
                    Submit Escalation
                  </Button>
                </View>
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
  crmLinkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffe082',
    marginBottom: 12,
  },
  crmInfo: {
    flex: 1,
    marginRight: 8,
  },
  crmBtn: {
    borderRadius: 8,
  },
  scrollArea: {
    maxHeight: 480,
  },
  listContainer: {
    gap: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  newDisputeBtn: {
    borderRadius: 8,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#f1f8e9',
    marginTop: 10,
  },
  escCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },
  escTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  awbBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
  },
  escTitle: {
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  ticketLabel: {
    fontSize: 11,
    color: '#666',
  },
  ticketVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  claimText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b71c1c',
    marginTop: 4,
  },
  escDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 6,
  },
  createForm: {
    gap: 10,
    paddingVertical: 6,
  },
  dropdownBtn: {
    borderRadius: 10,
    justifyContent: 'flex-start',
  },
  formInput: {
    fontSize: 13,
  },
  formActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
});
