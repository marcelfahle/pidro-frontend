import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileApi } from '../../api/profile';
import { AvatarEditor } from './AvatarEditor';
import { PlayerAvatar } from './PlayerAvatar';

vi.mock('../../api/profile', () => ({
  profileApi: { uploadAvatar: vi.fn(), removeAvatar: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('avatar editing', () => {
  it('previews, cancels, preserves a failed draft and retries', async () => {
    const onSaved = vi.fn();
    render(<AvatarEditor avatarUrl="old" onSaved={onSaved} />);
    const pick = () =>
      fireEvent.change(screen.getByLabelText('Choose profile photo'), {
        target: { files: [new File(['image'], 'photo.jpg', { type: 'image/jpeg' })] },
      });
    pick();
    expect(await screen.findByAltText('New avatar preview')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(profileApi.uploadAvatar).not.toHaveBeenCalled();
    pick();
    vi.mocked(profileApi.uploadAvatar)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ avatar_url: 'new' });
    fireEvent.click(screen.getByText('Save photo'));
    expect(await screen.findByRole('alert')).toHaveTextContent('unchanged');
    expect(screen.getByAltText('New avatar preview')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Save photo'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('new'));
  });

  it('rejects unsupported files and removes an existing photo', async () => {
    const onSaved = vi.fn();
    render(<AvatarEditor avatarUrl="old" onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Choose profile photo'), {
      target: { files: [new File(['x'], 'photo.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('JPEG or PNG');
    vi.mocked(profileApi.removeAvatar).mockResolvedValue({ avatar_url: null });
    fireEvent.click(screen.getByText('Remove photo'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(null));
  });

  it('falls back on image failure and attempts a replacement URL', () => {
    const { container, rerender } = render(<PlayerAvatar src="old" initial="A" />);
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByText('A')).toBeTruthy();
    rerender(<PlayerAvatar src="new" initial="A" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'new');
  });
});
