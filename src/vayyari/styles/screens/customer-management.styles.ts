import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 12;
const TILE_SIZE = (width - (GAP * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

export const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnWrapper: {
    gap: GAP,
  }
});

export { TILE_SIZE, GAP, COLUMN_COUNT };
