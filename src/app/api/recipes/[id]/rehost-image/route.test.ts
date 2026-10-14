import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { makeFakeSupabase } from '@/lib/testing/fakeSupabase';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/thumbhashServer', () => ({ computeThumbhashFromUrl: vi.fn(async () => 'HASH') }));
vi.mock('@/lib/rehostImage', () => ({ rehostImage: vi.fn() }));

let fake = makeFakeSupabase({});
vi.mock('@/lib/supabase', () => ({ getServiceSupabase: () => fake.client, getSupabase: () => fake.client }));

import { POST } from './route';
import { rehostImage } from '@/lib/rehostImage';

const SECRET = 'admin-secret-for-tests';
const ID = '9b6c0552-844b-47cb-9408-82e154d773cb';
const OURS = 'https://cjnwvxtomwyszcfuvgpw.supabase.co/storage/v1/object/public/recipe-images/recipe-rehost-1-a.jpg';
const ctx = { params: Promise.resolve({ id: ID }) };
const post = (headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost/api/recipes/${ID}/rehost-image`, { method: 'POST', headers });
const auth = { Authorization: `Bearer ${SECRET}` };

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = SECRET;
  vi.mocked(rehostImage).mockReset();
});
afterEach(() => {
  if (saved === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = saved;
});

const withRow = (image_url: string | null) => makeFakeSupabase({
  'recipes.select': () => ({ data: { id: ID, image_url }, error: null }),
  'recipes.update': () => ({ data: null, error: null }),
});

describe('POST /api/recipes/[id]/rehost-image', () => {
  it('401 without admin auth, touching nothing', async () => {
    fake = withRow('https://recipeoutline.com/p.jpg');
    expect((await POST(post(), ctx)).status).toBe(401);
    expect(fake.calls).toEqual([]);
    expect(rehostImage).not.toHaveBeenCalled();
  });

  it('copies the photo, saves OUR url and a fresh thumbhash', async () => {
    fake = withRow('https://recipeoutline.com/p.jpg');
    vi.mocked(rehostImage).mockResolvedValue({ ok: true, url: OURS, unchanged: false });
    const res = await POST(post(auth), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).recipe).toMatchObject({ id: ID, image_url: OURS, image_thumbhash: 'HASH' });
    const update = fake.calls.find(c => c.verb === 'update')!;
    expect(update.args[0]).toMatchObject({ image_url: OURS, image_thumbhash: 'HASH' });
    expect(update.filters).toContainEqual(['eq', ['id', ID]]);
  });

  it('writes nothing when the photo is already ours', async () => {
    fake = withRow(OURS);
    vi.mocked(rehostImage).mockResolvedValue({ ok: true, url: OURS, unchanged: true });
    const res = await POST(post(auth), ctx);
    expect((await res.json()).unchanged).toBe(true);
    expect(fake.calls.some(c => c.verb === 'update')).toBe(false);
  });

  it('keeps the old url and reports the reason when the copy fails', async () => {
    fake = withRow('https://recipeoutline.com/p.jpg');
    vi.mocked(rehostImage).mockResolvedValue({ ok: false, reason: 'not_image' });
    const res = await POST(post(auth), ctx);
    expect(res.status).toBe(422);
    expect((await res.json()).reason).toBe('not_image');
    expect(fake.calls.some(c => c.verb === 'update')).toBe(false);
  });

  it('404 for an unknown recipe and 422 for a recipe with no photo', async () => {
    fake = makeFakeSupabase({ 'recipes.select': () => ({ data: null, error: null }) });
    expect((await POST(post(auth), ctx)).status).toBe(404);
    fake = withRow(null);
    expect((await POST(post(auth), ctx)).status).toBe(422);
  });
});
