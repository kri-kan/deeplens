import React from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Text, Appbar, Searchbar, IconButton, Portal, useTheme, Menu, Button, Checkbox, Badge, Modal } from 'react-native-paper';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomerTile } from '@/components/utility/customer/CustomerTile';
import { AddCustomerModal } from '@/components/utility/customer/AddCustomerModal';

import { useRouter } from 'expo-router';
import { CountrySelectorModal } from '@/components/utility/customer/CountrySelectorModal';

import { useCustomerManagement } from '@/hooks/useCustomerManagement';
import { styles, TILE_SIZE, COLUMN_COUNT } from '@/styles/screens/customer-management.styles';

export default function CustomerManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [showSortMenu, setShowSortMenu] = React.useState(false);
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [stagedFilters, setStagedFilters] = React.useState<{
    hasPhone?: boolean;
    hasInstagram?: boolean;
    isFollower?: boolean;
    isArchived?: boolean;
  }>({});
  
  const {
    searchQuery,
    setSearchQuery,
    customers,
    totalCount,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loading,
    loadingMore,
    refreshing,
    handleRefresh,
    loadMoreCustomers,
    showAddModal,
    setShowAddModal,
    selectedCustomer,
    setSelectedCustomer,

    countryCodes,
    selectedCountry,
    setSelectedCountry,
    showCountrySelector,
    setShowCountrySelector,
    allChannels,
    memberships,
    channelLoading,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    instagramId,
    setInstagramId,
    instagramAccounts,
    instagramErrors,
    availableLanguages,
    preferredLanguages,
    setPreferredLanguages,
    addInstagramAccountField,
    removeInstagramAccountField,
    updateInstagramAccountUsername,
    setInstagramAccountPrimary,
    email,
    setEmail,

    gender,
    setGender,
    handleAddCustomer,

    toggleSubscription,
    activeFilters,
    setActiveFilters,
  } = useCustomerManagement();

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const handleOpenFilters = () => {
    setStagedFilters({ ...activeFilters });
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    setActiveFilters(stagedFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setStagedFilters({});
    setActiveFilters({});
    setShowFilterModal(false);
  };

  return (
    <ScreenWrapper 
      title="Customers" 
      actions={<Appbar.Action icon="account-plus" onPress={() => setShowAddModal(true)} />}
      withScrollView={false}
    >
      <View style={styles.content}>
        <View style={styles.searchSection}>
           <Searchbar
            placeholder="Search by name, phone or IG..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{ fontSize: 14 }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text variant="titleMedium" style={styles.sectionTitle}>Customer Directory</Text>
            <Text variant="labelSmall" style={{ opacity: 0.5 }}>{totalCount} TOTAL</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View>
              <Button 
                mode={activeFilterCount > 0 ? "contained-tonal" : "text"} 
                icon="filter-variant"
                onPress={handleOpenFilters}
                compact
              >
                Filter
              </Button>
              {activeFilterCount > 0 && (
                <Badge 
                  size={16} 
                  style={{ position: 'absolute', top: -4, right: -4 }}
                >
                  {activeFilterCount}
                </Badge>
              )}
            </View>
            <Menu
              visible={showSortMenu}
              onDismiss={() => setShowSortMenu(false)}
              anchor={
                <Button 
                  mode="text" 
                  icon="sort" 
                  onPress={() => setShowSortMenu(true)}
                  compact
                >
                  Sort
                </Button>
              }
            >
              <Menu.Item 
                onPress={() => { setSortBy('createdAt'); setSortOrder('desc'); setShowSortMenu(false); }} 
                title="Newest First" 
                leadingIcon={sortBy === 'createdAt' && sortOrder === 'desc' ? 'check' : undefined}
              />
              <Menu.Item 
                onPress={() => { setSortBy('createdAt'); setSortOrder('asc'); setShowSortMenu(false); }} 
                title="Oldest First" 
                leadingIcon={sortBy === 'createdAt' && sortOrder === 'asc' ? 'check' : undefined}
              />
              <Menu.Item 
                onPress={() => { setSortBy('name'); setSortOrder('asc'); setShowSortMenu(false); }} 
                title="Name (A-Z)" 
                leadingIcon={sortBy === 'name' && sortOrder === 'asc' ? 'check' : undefined}
              />
              <Menu.Item 
                onPress={() => { setSortBy('phone'); setSortOrder('asc'); setShowSortMenu(false); }} 
                title="Phone" 
                leadingIcon={sortBy === 'phone' && sortOrder === 'asc' ? 'check' : undefined}
              />
              <Menu.Item 
                onPress={() => { setSortBy('instagramId'); setSortOrder('asc'); setShowSortMenu(false); }} 
                title="Instagram ID" 
                leadingIcon={sortBy === 'instagramId' && sortOrder === 'asc' ? 'check' : undefined}
              />
            </Menu>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={customers}
            renderItem={({ item }) => (
              <CustomerTile 
                customer={item} 
                onPress={(cust) => router.push(`/utilities/customer/${cust.id}`)} 
                tileSize={TILE_SIZE} 
              />
            )}
            keyExtractor={item => item.id}
            numColumns={COLUMN_COUNT}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEndReached={loadMoreCustomers}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <IconButton icon="account-search-outline" size={64} style={{ opacity: 0.2 }} />
                  <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No customers found</Text>
              </View>
            }
          />
        )}
      </View>

      <Portal>
        <AddCustomerModal 
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          gender={gender}
          setGender={setGender}
          selectedCountry={selectedCountry}
          onShowCountrySelector={() => setShowCountrySelector(true)}
          onSubmit={handleAddCustomer}
          instagramAccounts={instagramAccounts}
          instagramErrors={instagramErrors}
          availableLanguages={availableLanguages}
          preferredLanguages={preferredLanguages}
          setPreferredLanguages={setPreferredLanguages}
          onAddInstagramField={addInstagramAccountField}
          onRemoveInstagramField={removeInstagramAccountField}
          onUpdateInstagramUsername={updateInstagramAccountUsername}
          onSetInstagramPrimary={setInstagramAccountPrimary}
        />


        <CountrySelectorModal 
          visible={showCountrySelector}
          onDismiss={() => setShowCountrySelector(false)}
          countryCodes={countryCodes}
          selectedCountry={selectedCountry}
          onSelect={(country) => {
            setSelectedCountry(country);
            setShowCountrySelector(false);
          }}
        />

        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.elevation.level3,
            padding: 24,
            margin: 16,
            borderRadius: 16,
          }}
        >
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>Filter Customers</Text>
          
          <Checkbox.Item
            label="Has Phone Number"
            status={stagedFilters.hasPhone ? 'checked' : 'unchecked'}
            onPress={() => setStagedFilters(prev => ({ ...prev, hasPhone: !prev.hasPhone }))}
          />
          <Checkbox.Item
            label="Has Instagram"
            status={stagedFilters.hasInstagram ? 'checked' : 'unchecked'}
            onPress={() => setStagedFilters(prev => ({ ...prev, hasInstagram: !prev.hasInstagram }))}
          />
          <Checkbox.Item
            label="Is Follower"
            status={stagedFilters.isFollower ? 'checked' : 'unchecked'}
            onPress={() => setStagedFilters(prev => ({ ...prev, isFollower: !prev.isFollower }))}
          />
          <Checkbox.Item
            label="Is Archived"
            status={stagedFilters.isArchived ? 'checked' : 'unchecked'}
            onPress={() => setStagedFilters(prev => ({ ...prev, isArchived: !prev.isArchived }))}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button mode="text" onPress={handleResetFilters}>
              Reset
            </Button>
            <Button mode="contained" onPress={handleApplyFilters}>
              Apply Filters
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}
