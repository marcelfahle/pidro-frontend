import { useState } from 'react';
import { Image, type ImageProps, type ImageSourcePropType } from 'react-native';

const fallback = require('~/assets/images/avatar1.png') as ImageSourcePropType;

type Props = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  fallbackSource?: ImageSourcePropType;
};

/** An avatar that owns image load failures and always leaves a usable fallback. */
export function Avatar({ uri, fallbackSource = fallback, onError, ...props }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  return (
    <Image
      {...props}
      source={uri && failedUri !== uri ? { uri } : fallbackSource}
      onError={(event) => {
        if (uri) setFailedUri(uri);
        onError?.(event);
      }}
    />
  );
}
