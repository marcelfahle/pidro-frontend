import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { AuthScreenFrame } from '@/components/ui/AuthScreenFrame';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroLayout, PidroType } from '@/design/tokens';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const handleLogin = async () => {
    if (!username || !password) return;
    const success = await signIn(username, password);
    if (success) router.replace('/home');
  };

  return (
    <AuthScreenFrame
      title="Welcome back"
      subtitle="Sign in to return to your table."
      error={error}
      footer={
        <>
          <PidroText role="metadata" tone="soft">
            New to Pidro?
          </PidroText>
          <Link href="/(auth)/register" style={styles.link}>
            Create an account
          </Link>
        </>
      }>
      <View style={[styles.fields, landscape && styles.fieldsLandscape]}>
        <View style={landscape && styles.fieldLandscape}>
          <Input
            label="Username"
            placeholder="Enter your username"
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
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            textContentType="password"
            onSubmitEditing={handleLogin}
          />
        </View>
      </View>
      <Button
        label="Sign in"
        onPress={handleLogin}
        loading={isLoading}
        disabled={!username || !password}
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
