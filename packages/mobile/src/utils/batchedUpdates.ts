import { unstable_batchedUpdates as rnBatchedUpdates } from 'react-native';

/**
 * Cross-platform batched updates.
 *
 * `react-native` exposes `unstable_batchedUpdates`, but `react-native-web` does
 * NOT — there it's `undefined`, so calling it throws "not a function" and crashes
 * the Phoenix channel handlers on web. React 18 auto-batches state updates anyway,
 * so fall back to invoking the callback directly when the native batcher is absent.
 */
export const batchedUpdates: (callback: () => void) => void =
  typeof rnBatchedUpdates === 'function' ? rnBatchedUpdates : (callback) => callback();
