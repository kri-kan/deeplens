import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, Animated, Easing, Keyboard } from 'react-native';
import { Text, Appbar, useTheme, IconButton, Avatar, Surface, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'Hello! I am your AI Assistant. How can I help you today?',
    sender: 'ai',
    timestamp: new Date(),
  },
];

/**
 * FadeInView Component
 * 
 * A reusable wrapper that applies a subtle fade-in and slide-up 
 * micro-animation to its children. Used primarily for chat bubbles 
 * to give the interface a dynamic, alive feeling.
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - The elements to animate
 * @param {object} [props.style] - Optional React Native styles
 * @param {number} [props.delay=0] - Delay before animation starts (ms)
 */
const FadeInView = ({ children, style, delay = 0 }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View style={{ ...style, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const TypingIndicator = () => {
  const theme = useTheme();
  return (
    <View style={styles.typingContainer}>
      <Avatar.Icon size={32} icon="robot-outline" style={{ backgroundColor: theme.colors.primary, marginRight: 8 }} color="#fff" />
      <Surface style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.colors.surfaceVariant, paddingVertical: 14 }]} elevation={0}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </Surface>
    </View>
  );
};

/**
 * AIScreen Component
 * 
 * The primary interface for interacting with the AI Assistant.
 * Includes a premium chat UI with custom message bubbles, 
 * typing indicators, auto-scrolling capabilities, and 
 * gesture-based navigation.
 */
export default function AIScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I am a Gemini-like AI. I am still learning, but I am here to assist you with your queries!',
        sender: 'ai',
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';

    return (
      <FadeInView style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
        {!isUser && (
          <Avatar.Icon size={32} icon="robot-outline" style={{ backgroundColor: theme.colors.primary, marginRight: 8 }} color="#fff" />
        )}
        <Surface
          style={[
            styles.messageBubble,
            isUser ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceVariant },
            isUser ? styles.userBubble : styles.aiBubble
          ]}
          elevation={isUser ? 2 : 0}
        >
          <Text style={{ color: isUser ? '#fff' : theme.colors.onSurfaceVariant, fontSize: 16, lineHeight: 24 }}>
            {item.text}
          </Text>
        </Surface>
      </FadeInView>
    );
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(-40)
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -50) {
        router.back();
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="AI Assistant" titleStyle={{ fontWeight: '800', fontSize: 20 }} />
        <Appbar.Action icon="dots-horizontal" onPress={() => {}} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isTyping ? <FadeInView><TypingIndicator /></FadeInView> : <View style={{ height: 10 }} />}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <Surface style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]} elevation={4}>
          <TextInput
            style={[styles.textInput, { color: theme.colors.onSurface }]}
            placeholder="Message AI Assistant..."
            placeholderTextColor={theme.colors.onSurfaceDisabled}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <IconButton
            icon="auto-fix"
            iconColor={inputText.trim() ? '#fff' : theme.colors.onSurfaceDisabled}
            containerColor={inputText.trim() ? theme.colors.primary : 'transparent'}
            size={24}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
            style={styles.sendButton}
          />
        </Surface>
      </KeyboardAvoidingView>
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  messageWrapperAI: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    borderRadius: 30,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  sendButton: {
    margin: 4,
  }
});
