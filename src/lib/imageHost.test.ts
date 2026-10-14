import { describe, it, expect } from 'vitest';
import { isOwnStorageUrl, isExternalImageUrl, canOptimizeImage } from '@/lib/imageHost';

const OURS = 'https://cjnwvxtomwyszcfuvgpw.supabase.co/storage/v1/object/public/recipe-images/a.jpg';

describe('isOwnStorageUrl', () => {
  it('accepts a public object in our storage', () => {
    expect(isOwnStorageUrl(OURS)).toBe(true);
  });
  it('rejects other hosts, other paths, look-alikes, http and junk', () => {
    expect(isOwnStorageUrl('https://recipeoutline.com/wp-content/pizza.jpg')).toBe(false);
    expect(isOwnStorageUrl('https://cjnwvxtomwyszcfuvgpw.supabase.co/rest/v1/recipes')).toBe(false);
    expect(isOwnStorageUrl('https://cjnwvxtomwyszcfuvgpw.supabase.co.evil.com/storage/v1/object/public/x.jpg')).toBe(false);
    expect(isOwnStorageUrl('http://cjnwvxtomwyszcfuvgpw.supabase.co/storage/v1/object/public/x.jpg')).toBe(false);
    expect(isOwnStorageUrl('not a url')).toBe(false);
    expect(isOwnStorageUrl('')).toBe(false);
    expect(isOwnStorageUrl(null)).toBe(false);
    expect(isOwnStorageUrl(undefined)).toBe(false);
  });
});

describe('isExternalImageUrl', () => {
  it('flags hotlinks only', () => {
    expect(isExternalImageUrl('https://recipeoutline.com/pizza.jpg')).toBe(true);
    expect(isExternalImageUrl(OURS)).toBe(false);
    expect(isExternalImageUrl('/local.png')).toBe(false);
    expect(isExternalImageUrl('')).toBe(false);
    expect(isExternalImageUrl('  ')).toBe(false);
    expect(isExternalImageUrl(null)).toBe(false);
  });
});

describe('canOptimizeImage', () => {
  it('optimizes our storage and same-site paths', () => {
    expect(canOptimizeImage(OURS)).toBe(true);
    expect(canOptimizeImage('/icon.png')).toBe(true);
  });
  it('does not optimize unknown hosts (rendered unoptimized instead of crashing)', () => {
    expect(canOptimizeImage('https://recipeoutline.com/pizza.jpg')).toBe(false);
    expect(canOptimizeImage('https://www.allrecipes.com/x.jpg')).toBe(false);
    expect(canOptimizeImage('//evil.example/x.jpg')).toBe(false);
    expect(canOptimizeImage('')).toBe(false);
    expect(canOptimizeImage(undefined)).toBe(false);
  });
});
