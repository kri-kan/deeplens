import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert , ScrollView } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { Image } from 'expo-image';
import { instagramService } from '@/services/instagram.service';
import { getMediaUri } from '@/utils/instagram-helpers';

interface InstagramLinkSectionProps {
  linkedPosts: any[];
  onLinkPost: (post: any) => void;
  onRemovePost: (postId: string) => void;
}

export const InstagramLinkSection: React.FC<InstagramLinkSectionProps> = ({ 
  linkedPosts, 
  onLinkPost, 
  onRemovePost 
}) => {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleLookup = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const post = await instagramService.lookupPost(url);
      onLinkPost(post);
      setUrl('');
      setShowInput(false);
    } catch (error: any) {
      console.error('Lookup failed', error);
      Alert.alert('Not Found', 'This post was not found in our database. Please make sure it has been scraped first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>Link Instagram Post ({linkedPosts.length})</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {/* Linked Posts Cards */}
        {linkedPosts.map((post) => {
          const isInvalid = !!post.productCode;
          return (
          <View key={post.id} style={[styles.wrapper, isInvalid && styles.wrapperInvalid]}>
            <Image 
              source={{ uri: getMediaUri(post, 'medium') }} 
              style={styles.thumbnail}
            />
            {isInvalid && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Linked: {post.productCode}</Text>
              </View>
            )}
            <IconButton 
              icon="close-circle" 
              iconColor={theme.colors.error} 
              size={20} 
              onPress={() => onRemovePost(post.id)}
              style={styles.remove}
            />
          </View>
        )})}

        {/* Add Link Card */}
        <TouchableOpacity 
          style={[styles.add, { borderColor: theme.colors.outline }]} 
          onPress={() => setShowInput(true)}
        >
          <IconButton icon="link-plus" size={32} />
          <Text variant="labelSmall">Link Post</Text>
        </TouchableOpacity>
      </ScrollView>

      {showInput && (
        <View style={styles.inputContainer}>
          <TextInput
            label="Instagram URL"
            value={url}
            onChangeText={setUrl}
            mode="outlined"
            placeholder="Paste reel/post link here..."
            style={styles.input}
            right={<TextInput.Icon icon="check" onPress={handleLookup} disabled={loading} />}
          />
          {loading && <ActivityIndicator style={styles.loader} />}
          <IconButton icon="close" size={20} onPress={() => setShowInput(false)} />
        </View>
      )}
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
  wrapperInvalid: {
    borderWidth: 2,
    borderColor: 'red',
    borderRadius: 14,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  errorText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
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
  inputContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    right: 50,
    top: 15,
  }
});
