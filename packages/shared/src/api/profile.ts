import type { ApiClient } from './client';

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const BIO_MAX_LENGTH = 280;

// Frozen ECMAScript edge whitespace; keep identical to User.bio_changeset/2.
const BIO_EDGE_WHITESPACE =
  /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$/g;

export function normalizeBio(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(BIO_EDGE_WHITESPACE, '');
}

export function bioLength(value: string): number {
  return Array.from(normalizeBio(value)).length;
}

export function bioError(value: string): string | null {
  const points = Array.from(value);
  if (
    points.some((point) => {
      const code = point.codePointAt(0)!;
      return code === 0 || (code >= 0xd800 && code <= 0xdfff);
    })
  )
    return 'Your bio contains an unsupported character.';
  return bioLength(value) > BIO_MAX_LENGTH
    ? `Keep your bio to ${BIO_MAX_LENGTH} characters.`
    : null;
}

export interface ProfileIdentity {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function createProfileApi(api: ApiClient) {
  return {
    getIdentity: async (): Promise<ProfileIdentity> => {
      const response = await api.get<{ data: ProfileIdentity }>('/api/v1/profile');
      return response.data.data;
    },
    getPlayer: async (id: string): Promise<ProfileIdentity> => {
      const response = await api.get<{ data: ProfileIdentity }>(
        `/api/v1/profiles/${encodeURIComponent(id)}`
      );
      return response.data.data;
    },
    updateBio: async (draft: string) => {
      const error = bioError(draft);
      if (error) throw new Error(error);
      const response = await api.patch<{ data: { bio: string | null } }>('/api/v1/profile', {
        bio: normalizeBio(draft) || null,
      });
      return response.data.data;
    },
    uploadAvatar: async (
      file: Blob | { uri: string; name: string; type: string },
      onProgress?: (percent: number) => void
    ) => {
      const data = new FormData();
      // React Native's FormData accepts a file URI instead of a browser Blob.
      data.append('avatar', file as Blob);
      const response = await api.post<{ data: { avatar_url: string } }>(
        '/api/v1/profile/avatar',
        data,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
          onUploadProgress: ({ loaded, total }) => {
            if (total) onProgress?.(Math.min(100, Math.round((loaded / total) * 100)));
          },
        }
      );
      return response.data.data;
    },
    removeAvatar: async () => {
      const response = await api.delete<{ data: { avatar_url: null } }>('/api/v1/profile/avatar');
      return response.data.data;
    },
  };
}
