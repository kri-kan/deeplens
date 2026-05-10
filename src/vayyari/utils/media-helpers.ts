import { documentDirectory, cacheDirectory, createDownloadResumable, getInfoAsync } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

/**
 * Downloads media to the permanent gallery.
 */
export const downloadMedia = async (
    url: string, 
    filename: string, 
    onProgress?: (progress: number) => void
) => {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need permission to save media to your gallery.');
            return;
        }

        if (!documentDirectory) throw new Error("Document directory not available");

        const fileUri = `${documentDirectory}${filename}`;
        
        // Check if already exists in permanent storage to avoid redownloading
        const info = await getInfoAsync(fileUri);
        if (info.exists) {
            await MediaLibrary.saveToLibraryAsync(fileUri);
            return fileUri;
        }

        const downloadResumable = createDownloadResumable(
            url,
            fileUri,
            {},
            (progressData) => {
                if (progressData.totalBytesExpectedToWrite > 0) {
                    const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
                    onProgress?.(progress);
                }
            }
        );

        const result = await downloadResumable.downloadAsync();
        
        if (result && result.uri) {
            await MediaLibrary.saveToLibraryAsync(result.uri);
            return result.uri;
        }
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
};

/**
 * Downloads media to a temporary cache and opens the native sharing dialog.
 * Reuses existing cache if available.
 */
export const shareMedia = async (
    url: string, 
    extension: string = 'jpg',
    onProgress?: (progress: number) => void
) => {
    try {
        // Fallback clipboard
        await Clipboard.setStringAsync(url);
        
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (!isSharingAvailable || !cacheDirectory) {
            Alert.alert('Copied', 'Media URL copied to clipboard.');
            return;
        }

        // Create a stable filename from the URL to allow caching
        // We look for the 'path' parameter which contains the unique file identifier
        const urlParts = url.split('?');
        const baseUrl = urlParts[0];
        const queryString = urlParts[1] || '';
        
        let filename = '';
        if (queryString.includes('path=')) {
            // Extract the 'path' value and get the last segment (the actual filename)
            const pathMatch = queryString.match(/path=([^&]+)/);
            if (pathMatch && pathMatch[1]) {
                const fullPath = decodeURIComponent(pathMatch[1]);
                filename = fullPath.split('/').pop() || '';
            }
        }
        
        // Fallback to baseUrl pop if path param not found
        if (!filename) {
            filename = baseUrl.split('/').pop() || `temp_${Date.now()}`;
        }
        
        // Ensure it has the correct extension
        if (!filename.includes('.')) {
            filename = `${filename}.${extension}`;
        }
        
        const fileUri = `${cacheDirectory}${filename}`;
        console.log(`[Cache] Using file: ${filename}`);

        // Check if file is already cached
        const fileInfo = await getInfoAsync(fileUri);
        
        if (fileInfo.exists) {
            // Instantly share the cached file
            onProgress?.(1); // Signal completion
            await Sharing.shareAsync(fileUri);
            return;
        }

        // Otherwise, download it
        const downloadResumable = createDownloadResumable(
            url, 
            fileUri, 
            {}, 
            (progressData) => {
                if (progressData.totalBytesExpectedToWrite > 0) {
                    const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
                    onProgress?.(progress);
                }
            }
        );

        const result = await downloadResumable.downloadAsync();
        
        if (result && result.uri) {
            await Sharing.shareAsync(result.uri);
        }
    } catch (error) {
        console.error('Sharing error:', error);
        Alert.alert('Error', 'Failed to prepare media for sharing.');
    }
};
