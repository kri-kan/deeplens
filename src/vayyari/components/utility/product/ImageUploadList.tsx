import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

interface ImageUploadListProps {
  images: ImagePicker.ImagePickerAsset[];
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
}

export const ImageUploadList: React.FC<ImageUploadListProps> = ({
  images,
  onPickImage,
  onRemoveImage,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>Product Media ({images.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {images.map((img, index) => (
          <View key={index} style={styles.wrapper}>
            <Image source={{ uri: img.uri }} style={styles.thumbnail} />
            <IconButton
              icon="close-circle"
              size={20}
              style={styles.remove}
              onPress={() => onRemoveImage(index)}
              iconColor={theme.colors.error}
            />
          </View>
        ))}
        <TouchableOpacity style={[styles.add, { borderColor: theme.colors.outline }]} onPress={onPickImage}>
          <IconButton icon="plus" size={32} />
          <Text variant="labelSmall">Add Media</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  title: {
    marginBottom: 12,
    opacity: 0.7,
  },
  scroll: {
    flexDirection: 'row',
  },
  wrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 100,
    height: 120,
    borderRadius: 12,
  },
  remove: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    margin: 0,
  },
  add: {
    width: 100,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
