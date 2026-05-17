import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { MetaConfigurationsTable } from '../../../components/utility/instagram/MetaConfigurationsTable';

export default function MetaAccountsScreen() {
    return (
        <ScreenWrapper title="Meta Accounts" subtitle="Manage credentials and tokens" withScrollView={false}>
            <View style={styles.container}>
                <MetaConfigurationsTable />
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
