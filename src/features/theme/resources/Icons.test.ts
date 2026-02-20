import { describe, it, expect } from 'vitest';
import { SVG_ICONS } from './Icons';

describe('SVG_ICONS', () => {
  it('should contain all required colored number icons from 0 to 9 (Blue and Red)', () => {
    const colors = ['blue', 'red'];

    colors.forEach((color) => {
      for (let i = 0; i <= 9; i++) {
        const iconKey = `num_${i}_${color}`;
        expect(SVG_ICONS).toHaveProperty(iconKey);
        expect(SVG_ICONS[iconKey]).toHaveProperty('path');
        expect(SVG_ICONS[iconKey]).toHaveProperty('color');
        expect(SVG_ICONS[iconKey]).toHaveProperty('viewBox');
      }
    });
  });
});
