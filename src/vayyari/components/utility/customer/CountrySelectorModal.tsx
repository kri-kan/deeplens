import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, Modal, List, useTheme } from 'react-native-paper';
import { CountryCode } from '@/hooks/useCustomerManagement';

interface CountrySelectorModalProps {
  visible: boolean;
  onDismiss: () => void;
  countryCodes: CountryCode[];
  selectedCountry: CountryCode | null;
  onSelect: (country: CountryCode) => void;
}

export const CountrySelectorModal: React.FC<CountrySelectorModalProps> = ({
  visible,
  onDismiss,
  countryCodes,
  selectedCountry,
  onSelect,
}) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.handle} />
      <Text variant="titleLarge" style={styles.title}>Select Country</Text>
      <FlatList
        data={countryCodes}
        keyExtractor={item => item.code}
        style={styles.list}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.dialCode} ${item.name}`}
            onPress={() => onSelect(item)}
            right={props => selectedCountry?.code === item.code ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null}
          />
        )}
      />
      <Button mode="text" onPress={onDismiss} style={styles.cancel}>Cancel</Button>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: 'white',
    padding: 24,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  list: {
    maxHeight: 400,
  },
  cancel: {
    marginTop: 16,
  },
});
