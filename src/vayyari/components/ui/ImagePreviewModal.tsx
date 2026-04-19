import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Portal, Modal, IconButton, Text } from 'react-native-paper';

interface ImagePreviewModalProps {
    visible: boolean;
    onDismiss: () => void;
    imageUrl: string;
    title?: string;
}

export const ImagePreviewModal = ({ visible, onDismiss, imageUrl, title }: ImagePreviewModalProps) => {
    if (!imageUrl) return null;

    return (
        <Portal>
            <Modal 
                visible={visible} 
                onDismiss={onDismiss} 
                contentContainerStyle={styles.container}
            >
                <View style={styles.content}>
                    <IconButton 
                        icon="close" 
                        size={32} 
                        iconColor="white" 
                        style={styles.closeButton} 
                        onPress={onDismiss} 
                    />
                    <View style={styles.imageContainer}>
                        <Image 
                            source={{ uri: imageUrl }} 
                            style={styles.image} 
                        />
                    </View>
                    {title && (
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>{title}</Text>
                        </View>
                    )}
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    content: {
        flex: 1,
    },
    closeButton: {
        position: 'absolute', 
        top: 40, 
        right: 20, 
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    titleContainer: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        color: 'white',
        opacity: 0.7,
    },
});
