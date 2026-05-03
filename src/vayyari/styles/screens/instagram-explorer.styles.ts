import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const GRID_COLUMN_COUNT = 4;
const GRID_TILE_SIZE = width / GRID_COLUMN_COUNT;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  deletedPlaceholder: {
    alignItems: 'center',
    paddingVertical: 60,
    opacity: 0.8,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  profileList: {
    padding: 0,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  profileGridItem: {
    width: GRID_TILE_SIZE,
    height: GRID_TILE_SIZE + 20,
  },
  profileCard: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: GRID_TILE_SIZE,
    borderRadius: 0,
  },
  ownAccountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  profileUsername: {
    textAlign: 'center',
    marginTop: 4,
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    marginBottom: 0,
  },
  filterGroup: {
    flexDirection: 'row', 
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 13, 
    fontWeight: 'bold',
    opacity: 0.6,
  },
  filterButton: {
    marginLeft: -4,
  },
  filterButtonLabel: {
    fontSize: 13, 
    fontWeight: 'bold',
  },
  sortIcon: {
    margin: 0, 
    marginLeft: -4,
  },
  closeFilterIcon: {
    margin: 0, 
    marginLeft: -4,
  }
});
