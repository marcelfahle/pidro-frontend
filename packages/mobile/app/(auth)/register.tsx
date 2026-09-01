import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroLayout, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, isLoading, error: authError } = useAuth();
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const handleRegister = async () => {
    setValidationError(null);
    if (!username || !email || !password || !confirmPassword) {
      setValidationError('Please complete every field.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('The passwords do not match.');
      return;
    }
    const success = await signUp(username, email, password);
    if (success) router.replace('/home');
  };

  return (
    <AuthScreenFrame
      title="Create your account"
      subtitle="Choose your name and claim a seat at the table."
      error={validationError || authError}
      footer={
        <>
          <PidroText role="metadata" tone="soft">
            Already have an account?
          </PidroText>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </>
      }>
      <View style={[styles.fields, landscape && styles.fieldsLandscape]}>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            textContentType="username"
          />
        </View>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            textContentType="emailAddress"
          />
        </View>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            label="Password"
            placeholder="Choose a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="next"
            textContentType="newPassword"
          />
        </View>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            label="Confirm password"
            placeholder="Enter the password again"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            returnKeyType="go"
            textContentType="newPassword"
            onSubmitEditing={handleRegister}
          />
        </View>
      </View>
      <Button
        label="Create account"
        onPress={handleRegister}
        loading={isLoading}
        disabled={!username || !email || !password || !confirmPassword}
        size="lg"
      />
    </AuthScreenFrame>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  fieldsLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLandscape: {
    width: '49%',
  },
  link: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    textAlign: 'center',
    color: PidroColors.cyanText,
    ...PidroType.metadata,
    paddingVertical: 14,
  },
});
