import { AVATAR_MAX_BYTES } from '@pidro/shared';
import { useEffect, useRef, useState } from 'react';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';

export function AvatarEditor({
  avatarUrl,
  onSaved,
}: {
  avatarUrl: string | null;
  onSaved: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!draft) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(draft);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft]);

  async function save(remove = false) {
    const session = useAuthStore.getState();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    setProgress(remove ? null : 0);
    try {
      const result = remove
        ? await profileApi.removeAvatar()
        : await profileApi.uploadAvatar(draft!, setProgress);
      const current = useAuthStore.getState();
      if (current.user?.id !== session.user?.id || current.accessToken !== session.accessToken)
        return;
      if (current.user) useAuthStore.setState({ user: { ...current.user, ...result } });
      onSaved(result.avatar_url);
      setDraft(null);
      setNotice(remove ? 'Photo removed.' : 'Photo saved. Your tables will update automatically.');
    } catch (err) {
      const detail = (err as { response?: { data?: { errors?: { avatar?: string[] } } } }).response
        ?.data?.errors?.avatar?.[0];
      setError(
        detail ??
          (remove
            ? 'Could not remove your photo. Try again.'
            : 'Could not save your photo. Your current photo is unchanged — try again.'),
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <section aria-label="Profile photo" className="mt-5 space-y-3 border-t border-cyan-200/15 pt-4">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        aria-label="Choose profile photo"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setError(undefined);
          setNotice(undefined);
          if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setError('Choose a JPEG or PNG image. On a phone, export HEIC as JPEG first.');
            return;
          }
          if (file.size > AVATAR_MAX_BYTES) {
            setError('Choose an image smaller than 5 MiB.');
            return;
          }
          setDraft(file);
        }}
      />
      {preview && (
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={preview}
            alt="New avatar preview"
            className="h-24 w-24 shrink-0 rounded-full border-2 border-cyan-200/60 object-cover"
            onError={() => {
              setDraft(null);
              setError('This image could not be opened. Choose a different JPEG or PNG.');
            }}
          />
          <p className="max-w-xs text-sm text-cyan-50/75">
            This centered crop is how your photo will appear at the table. Save when you’re happy
            with it.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {draft ? (
          <>
            <Button size="sm" loading={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save photo'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setDraft(null);
                setError(undefined);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {avatarUrl ? 'Replace photo' : 'Choose photo'}
            </Button>
            {avatarUrl && (
              <Button size="sm" variant="secondary" loading={busy} onClick={() => void save(true)}>
                Remove photo
              </Button>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-cyan-50/60">
        JPEG or PNG · up to 5 MiB · visible to other players
      </p>
      {progress != null && (
        <div role="status" className="text-sm text-cyan-100">
          {progress < 100 ? `Uploading… ${progress}%` : 'Processing photo…'}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-cyan-100">
          {notice}
        </p>
      )}
    </section>
  );
}
