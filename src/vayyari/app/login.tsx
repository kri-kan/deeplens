import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@vayyari.local');
  const [password, setPassword] = useState('Krikank1$');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
      // Explicitly navigate to the dashboard (tabs) on success
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
              Vayyari
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: 4 }}>
              Business Suite
            </Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Text variant="headlineSmall" style={styles.welcomeText}>
              Welcome Back
            </Text>
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              disabled={isSubmitting}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!isPasswordVisible}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              disabled={isSubmitting}
              right={
                <TextInput.Icon 
                  icon={isPasswordVisible ? "eye-off" : "eye"} 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  forceTextInputFocus={false}
                />
              }
            />

            {error && (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            )}

            <Button 
              mode="contained" 
              onPress={handleLogin}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              contentStyle={styles.loginButtonContent}
            >
              Sign In
            </Button>

            <Button 
              mode="text" 
              onPress={() => {}} 
              style={styles.forgotButton}
              textColor={theme.colors.outline}
            >
              Forgot Password?
            </Button>
          </View>

          <View style={styles.footer}>
            <Text variant="bodySmall" style={{ color: theme.colors.outlineVariant }}>
              Vayyari v1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  formContainer: {
    padding: 32,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  welcomeText: {
    marginBottom: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 0, // No line rule as per design specs
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  errorText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  forgotButton: {
    marginTop: 8,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
});
