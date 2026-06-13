import React from 'react';
import { TouchableOpacity, Linking, View, StyleSheet, Alert } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';

interface PlatformHandleProps {
    source: 'whatsapp' | 'instagram' | string;
    handle: string;
    instagramUserId?: string;
    showText?: boolean;
    size?: number;
    fontSize?: number;
    color?: string;
}


export const PlatformHandle = ({ 
    source, 
    handle, 
    showText = true, 
    size = 24,
    fontSize = 14,
    color
}: PlatformHandleProps) => {
    const theme = useTheme();
    const isInstagram = source?.toLowerCase() === 'instagram';
    const isWhatsApp = source?.toLowerCase() === 'whatsapp';

    const handlePress = async () => {
        if (!handle) {
            Alert.alert('Missing Data', `No ${isWhatsApp ? 'phone number' : 'handle'} found for this record.`);
            return;
        }

        try {
            if (isWhatsApp) {
                const cleanPhone = handle.replace(/\D/g, '');
                const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const url = `whatsapp://send?phone=${finalPhone}`;
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    await Linking.openURL(`https://wa.me/${finalPhone}`);
                }
            } 
            else if (isInstagram) {
                let username = handle;
                if (username.includes('instagram.com/')) {
                    username = username.split('instagram.com/')[1].split('/')[0];
                }
                username = username.replace('@', '');
                
                const igMeUrl = `https://ig.me/m/${username}`;
                const profileUrl = `instagram://user?username=${username}`;
                    
                const supported = await Linking.canOpenURL(igMeUrl);
                if (supported) {
                    await Linking.openURL(igMeUrl);
                } else {
                    const canOpenProfile = await Linking.canOpenURL(profileUrl);
                    if (canOpenProfile) {
                        await Linking.openURL(profileUrl);
                    } else {
                        await Linking.openURL(`https://instagram.com/${username}`);
                    }
                }
            }
        } catch (error) {
            console.error('Deep link failed:', error);
            Alert.alert('Error', 'Could not open platform app');
        }
    };

    const handleCopy = async () => {
        if (!handle) return;
        await Clipboard.setStringAsync(handle);
        // Subtle feedback could be added here if needed
    };

    const getDisplayText = () => {
        if (!handle) return '';
        if (isInstagram) {
            let username = handle;
            if (handle.includes('instagram.com/')) {
                username = handle.split('instagram.com/')[1]?.split('/')[0]?.split('?')[0] || handle;
            }
            username = username.replace('@', '');
            const display = username ? `@${username}` : '';
            return display.length > 15 ? display.slice(0, 15) + '…' : display;
        }
        const display = handle;
        return display.length > 15 ? display.slice(0, 15) + '…' : display;
    };

    const iconColor = isInstagram ? '#E1306C' : isWhatsApp ? '#25D366' : theme.colors.onSurfaceVariant;

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                onPress={handlePress} 
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.iconWrapper, { width: size + 4, height: size + 4 }]}
            >
                <Icon 
                    source={isInstagram ? 'instagram' : isWhatsApp ? 'whatsapp' : 'help-circle'} 
                    size={size} 
                    color={iconColor} 
                />
            </TouchableOpacity>
            
            {showText && (
                <TouchableOpacity onPress={handleCopy} activeOpacity={0.6}>
                <Text 
                        variant="labelLarge" 
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                            styles.text, 
                            { 
                                fontSize, 
                                color: color || theme.colors.primary,
                                fontWeight: '600',
                                maxWidth: 140,
                            }
                        ]}
                    >
                        {getDisplayText()}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        letterSpacing: 0.2,
    },
});
