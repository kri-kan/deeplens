import React from 'react';
import { ScrollView, View, StyleProp, ViewStyle, Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';
import {
  ORDER_STAGES,
  OrderStage,
  STAGE_COLORS,
  getStageColor,
  StateTransitionRecord,
  resolveInitials,
  DEFAULT_STAGE_ACTIONS,
  synthesizeProgressionHistory,
} from '../../../utils/stageTransitionRules';

export {
  ORDER_STAGES,
  OrderStage,
  STAGE_COLORS,
  getStageColor,
  StateTransitionRecord,
};

export interface StateTransitionGraphProps {
  currentStage?: string;
  history?: StateTransitionRecord[];
  onNodePress?: (stage: string) => void;
  style?: StyleProp<ViewStyle>;
  containerHeight?: number;
}

export function StateTransitionGraph({
  currentStage = 'Unconfirmed',
  history,
  onNodePress,
  style,
  containerHeight = 72,
}: StateTransitionGraphProps) {
  const { tokens } = useTheme();

  // Determine transitions and nodes
  const { nodes, transitions } = React.useMemo(() => {
    if (history && history.length > 0) {
      const extractedNodes: string[] = [];
      const extractedTransitions: StateTransitionRecord[] = [];

      const initialStage = history[0].fromStage || 'Unconfirmed';
      extractedNodes.push(initialStage);

      history.forEach((rec) => {
        extractedTransitions.push({
          ...rec,
          action: rec.action || DEFAULT_STAGE_ACTIONS[rec.toStage.toLowerCase()] || 'Moved',
          actorName: rec.actorName || 'sai krishna kanth',
          actorInitials: rec.actorInitials || resolveInitials(rec.actorName),
          timestamp: rec.timestamp || 'Today',
        });
        extractedNodes.push(rec.toStage);
      });

      return { nodes: extractedNodes, transitions: extractedTransitions };
    }

    // Synthesize history leading to currentStage
    return synthesizeProgressionHistory(currentStage);
  }, [currentStage, history]);

  return (
    <YStack
      height={containerHeight}
      justifyContent="center"
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={tokens.radius.md}
      style={style}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: 12,
          minHeight: containerHeight - 4,
        }}
      >
        <XStack alignItems="center">
          {nodes.map((nodeStage, idx) => {
            const isCurrent =
              nodeStage.toLowerCase() === (currentStage || '').toLowerCase();
            const dotColor = getStageColor(nodeStage);
            const transition = transitions[idx];

            return (
              <React.Fragment key={`${nodeStage}-${idx}`}>
                {/* State Node: Soft rounded pill box with subtle border and light pastel fill */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`State ${nodeStage}${isCurrent ? ' (current)' : ''}`}
                  disabled={!onNodePress}
                  onPress={() => onNodePress?.(nodeStage)}
                >
                  <XStack
                    alignItems="center"
                    gap={7}
                    backgroundColor="#E8F1FC"
                    borderWidth={isCurrent ? 1.5 : 1}
                    borderColor={isCurrent ? '#2563EB' : '#BFDBFE'}
                    borderRadius={18}
                    paddingHorizontal={12}
                    paddingVertical={6}
                    shadowColor={isCurrent ? '#2563EB' : 'transparent'}
                    shadowOpacity={isCurrent ? 0.15 : 0}
                    shadowRadius={3}
                    shadowOffset={{ width: 0, height: 1 }}
                  >
                    {/* Colored dot indicator */}
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: dotColor,
                      }}
                    />
                    {/* Bold stage name text */}
                    <Text
                      fontSize={12}
                      fontWeight="700"
                      color="#1E293B"
                      numberOfLines={1}
                    >
                      {nodeStage}
                    </Text>
                  </XStack>
                </Pressable>

                {/* Transition Arrow (if not the last node) */}
                {transition && (
                  <YStack
                    width={128}
                    alignItems="center"
                    justifyContent="center"
                    marginHorizontal={6}
                    height={60}
                    gap={2}
                  >
                    {/* Above the arrow: Action/reason label text in 10px bold text */}
                    <Text
                      fontSize={10}
                      fontWeight="700"
                      color="#2563EB"
                      numberOfLines={1}
                      textAlign="center"
                      style={{ letterSpacing: 0.2 }}
                    >
                      {transition.action || 'Moved'}
                    </Text>

                    {/* Bold blue horizontal line with right-pointing arrow (#2563EB) */}
                    <XStack alignItems="center" width="100%" height={10}>
                      <View
                        style={{
                          flex: 1,
                          height: 2.5,
                          backgroundColor: '#2563EB',
                          borderRadius: 1,
                        }}
                      />
                      <View
                        style={{
                          width: 0,
                          height: 0,
                          borderTopWidth: 5,
                          borderBottomWidth: 5,
                          borderLeftWidth: 7,
                          borderTopColor: 'transparent',
                          borderBottomColor: 'transparent',
                          borderLeftColor: '#2563EB',
                        }}
                      />
                    </XStack>

                    {/* Below the arrow: circular avatar + user display name + timestamp */}
                    <XStack
                      alignItems="center"
                      gap={5}
                      maxWidth="100%"
                      justifyContent="center"
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: '#0F5132',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                          {transition.actorInitials || 'SK'}
                        </Text>
                      </View>
                      <YStack flexShrink={1}>
                        <Text
                          fontSize={10}
                          fontWeight="600"
                          color="#334155"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {transition.actorName || 'sai krishna kanth'}
                        </Text>
                        <Text
                          fontSize={9}
                          fontWeight="500"
                          color="#64748B"
                          numberOfLines={1}
                        >
                          {transition.timestamp || 'Today'}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                )}
              </React.Fragment>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
