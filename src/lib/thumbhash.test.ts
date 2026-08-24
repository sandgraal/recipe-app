import { describe, it, expect } from 'vitest';
import { rgbaToThumbHash } from 'thumbhash';
import { thumbhashToDataUrl } from '@/lib/thumbhash';

describe('thumbhashToDataUrl', () => {
  it('returns undefined for empty / nullish input', () => {
    expect(thumbhashToDataUrl(undefined)).toBeUndefined();
    expect(thumbhashToDataUrl(null)).toBeUndefined();
    expect(thumbhashToDataUrl('')).toBeUndefined();
  });

  it('returns undefined for invalid base64', () => {
    expect(thumbhashToDataUrl('not valid base64 @@@')).toBeUndefined();
  });

  it('decodes a real ThumbHash into an image data URL', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]);
    const hash = Buffer.from(rgbaToThumbHash(2, 2, rgba)).toString('base64');
    const url = thumbhashToDataUrl(hash);
    expect(url).toMatch(/^data:image\//);
  });
});
