import React from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Text, Appbar, Searchbar, IconButton, Portal, useTheme } from 'react-native-paper';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomerTile } from '@/components/utility/customer/CustomerTile';
import { AddCustomerModal } from '@/components/utility/customer/AddCustomerModal';
import { AddAddressModal } from '@/components/utility/customer/AddAddressModal';
import { useRouter } from 'expo-router';
import { CountrySelectorModal } from '@/components/utility/customer/CountrySelectorModal';

import { useCustomerManagement } from '@/hooks/useCustomerManagement';
import { styles, TILE_SIZE, COLUMN_COUNT } from '@/styles/screens/customer-management.styles';

export default function CustomerManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    handleRefresh,
    filteredCustomers,
    showAddModal,
    setShowAddModal,
    selectedCustomer,
    setSelectedCustomer,
    showAddressModal,
    setShowAddressModal,
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
    addrName,
    setAddrName,
    addrPhone,
    setAddrPhone,
    addrLine1,
    setAddrLine1,
    addrLine2,
    setAddrLine2,
    addrPincode,
    setAddrPincode,
    addrCity,
    setAddrCity,
    addrState,
    setAddrState,
    isDefault,
    setIsDefault,
    handleAddCustomer,
    handleAddAddress,
    toggleSubscription,
  } = useCustomerManagement();

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

        <View style={styles.listHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Customer Directory</Text>
            <Text variant="labelSmall" style={{ opacity: 0.5 }}>{filteredCustomers.length} TOTAL</Text>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
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

        <AddAddressModal 
          visible={showAddressModal}
          onDismiss={() => setShowAddressModal(false)}
          addrName={addrName}
          setAddrName={setAddrName}
          addrPhone={addrPhone}
          setAddrPhone={setAddrPhone}
          addrLine1={addrLine1}
          setAddrLine1={setAddrLine1}
          addrLine2={addrLine2}
          setAddrLine2={setAddrLine2}
          addrCity={addrCity}
          setAddrCity={setAddrCity}
          addrPincode={addrPincode}
          setAddrPincode={setAddrPincode}
          addrState={addrState}
          setAddrState={setAddrState}
          isDefault={isDefault}
          setIsDefault={setIsDefault}
          selectedCountry={selectedCountry}
          onShowCountrySelector={() => setShowCountrySelector(true)}
          onSubmit={handleAddAddress}
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
      </Portal>
    </ScreenWrapper>
  );
}
