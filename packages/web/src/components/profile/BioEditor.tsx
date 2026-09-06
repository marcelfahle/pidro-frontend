import { BIO_MAX_LENGTH, bioError, bioLength } from '@pidro/shared';
import { useState } from 'react';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';

export function BioEditor({
  bio,
  onSaved,
}: {
  bio: string | null;
  onSaved: (bio: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const validation = bioError(draft);
  const remaining = BIO_MAX_LENGTH - bioLength(draft);

  async function save() {
    if (validation) return;
    const session = useAuthStore.getState();
    setBusy(true);
    setError(undefined);
    try {
      const result = await profileApi.updateBio(draft);
      const current = useAuthStore.getState();
      if (current.user?.id !== session.user?.id || current.accessToken !== session.accessToken)
        return;
      if (current.user) useAuthStore.setState({ user: { ...current.user, ...result } });
      onSaved(result.bio);
      setEditing(false);
      setNotice(result.bio ? 'Bio saved.' : 'Bio cleared.');
    } catch {
      setError('Could not save your bio. Your draft is still here — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="bio-heading" className="space-y-3">
      <h2 id="bio-heading" className="text-lg font-bold text-white">
        About me
      </h2>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          <label htmlFor="bio" className="block text-sm text-cyan-50/75">
            A little about you, visible to other players.
          </label>
          <textarea
            id="bio"
            // biome-ignore lint/a11y/noAutofocus: Focus follows an explicit Edit action, not page load.
            autoFocus
            rows={4}
            value={draft}
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
            aria-describedby="bio-count bio-help"
            aria-invalid={!!validation}
            className="pidro-input w-full resize-y whitespace-pre-wrap break-words"
            placeholder="What brings you to the table?"
          />
          <div
            id="bio-count"
            className={`text-right text-sm ${remaining < 0 ? 'text-red-200' : 'text-cyan-50/70'}`}
          >
            {remaining >= 0
              ? `${remaining} characters remaining`
              : `${-remaining} characters over the limit`}
          </div>
          <p id="bio-help" className="text-xs text-cyan-50/60">
            Up to 280 characters. Some emoji count as multiple characters. Clear the text to remove
            your bio.
          </p>
          {validation && (
            <p role="alert" className="text-sm text-red-200">
              {validation}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={busy} disabled={!!validation}>
              {busy ? 'Saving…' : 'Save bio'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p
            dir="auto"
            className="whitespace-pre-wrap text-sm leading-relaxed text-cyan-50/85 [overflow-wrap:anywhere] [unicode-bidi:plaintext]"
          >
            {bio || 'Tell other players a little about yourself.'}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDraft(bio ?? '');
              setNotice(undefined);
              setEditing(true);
            }}
          >
            {bio ? 'Edit bio' : 'Add bio'}
          </Button>
          {notice && (
            <p role="status" className="text-sm text-cyan-100">
              {notice}
            </p>
          )}
        </>
      )}
    </section>
  );
}
