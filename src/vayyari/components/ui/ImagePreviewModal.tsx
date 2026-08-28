import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Share, FlatList, Dimensions, BackHandler } from 'react-native';
import { Portal, Modal, IconButton, Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ZoomableImage } from './ZoomableImage';

const { width, height } = Dimensions.get('window');

interface ImagePreviewModalProps {
    visible: boolean;
    onDismiss: () => void;
    imageUrl?: string;
    imageUrls?: string[];
    initialIndex?: number;
    title?: string;
}

export const ImagePreviewModal = ({ visible, onDismiss, imageUrl, imageUrls, initialIndex = 0, title }: ImagePreviewModalProps) => {
    const images = imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isZoomed, setIsZoomed] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible && images.length > 0) {
            setCurrentIndex(initialIndex < images.length ? initialIndex : 0);
            setIsZoomed(false);
        }
    }, [visible, initialIndex, images.length]);

    // Handle Android hardware back press
    useEffect(() => {
        if (!visible) return;
        const onBackPress = () => {
            onDismiss();
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [visible, onDismiss]);

    if (images.length === 0) return null;

    const currentUrl = images[currentIndex];

    const onMomentumScrollEnd = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
        setIsZoomed(false);
    };

    const getItemLayout = (_: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    });

    return (
        <Portal>
            <Modal 
                visible={visible} 
                onDismiss={onDismiss} 
                contentContainerStyle={styles.container}
            >
                <GestureHandlerRootView style={styles.content}>
                    <View style={styles.headerButtons}>
                        {images.length > 1 && (
                            <Text style={styles.pageIndicator}>{currentIndex + 1} / {images.length}</Text>
                        )}
                        <IconButton 
                            icon="share-variant" 
                            size={32} 
                            iconColor="white" 
                            style={styles.headerButton} 
                            onPress={() => Share.share({ url: currentUrl, message: title })} 
                        />
                        <IconButton 
                            icon="close" 
                            size={32} 
                            iconColor="white" 
                            style={styles.headerButton} 
                            onPress={onDismiss} 
                        />
                    </View>
                    
                    <FlatList
                        ref={flatListRef}
                        data={images}
                        keyExtractor={(item, index) => `${item}-${index}`}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!isZoomed}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onMomentumScrollEnd}
                        initialScrollIndex={initialIndex < images.length ? initialIndex : 0}
                        getItemLayout={getItemLayout}
                        renderItem={({ item }) => (
                            <View style={[styles.imageContainer, { width }]}>
                                <ZoomableImage
                                    uri={item}
                                    containerWidth={width}
                                    containerHeight={height * 0.75}
                                    onZoomChange={setIsZoomed}
                                />
                            </View>
                        )}
                    />

                    {title && (
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>{title}</Text>
                        </View>
                    )}
                </GestureHandlerRootView>
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
    headerButtons: {
        position: 'absolute', 
        top: 40, 
        right: 20, 
        zIndex: 10,
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    pageIndicator: {
        color: 'white',
        alignSelf: 'center',
        marginRight: 16,
        fontWeight: 'bold',
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
