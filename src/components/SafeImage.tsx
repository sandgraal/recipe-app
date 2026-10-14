import Image, { type ImageProps } from 'next/image';
import { canOptimizeImage } from '@/lib/imageHost';

/**
 * next/image that never crashes on an unknown host. Our own storage (and
 * same-site paths) go through the optimizer; anything else, such as a recipe
 * whose photo is still a hotlink, is rendered as-is (`unoptimized`), so old rows
 * keep showing and `next dev` does not throw "hostname is not configured".
 */
export default function SafeImage(props: ImageProps) {
  const src = props.src;
  const optimize = typeof src === 'string' ? canOptimizeImage(src) : true; // static imports are always local
  // eslint-disable-next-line jsx-a11y/alt-text -- alt comes through props
  return <Image {...props} unoptimized={props.unoptimized || !optimize} />;
}
