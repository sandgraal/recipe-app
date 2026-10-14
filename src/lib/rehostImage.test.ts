import { describe, it, expect, vi } from 'vitest';
import {
  checkImageResponse, imageExtension, mediaType, readCapped, rehostPath, rehostImage, MAX_IMAGE_BYTES, type StorageLike,
} from '@/lib/rehostImage';

const OURS = 'https://cjnwvxtomwyszcfuvgpw.supabase.co/storage/v1/object/public/recipe-images/a.jpg';
const PNG = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

function image(init: { status?: number; type?: string | null; length?: string; body?: Uint8Array | null } = {}) {
  const headers: Record<string, string> = {};
  if (init.type !== null) headers['content-type'] = init.type ?? 'image/png';
  if (init.length) headers['content-length'] = init.length;
  return new Response((init.body === null ? null : (init.body ?? PNG)) as BodyInit | null, { status: init.status ?? 200, headers });
}

function fakeStorage(uploadError: unknown = null) {
  const uploads: Array<{ path: string; contentType: string; size: number }> = [];
  const storage: StorageLike = {
    storage: {
      from: (bucket: string) => ({
        upload: async (path, body, opts) => {
          uploads.push({ path: `${bucket}/${path}`, contentType: opts.contentType, size: body.byteLength });
          return { error: uploadError };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cjnwvxtomwyszcfuvgpw.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
  };
  return { storage, uploads };
}

describe('mediaType / imageExtension', () => {
  it('normalises the header and accepts only real image types', () => {
    expect(mediaType('IMAGE/JPEG; charset=binary')).toBe('image/jpeg');
    expect(imageExtension('image/jpeg')).toBe('jpg');
    expect(imageExtension('image/webp')).toBe('webp');
    expect(imageExtension('image/svg+xml')).toBeNull(); // scripts can hide in SVG
    expect(imageExtension('text/html')).toBeNull();
    expect(imageExtension(null)).toBeNull();
  });
});

describe('checkImageResponse', () => {
  it('accepts a small image', () => {
    expect(checkImageResponse({ ok: true, contentType: 'image/png', contentLength: '1000' })).toEqual({ ok: true, contentType: 'image/png', ext: 'png' });
    expect(checkImageResponse({ ok: true, contentType: 'image/png', contentLength: null })).toMatchObject({ ok: true });
  });
  it('refuses failed responses, non-images and oversize files', () => {
    expect(checkImageResponse({ ok: false, contentType: 'image/png', contentLength: '1' })).toEqual({ ok: false, reason: 'fetch_failed' });
    expect(checkImageResponse({ ok: true, contentType: 'text/html', contentLength: '1' })).toEqual({ ok: false, reason: 'not_image' });
    expect(checkImageResponse({ ok: true, contentType: 'image/png', contentLength: String(MAX_IMAGE_BYTES + 1) })).toEqual({ ok: false, reason: 'too_large' });
    expect(checkImageResponse({ ok: true, contentType: 'image/png', contentLength: String(MAX_IMAGE_BYTES) })).toMatchObject({ ok: true });
  });
});

describe('readCapped', () => {
  const stream = (...chunks: number[]) => new ReadableStream<Uint8Array>({
    start(c) { for (const n of chunks) c.enqueue(new Uint8Array(n)); c.close(); },
  });
  it('reads a body under the cap', async () => {
    const buf = await readCapped(stream(5, 5), 20);
    expect(buf).toBeInstanceOf(Buffer);
    expect((buf as Buffer).byteLength).toBe(10);
  });
  it('stops once the cap is passed, even without a Content-Length', async () => {
    expect(await readCapped(stream(10, 10, 10), 25)).toBe('too_large');
  });
  it('an empty or missing body is null', async () => {
    expect(await readCapped(null)).toBeNull();
    expect(await readCapped(stream(), 10)).toBeNull();
  });
});

describe('rehostPath', () => {
  it('is unique per call and keeps the extension', () => {
    expect(rehostPath('jpg', 5, 'abc')).toBe('recipe-rehost-5-abc.jpg');
    expect(rehostPath('png')).not.toBe(rehostPath('png'));
  });
});

describe('rehostImage', () => {
  it('leaves an image already in our storage alone (no download)', async () => {
    const { storage, uploads } = fakeStorage();
    const fetchImage = vi.fn();
    expect(await rehostImage(OURS, storage, { fetchImage })).toEqual({ ok: true, url: OURS, unchanged: true });
    expect(fetchImage).not.toHaveBeenCalled();
    expect(uploads).toHaveLength(0);
  });

  it('downloads a hotlink and returns OUR public url', async () => {
    const { storage, uploads } = fakeStorage();
    const r = await rehostImage('https://recipeoutline.com/pizza.png', storage, { fetchImage: async () => image() });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.unchanged).toBe(false);
      expect(r.url).toMatch(/^https:\/\/cjnwvxtomwyszcfuvgpw\.supabase\.co\/storage\/v1\/object\/public\/recipe-images\/recipe-rehost-.*\.png$/);
    }
    expect(uploads).toEqual([expect.objectContaining({ contentType: 'image/png', size: PNG.byteLength })]);
  });

  it.each([
    ['a private address', 'http://127.0.0.1/x.png', undefined, 'blocked'],
    ['a 404', 'https://x.example/a.png', image({ status: 404 }), 'fetch_failed'],
    ['an HTML page', 'https://x.example/a.png', image({ type: 'text/html' }), 'not_image'],
    ['no content type', 'https://x.example/a.png', image({ type: null }), 'not_image'],
    ['a declared huge file', 'https://x.example/a.png', image({ length: String(MAX_IMAGE_BYTES + 1) }), 'too_large'],
    ['an empty body', 'https://x.example/a.png', image({ body: null }), 'fetch_failed'],
  ])('fails for %s without uploading', async (_name, url, res, reason) => {
    const { storage, uploads } = fakeStorage();
    const r = await rehostImage(url, storage, { fetchImage: async () => res! });
    expect(r).toEqual({ ok: false, reason });
    expect(uploads).toHaveLength(0);
  });

  it('fails when the download throws (timeout, DNS, blocked redirect)', async () => {
    const { storage } = fakeStorage();
    expect(await rehostImage('https://x.example/a.png', storage, { fetchImage: async () => { throw new Error('timeout'); } }))
      .toEqual({ ok: false, reason: 'fetch_failed' });
    expect(await rehostImage('https://x.example/a.png', storage, { fetchImage: async () => { throw new Error('blocked-url'); } }))
      .toEqual({ ok: false, reason: 'blocked' });
  });

  it('fails when the upload fails, so the caller saves no image', async () => {
    const { storage } = fakeStorage({ message: 'denied' });
    expect(await rehostImage('https://x.example/a.png', storage, { fetchImage: async () => image() }))
      .toEqual({ ok: false, reason: 'upload_failed' });
  });
});
