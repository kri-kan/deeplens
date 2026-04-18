import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const getStyles = (theme: MD3Theme) => {
  const isDark = theme.dark;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerTitle: {
      fontWeight: 'bold',
      fontSize: 20,
      color: theme.colors.onSurface,
    },
    appbarHeader: {
      backgroundColor: theme.colors.background,
      height: 48,
    },
    content: {
      paddingHorizontal: 12,
      paddingTop: 8,
      gap: 12,
    },
    selectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pureIconContainer: {
      width: 55,
      height: 55,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
    },
    paymentButton: {
      flex: 1,
      height: 55,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.surfaceVariant,
    },
    paymentButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    paymentText: {
      fontWeight: 'bold',
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
    paymentTextSelected: {
      color: theme.colors.onPrimary,
    },
    generateButton: {
      borderRadius: 12,
      elevation: 0,
      marginTop: 4,
    },
    generateButtonEnabled: {
      backgroundColor: '#25D366',
    },
    generateButtonDisabled: {
      backgroundColor: isDark ? '#2D2D2D' : '#E0E0E0',
    },
    generateButtonLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      textTransform: 'none',
    },
    generateButtonLabelEnabled: {
       color: '#FFFFFF',
    },
    generateButtonLabelDisabled: {
       color: isDark ? '#888888' : '#555555',
    },
    generateButtonContent: {
      height: 58,
    },
    idCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      paddingLeft: 20,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor: theme.colors.surfaceVariant,
      borderColor: theme.colors.outlineVariant,
    },
    idCardInactive: {
      opacity: 0.6,
    },
    idCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    idCardText: {
      fontSize: 22,
      fontWeight: 'bold',
      letterSpacing: 1.5,
      color: theme.colors.onSurfaceVariant,
    },
    timestampText: {
      fontSize: 11,
      marginTop: -2,
      color: theme.colors.outline,
    },
    listSection: {
      flex: 1,
      paddingHorizontal: 16,
      marginTop: 16,
    },
    listTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.colors.onSurface,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.background,
      minHeight: 80,
    },
    editContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    editLeftPartition: {
      flex: 1,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    editIdSection: {
      alignItems: 'center',
    },
    editIdText: {
      fontSize: 12,
      fontWeight: 'bold',
      opacity: 0.4,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    editControlsSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
    },
    editIconGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    editPaymentGroup: {
      flexDirection: 'row',
      gap: 6,
    },
    editMiniPaymentBtn: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    editMiniPaymentBtnSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    editMiniPaymentText: {
      fontSize: 12, // Increased
      fontWeight: 'bold',
      color: theme.colors.onSurfaceVariant,
    },
    editMiniPaymentTextSelected: {
      color: theme.colors.onPrimary,
    },
    editActionsSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderLeftColor: theme.colors.outlineVariant,
      gap: 4,
    },
    historyActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      margin: 0,
    },
    iconButtonPencil: {
      margin: 0,
      marginRight: 4,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingLeft: 12,
      flex: 1,
    },
    historyId: {
      fontWeight: 'bold',
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    historySubtitle: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 40,
      color: theme.colors.outline,
    }
  });
};
