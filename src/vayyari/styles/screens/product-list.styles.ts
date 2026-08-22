import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
  },
  tabContainer: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonContainer: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  ribbonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  clearRibbonBtn: {
    marginLeft: 4,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  clearRibbonBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
