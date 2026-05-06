import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, List, Button, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

export default function PostActionsScreen() {
    const { id, data: initialDataStr } = useLocalSearchParams();
    const router = useRouter();
    const item = initialDataStr ? JSON.parse(initialDataStr as string) : null;
    const hasIsLink = !!item?.productCode || !!item?.ProductCode;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerTitle: 'Post Actions',
                presentation: 'modal'
            }} />
            
            <Surface style={styles.content} elevation={1}>
                <Text variant="titleMedium" style={styles.title}>Actions for @{item?.username || 'Post'}</Text>
                
                {!hasIsLink && (
                    <List.Item
                        title="Create as Product"
                        description="Convert this post into a new product"
                        left={props => <List.Icon {...props} icon="plus-box" />}
                        onPress={() => {
                            router.replace({
                                pathname: '/utilities/instagram/create-product',
                                params: { id, data: initialDataStr }
                            });
                        }}
                    />
                )}

                <List.Item
                    title="Link to Product"
                    description="Connect this post to an existing product"
                    left={props => <List.Icon {...props} icon="link-variant" />}
                    onPress={() => {
                        router.replace({
                            pathname: '/utilities/instagram/link-product',
                            params: { id, data: initialDataStr }
                        });
                    }}
                />

                <List.Item
                    title="View on Instagram"
                    left={props => <List.Icon {...props} icon="instagram" />}
                    onPress={() => {
                        // Implement link opening
                    }}
                />

                <Button 
                    mode="text" 
                    onPress={() => router.back()} 
                    style={styles.cancel}
                >
                    Cancel
                </Button>
            </Surface>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
        justifyContent: 'center',
    },
    content: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: 'bold',
    },
    cancel: {
        marginTop: 16,
    }
});
