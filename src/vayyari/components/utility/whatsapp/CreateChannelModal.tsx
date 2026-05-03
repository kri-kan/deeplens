import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Modal } from 'react-native-paper';

interface CreateChannelModalProps {
  visible: boolean;
  onDismiss: () => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onSubmit: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  visible,
  onDismiss,
  name,
  setName,
  description,
  setDescription,
  onSubmit,
}) => {
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={styles.title}>New Broadcast Channel</Text>
      <TextInput
        label="Channel Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        placeholder="e.g. Daily Deals"
      />
      <TextInput
        label="Description (Optional)"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        placeholder="What is this channel for?"
      />
      <View style={styles.actions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" onPress={onSubmit} disabled={!name}>Create</Button>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
