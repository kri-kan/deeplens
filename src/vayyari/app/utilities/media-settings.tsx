import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme, Card, List, FAB } from 'react-native-paper';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { SettingRuleCard } from '@/components/utility/media/SettingRuleCard';
import { RuleEditorDialog } from '@/components/utility/media/RuleEditorDialog';

import { useMediaSettings } from '@/hooks/useMediaSettings';
import { styles } from '@/styles/screens/media-settings.styles';

export default function MediaSettingsScreen() {
  const theme = useTheme();
  const {
    settings,
    retentionOptions,
    refreshing,
    fetchSettings,
    editingItem,
    visible,
    setVisible,
    schema,
    category,
    setCategory,
    subCategory,
    setSubCategory,
    retention,
    setRetention,
    sizes,
    openAdd,
    openEdit,
    handleSave,
    handleDelete,
    toggleSize,
  } = useMediaSettings();

  return (
    <ScreenWrapper title="Retention & Lifecycle">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSettings(true)} />}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.infoCard} mode="contained">
          <Card.Title 
            title="Policy Manager" 
            subtitle="Define retention tags and thumbnail overrides." 
            left={(props) => <List.Icon {...props} icon="shield-refresh-outline" />}
          />
        </Card>

        <List.Section>
          <List.Subheader>Hierarchical Rules</List.Subheader>
          {settings.map((item) => (
            <SettingRuleCard 
              key={item.id} 
              item={item} 
              onPress={() => openEdit(item)} 
            />
          ))}
        </List.Section>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        onPress={openAdd}
      />

      <RuleEditorDialog 
        visible={visible}
        onDismiss={() => setVisible(false)}
        editingItem={editingItem}
        category={category}
        setCategory={setCategory}
        subCategory={subCategory}
        setSubCategory={setSubCategory}
        retention={retention}
        setRetention={setRetention}
        sizes={sizes}
        toggleSize={toggleSize}
        schema={schema}
        retentionOptions={retentionOptions}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </ScreenWrapper>
  );
}
