import React from 'react';
import { Modal } from 'react-native';
import { GroupManagementView, GroupManagementViewProps } from '../GroupManagementView';

export interface GroupManagementModalProps extends Omit<GroupManagementViewProps, 'onBack'> {
  visible: boolean;
  onClose: () => void;
}

export function GroupManagementModal({
  visible,
  onClose,
  ...rest
}: GroupManagementModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <GroupManagementView {...rest} onBack={onClose} />
    </Modal>
  );
}
