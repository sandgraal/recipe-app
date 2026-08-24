import { describe, it, expect } from 'vitest';
import { convertMeasurement, convertedIngredient, convertTemperatureInText } from '@/lib/convert';

describe('convertMeasurement', () => {
  it('converts imperial volume to metric', () => {
    expect(convertMeasurement(1, 'cup', 'metric')).toEqual({ amount: '237', unit: 'ml' });
    expect(convertMeasurement(1, 'tbsp', 'metric')).toEqual({ amount: '15', unit: 'ml' });
    expect(convertMeasurement(5, 'cups', 'metric')).toEqual({ amount: '1.18', unit: 'l' });
  });

  it('converts imperial weight to metric', () => {
    expect(convertMeasurement(1, 'oz', 'metric')).toEqual({ amount: '28', unit: 'g' });
    expect(convertMeasurement(1, 'lb', 'metric')).toEqual({ amount: '454', unit: 'g' });
    expect(convertMeasurement(3, 'lb', 'metric')).toEqual({ amount: '1.36', unit: 'kg' });
  });

  it('converts metric to imperial (choosing a readable unit)', () => {
    expect(convertMeasurement(240, 'ml', 'imperial')).toEqual({ amount: '1', unit: 'cup' });
    expect(convertMeasurement(15, 'ml', 'imperial')).toEqual({ amount: '1', unit: 'tbsp' });
    expect(convertMeasurement(500, 'g', 'imperial')?.unit).toBe('lb');
    expect(convertMeasurement(30, 'g', 'imperial')).toEqual({ amount: '1', unit: 'oz' });
  });

  it('leaves values already in the target system, and non-convertible units', () => {
    expect(convertMeasurement(1, 'cup', 'imperial')).toBeNull();
    expect(convertMeasurement(100, 'ml', 'metric')).toBeNull();
    expect(convertMeasurement(2, 'clove', 'metric')).toBeNull();
    expect(convertMeasurement(2, 'pinch', 'imperial')).toBeNull();
  });
});

describe('convertedIngredient', () => {
  it('scales then converts', () => {
    expect(convertedIngredient('2', 'cups', 2, 'metric')).toEqual({ amount: '946', unit: 'ml' });
  });
  it('skips ranges and qualified amounts', () => {
    expect(convertedIngredient('1-2', 'cups', 1, 'metric')).toBeNull();
    expect(convertedIngredient('2 large', 'cups', 1, 'metric')).toBeNull();
  });
});

describe('convertTemperatureInText', () => {
  it('converts °F → °C for metric', () => {
    expect(convertTemperatureInText('Bake at 350°F for 20 min.', 'metric')).toBe('Bake at 177°C for 20 min.');
    expect(convertTemperatureInText('Preheat to 400 F.', 'metric')).toBe('Preheat to 204°C.');
  });
  it('converts °C → °F for imperial', () => {
    expect(convertTemperatureInText('Bake at 180°C.', 'imperial')).toBe('Bake at 356°F.');
  });
});
