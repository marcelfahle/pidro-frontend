import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  AVATAR_MAX_BYTES,
  BIO_MAX_LENGTH,
  bioError,
  bioLength,
  normalizeBio,
  publicPlayerName,
} from '@pidro/shared';
import { profileApi, type ClassicProfile } from '@/api/profile';
import { apiErrorInfo } from '@/utils/apiErrors';
import { Avatar } from '@/components/ui/Avatar';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { BevelButton } from '@/components/ui/BevelButton';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PidroLayout, PidroSpacing } from '@/design/tokens';
import { authStore, useAuthStore } from '@/stores/auth';
import { useProfileIdentity } from '@/hooks/useProfileIdentity';
import { usePillClearance } from '@/components/shell/TabPill';

type AvatarDraft = Blob | { uri: string; name: string; type: string };

export default function ProfileScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  return <ProfileContent key={userId} />;
}

function ProfileContent() {
  const { width, height, fontScale } = useWindowDimensions();
  // Window width also handles iPad split view. Larger text gets the roomier stack.
  const twoColumns = width >= PidroLayout.landscapeMinWidth * Math.max(1, fontScale);
  const shortWindow = height < PidroLayout.compactHeight;
  const pillClearance = usePillClearance();
  const horizontalPadding = width > height ? PidroSpacing.lg : PidroSpacing.md;
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { classicClaimed } = useLocalSearchParams<{ classicClaimed?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const refreshIdentity = useProfileIdentity();
  const [draft, setDraft] = useState<AvatarDraft | null>(null);
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editor, setEditor] = useState<'photo' | 'bio' | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<'photo' | 'bio' | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [bioBaseline, setBioBaseline] = useState('');
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(classicClaimed === 'guest');
  const [classic, setClassic] = useState<ClassicProfile | null | undefined>(undefined);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    label: string;
    cancelLabel?: string;
    secondaryLabel?: string;
    secondary?: () => void;
    proceed: () => void;
  } | null>(null);
  const dirty =
    editor === 'photo' ? !!draft : editor === 'bio' && normalizeBio(bioDraft) !== bioBaseline;

  const closeEditor = () => {
    Keyboard.dismiss();
    setEditor(null);
    setDraft(null);
    setDraftUri(null);
    setError(null);
  };

  const confirmDiscard = (proceed: () => void) => {
    setConfirmation({
      title: 'Discard changes?',
      description: 'Your saved profile will stay the same.',
      label: 'Discard changes',
      cancelLabel: 'Keep editing',
      proceed: () => {
        closeEditor();
        proceed();
      },
    });
  };

  usePreventRemove(!!dirty || busy, ({ data }) => {
    if (busy) {
      setConfirmation({
        title: 'Please wait',
        description: 'Your photo or bio is still being processed.',
        label: 'OK',
        proceed: () => {},
      });
    } else {
      confirmDiscard(() => navigation.dispatch(data.action));
    }
  });

  useEffect(() => {
    if (!pendingSignOut || dirty || busy) return;
    clearSession();
    router.replace('/welcome');
  }, [pendingSignOut, dirty, busy, clearSession, router]);

  useFocusEffect(
    useCallback(() => {
      void refreshIdentity()
        .then((identity) => {
          if (identity) setClassic(identity.classic ?? null);
          setRefreshError(false);
        })
        .catch(() => setRefreshError(true));
    }, [refreshIdentity])
  );

  const updateAvatarForCurrentSession = (
    avatarUrl: string | null,
    userId: string,
    token: string
  ) => {
    const current = authStore.getState();
    if (current.user?.id !== userId || current.accessToken !== token) return false;
    const currentUser = current.user;
    current.setSession({
      accessToken: token,
      refreshToken: current.refreshToken ?? undefined,
      user: { ...currentUser, avatar_url: avatarUrl },
    });
    return true;
  };

  const chooseAvatar = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset) throw new Error('No photo was returned');
      if (Platform.OS === 'web') {
        const uploadUri =
          asset.width > 1024 || asset.height > 1024
            ? (
                await ImageManipulator.manipulateAsync(
                  asset.uri,
                  [{ resize: asset.width >= asset.height ? { width: 1024 } : { height: 1024 } }],
                  { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG }
                )
              ).uri
            : asset.uri;
        const blob: Blob = await fetch(uploadUri).then((response) => response.blob());
        if (blob.size > AVATAR_MAX_BYTES) {
          setError('That photo is still larger than 5 MB. Choose a smaller image.');
          return;
        }
        setDraft(blob);
        setDraftUri(uploadUri);
      } else {
        const resized = await ImageManipulator.manipulateAsync(
          asset.uri,
          asset.width > 1024 || asset.height > 1024
            ? [{ resize: asset.width >= asset.height ? { width: 1024 } : { height: 1024 } }]
            : [],
          { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG }
        );
        setDraft({ uri: resized.uri, name: 'avatar.jpg', type: 'image/jpeg' });
        setDraftUri(resized.uri);
      }
    } catch (error) {
      console.warn('[Profile] image picker failed', error);
      setError(
        'Could not open that photo. Check photo access in Settings or choose another image.'
      );
    } finally {
      setBusy(false);
    }
  };

  const saveAvatar = async () => {
    if (!draft) return;
    const session = authStore.getState();
    if (!session.user || !session.accessToken) return;
    setBusy(true);
    setProgress(0);
    setError(null);
    setStatus(null);
    try {
      const result = await profileApi.uploadAvatar(draft, setProgress);
      if (updateAvatarForCurrentSession(result.avatar_url, session.user.id, session.accessToken)) {
        setDraft(null);
        setDraftUri(null);
        setEditor(null);
        setStatus('Profile photo saved.');
      }
    } catch (error) {
      const detail =
        (error as { response?: { data?: { errors?: { avatar?: string[] } } } }).response?.data
          ?.errors?.avatar?.[0] ?? apiErrorInfo(error).detail;
      setError(
        detail ? `Upload failed: ${detail}` : 'Upload failed. Your photo is ready to retry.'
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const removeAvatar = async () => {
    const session = authStore.getState();
    if (!session.user || !session.accessToken) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await profileApi.removeAvatar();
      updateAvatarForCurrentSession(null, session.user.id, session.accessToken);
      setDraft(null);
      setDraftUri(null);
      setEditor(null);
      setStatus('Profile photo removed.');
    } catch {
      setError('Could not remove your photo. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (next: 'photo' | 'bio') => {
    const open = () => {
      closeEditor();
      setBioDraft(user?.bio ?? '');
      setBioBaseline(normalizeBio(user?.bio ?? ''));
      setEditor(next);
      setFeedbackFor(next);
      setStatus(null);
    };
    if (dirty) confirmDiscard(open);
    else open();
  };

  const saveBio = async () => {
    const validationError = bioError(bioDraft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const session = authStore.getState();
    if (!session.user || !session.accessToken) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await profileApi.updateBio(bioDraft);
      const current = authStore.getState();
      if (current.user?.id !== session.user.id || current.accessToken !== session.accessToken)
        return;
      authStore.setState({ user: { ...current.user, bio: result.bio } });
      setBioDraft(normalizeBio(bioDraft));
      setEditor(null);
      setStatus('About me saved.');
      Keyboard.dismiss();
    } catch (saveError) {
      setError(
        apiErrorInfo(saveError).detail || 'Could not save your bio. Your draft is ready to retry.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    if (user?.guest) {
      setConfirmation({
        title: 'Save this guest before signing out?',
        description:
          'Signing out removes access to this unsaved player on this device. Inactive guest accounts are eligible for deletion after 30 days.',
        label: 'Sign out anyway',
        cancelLabel: 'Cancel',
        secondaryLabel: 'Save account',
        secondary: () => setAccountSheetOpen(true),
        proceed: () => {
          closeEditor();
          setPendingSignOut(true);
        },
      });
      return;
    }
    setConfirmation({
      title: 'Sign out?',
      description: dirty
        ? 'Your unsaved changes will be discarded.'
        : 'You can sign back in anytime.',
      label: 'Sign out',
      cancelLabel: 'Cancel',
      proceed: () => {
        closeEditor();
        setPendingSignOut(true);
      },
    });
  };

  const accountActions = (
    <View className="items-center gap-1 pt-4">
      {user?.guest ? (
        <BevelButton
          label="Save your progress"
          material="glass"
          size="sm"
          fullWidth
          onPress={() => setAccountSheetOpen(true)}
        />
      ) : null}
      {user?.email && (
        <PidroText role="metadata" tone="muted" align="center">
          {user.email}
        </PidroText>
      )}
      <Button label="Sign out" variant="ghost" disabled={busy} onPress={handleSignOut} />
    </View>
  );

  return (
    <ScreenShell
      scroll
      compact={!twoColumns}
      testID="profile-screen"
      contentStyle={{
        paddingBottom: PidroSpacing.md + pillClearance.bottom,
        paddingRight: horizontalPadding + pillClearance.right,
      }}>
      <View className={shortWindow ? 'gap-3' : 'gap-6'}>
        <ScreenHeader title="Your profile" onBack={() => router.back()} />
        {refreshError && (
          <PidroText role="metadata" tone="danger" accessibilityRole="alert">
            Could not refresh your profile. Reopen it to try again.
          </PidroText>
        )}
        <View className={twoColumns ? 'flex-row items-start gap-4' : 'gap-6'}>
          <View testID="profile-identity-column" className={twoColumns ? 'w-[38%]' : 'w-full'}>
            <Surface variant="card" className="gap-4" padded>
              <View className="flex-row items-center gap-4">
                <Avatar
                  uri={draftUri ?? user?.avatar_url}
                  // Override the bundled fallback's intrinsic RN Web dimensions.
                  style={{ width: shortWindow ? 64 : 80, height: shortWindow ? 64 : 80 }}
                  className="rounded-full"
                  resizeMode="cover"
                  accessibilityLabel="Profile picture"
                />
                <View className="min-w-0 flex-1 gap-1">
                  <PidroText role="title" numberOfLines={2}>
                    {publicPlayerName(user?.username, 'Player', user?.display_name)}
                  </PidroText>
                  <PidroText role="metadata" tone="muted">
                    This is how other players see you.
                  </PidroText>
                </View>
              </View>
              <View className="gap-3">
                {feedbackFor === 'photo' && error ? (
                  <PidroText role="metadata" tone="danger" accessibilityRole="alert">
                    {error}
                  </PidroText>
                ) : null}
                {feedbackFor === 'photo' && status ? (
                  <PidroText role="metadata" tone="cyan" accessibilityLiveRegion="polite">
                    {status}
                  </PidroText>
                ) : null}
                {progress != null ? (
                  <PidroText role="metadata" tone="cyan" align="center">
                    {progress < 100 ? `Uploading… ${progress}%` : 'Processing photo…'}
                  </PidroText>
                ) : null}
                {editor === 'photo' ? (
                  <>
                    <PidroText role="metadata" tone="muted">
                      {draft
                        ? 'Looking good? Save this photo to your profile.'
                        : 'Choose a photo so friends can recognize you.'}
                    </PidroText>
                    <Button
                      label={draft ? 'Choose another photo' : 'Choose photo'}
                      variant="outline"
                      disabled={busy}
                      onPress={chooseAvatar}
                    />
                    <View className="flex-row gap-3">
                      {draft ? (
                        <>
                          <View className="flex-1">
                            <Button
                              label="Cancel"
                              variant="outline"
                              disabled={busy}
                              onPress={closeEditor}
                            />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Save photo"
                              loading={busy}
                              disabled={busy}
                              onPress={saveAvatar}
                            />
                          </View>
                        </>
                      ) : (
                        <>
                          <Button
                            label="Done"
                            variant="ghost"
                            disabled={busy}
                            onPress={closeEditor}
                            className="flex-1"
                          />
                          {user?.avatar_url ? (
                            <Button
                              label="Remove photo"
                              variant="ghost"
                              disabled={busy}
                              onPress={() =>
                                setConfirmation({
                                  title: 'Remove photo?',
                                  description: 'You’ll use the default avatar instead.',
                                  label: 'Remove photo',
                                  cancelLabel: 'Cancel',
                                  proceed: () => {
                                    void removeAvatar();
                                  },
                                })
                              }
                              className="flex-1"
                            />
                          ) : null}
                        </>
                      )}
                    </View>
                  </>
                ) : (
                  <Button
                    label="Edit photo"
                    variant="outline"
                    disabled={busy}
                    onPress={() => beginEdit('photo')}
                  />
                )}
              </View>
            </Surface>
            {twoColumns && accountActions}
          </View>
          <View testID="profile-bio-column" className={twoColumns ? 'min-w-0 flex-1' : 'w-full'}>
            <Surface variant="panel" className="gap-3" padded>
              <View className="flex-row items-center justify-between gap-3">
                <PidroText role="label">About me</PidroText>
                {editor !== 'bio' ? (
                  <Button
                    label={user?.bio ? 'Edit' : 'Add'}
                    accessibilityLabel={user?.bio ? 'Edit bio' : 'Add bio'}
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onPress={() => beginEdit('bio')}
                  />
                ) : null}
              </View>
              {editor === 'bio' ? (
                <>
                  <Input
                    accessibilityLabel="About me"
                    autoFocus
                    multiline
                    numberOfLines={shortWindow ? 3 : 5}
                    value={bioDraft}
                    editable={!busy}
                    onChangeText={(text) => {
                      setBioDraft(text);
                      setError(null);
                    }}
                    error={bioError(bioDraft) ?? error ?? undefined}
                    className={shortWindow ? 'min-h-20 py-3' : 'min-h-28 py-3'}
                    textAlignVertical="top"
                    placeholder="A little about you, on or off the table…"
                  />
                  <View className="flex-row flex-wrap justify-between gap-3">
                    <PidroText role="metadata" tone="muted">
                      Visible to other players
                    </PidroText>
                    <PidroText
                      role="metadata"
                      tone={bioLength(bioDraft) > BIO_MAX_LENGTH ? 'danger' : 'muted'}
                      align="right">
                      {BIO_MAX_LENGTH - bioLength(bioDraft)} remaining
                    </PidroText>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        label="Cancel"
                        variant="outline"
                        disabled={busy}
                        onPress={closeEditor}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Save bio"
                        loading={busy}
                        disabled={!dirty || !!bioError(bioDraft)}
                        onPress={saveBio}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <PidroText
                  role="body"
                  className="break-words"
                  tone={user?.bio ? 'default' : 'muted'}>
                  {user?.bio ||
                    'Share a little about yourself. A favorite Pidro memory is a good start.'}
                </PidroText>
              )}
              {feedbackFor === 'bio' && status && (
                <PidroText role="metadata" tone="cyan" accessibilityLiveRegion="polite">
                  {status}
                </PidroText>
              )}
            </Surface>
          </View>
        </View>
        {classic !== undefined ? (
          classic ? (
            <ClassicSection classic={classic} />
          ) : (
            <Surface variant="panel" padded style={styles.classicSection}>
              <View style={styles.classicHeading}>
                <PidroText role="label">Pidro Classic</PidroText>
                <PidroText role="body" tone="soft">
                  Played the original game? Bring your Classic name and career into this profile.
                </PidroText>
              </View>
              <BevelButton
                label="Claim Pidro Classic"
                material="glass"
                size="sm"
                fullWidth
                onPress={() => router.push('/(auth)/claim-classic')}
              />
            </Surface>
          )
        ) : null}
        {!twoColumns && accountActions}
      </View>
      <Modal
        isOpen={!!confirmation}
        title={confirmation?.title}
        description={confirmation?.description}
        onClose={() => setConfirmation(null)}>
        {confirmation && (
          <View className="gap-2">
            {confirmation.cancelLabel && (
              <Button
                label={confirmation.cancelLabel}
                variant="outline"
                onPress={() => setConfirmation(null)}
              />
            )}
            {confirmation.secondaryLabel && confirmation.secondary ? (
              <BevelButton
                label={confirmation.secondaryLabel}
                material="wood"
                size="sm"
                fullWidth
                onPress={() => {
                  const secondary = confirmation.secondary;
                  setConfirmation(null);
                  secondary?.();
                }}
              />
            ) : null}
            <Button
              label={confirmation.label}
              variant={confirmation.cancelLabel ? 'destructive' : 'outline'}
              onPress={() => {
                const proceed = confirmation.proceed;
                setConfirmation(null);
                proceed();
              }}
            />
          </View>
        )}
      </Modal>
      <AuthSheet
        isOpen={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onClaimClassic={() => {
          setAccountSheetOpen(false);
          router.push('/(auth)/claim-classic');
        }}
      />
    </ScreenShell>
  );
}

function ClassicSection({ classic }: { classic: ClassicProfile }) {
  const metrics = [
    classic.games_played != null
      ? { label: 'Games played', value: classic.games_played.toLocaleString() }
      : null,
    classic.wins != null ? { label: 'Wins', value: classic.wins.toLocaleString() } : null,
    classic.losses != null ? { label: 'Losses', value: classic.losses.toLocaleString() } : null,
    classic.win_rate != null
      ? { label: 'Win rate', value: `${Math.round(classic.win_rate * 100)}%` }
      : null,
    classic.level != null ? { label: 'Classic level', value: String(classic.level) } : null,
  ].filter((metric): metric is { label: string; value: string } => metric !== null);

  return (
    <Surface testID="profile-classic-section" variant="card" padded style={styles.classicSection}>
      <View style={styles.classicHeading}>
        <PidroText role="title" tone="gold">
          Pidro Classic
        </PidroText>
        {classic.name ? (
          <PidroText role="label">Played as {classic.name}</PidroText>
        ) : (
          <PidroText role="metadata" tone="muted">
            Classic name kept private
          </PidroText>
        )}
      </View>
      {metrics.length ? (
        <View style={styles.classicMetrics}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={styles.classicMetric}
              accessible
              accessibilityLabel={`${metric.label}: ${metric.value}`}>
              <PidroText role="title" tone="gold" align="center">
                {metric.value}
              </PidroText>
              <PidroText role="metadata" tone="muted" align="center">
                {metric.label}
              </PidroText>
            </View>
          ))}
        </View>
      ) : null}
      {classic.member_since || classic.claimed_at ? (
        <View style={styles.classicDates}>
          {classic.member_since ? (
            <PidroText role="metadata" tone="soft">
              Member since {formatClassicDate(classic.member_since)}
            </PidroText>
          ) : null}
          {classic.claimed_at ? (
            <PidroText role="metadata" tone="soft">
              Claimed on {formatClassicDate(classic.claimed_at)}
            </PidroText>
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
}

function formatClassicDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const styles = StyleSheet.create({
  classicSection: {
    gap: PidroSpacing.md,
  },
  classicHeading: {
    gap: PidroSpacing.xxs,
  },
  classicMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.xs,
  },
  classicMetric: {
    minWidth: 104,
    flexGrow: 1,
    gap: PidroSpacing.xxs,
  },
  classicDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: PidroSpacing.xs,
  },
});
