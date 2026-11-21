import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PALETTES,
  FONTS,
} from '../context/themeConfig.ts';
import type { PaletteId, FontId } from '../context/themeConfig.ts';

describe('Design Studio & Theme Factory Configuration', () => {
  it('contains exactly 10 curated palettes with valid light and dark colors', () => {
    assert.strictEqual(PALETTES.length, 10);

    const expectedIds: PaletteId[] = [
      'indigo',
      'emerald',
      'crimson',
      'cyan',
      'violet',
      'obsidian',
      'ocean',
      'sunset',
      'golden',
      'rose',
    ];

    expectedIds.forEach((id) => {
      const p = PALETTES.find((item) => item.id === id);
      assert.ok(p, `Palette ${id} should exist`);
      assert.ok(p.name && p.name.length > 0, `Palette ${id} has a name`);
      assert.match(p.primaryLight, /^#[0-9A-Fa-f]{6}$/, `Palette ${id} primaryLight is valid hex`);
      assert.match(p.primaryDark, /^#[0-9A-Fa-f]{6}$/, `Palette ${id} primaryDark is valid hex`);
      assert.match(p.accent, /^#[0-9A-Fa-f]{6}$/, `Palette ${id} accent is valid hex`);
      assert.ok(p.tagline.length > 0, `Palette ${id} has a concise tagline`);
    });
  });

  it('contains 7 curated typography options with valid font-family definitions', () => {
    assert.strictEqual(FONTS.length, 7);

    const expectedFontIds: FontId[] = [
      'inter',
      'jakarta',
      'outfit',
      'lexend',
      'poppins',
      'serif',
      'space',
    ];

    expectedFontIds.forEach((id) => {
      const f = FONTS.find((item) => item.id === id);
      assert.ok(f, `Font ${id} should exist`);
      assert.ok(f.name.length > 0, `Font ${id} has a name`);
      assert.ok(f.family.length > 0, `Font ${id} has a family`);
      assert.ok(f.category.length > 0, `Font ${id} has a category`);
      assert.ok(f.description.length > 0, `Font ${id} has a description`);
    });
  });

  it('ensures each palette maintains distinct primaryLight and primaryDark values for contrast', () => {
    PALETTES.forEach((p) => {
      assert.notStrictEqual(
        p.primaryLight.toLowerCase(),
        p.primaryDark.toLowerCase(),
        `Palette ${p.id} must have distinct light and dark shades`
      );
    });
  });

  it('provides complete lightTokens and darkTokens for all 10 palettes', () => {
    PALETTES.forEach((p) => {
      // Light mode tokens
      assert.ok(p.lightTokens, `Palette ${p.id} must define lightTokens`);
      assert.ok(p.lightTokens.primary700, `Palette ${p.id} lightTokens.primary700 is defined`);
      assert.ok(p.lightTokens.primary600, `Palette ${p.id} lightTokens.primary600 is defined`);
      assert.ok(p.lightTokens.primary500, `Palette ${p.id} lightTokens.primary500 is defined`);
      assert.ok(p.lightTokens.primary100, `Palette ${p.id} lightTokens.primary100 is defined`);
      assert.ok(p.lightTokens.primary050, `Palette ${p.id} lightTokens.primary050 is defined`);
      assert.ok(p.lightTokens.focusRing, `Palette ${p.id} lightTokens.focusRing is defined`);
      assert.ok(p.lightTokens.surfaceSelected, `Palette ${p.id} lightTokens.surfaceSelected is defined`);

      // Dark mode tokens
      assert.ok(p.darkTokens, `Palette ${p.id} must define darkTokens`);
      assert.ok(p.darkTokens.primary700, `Palette ${p.id} darkTokens.primary700 is defined`);
      assert.ok(p.darkTokens.primary600, `Palette ${p.id} darkTokens.primary600 is defined`);
      assert.ok(p.darkTokens.primary500, `Palette ${p.id} darkTokens.primary500 is defined`);
      assert.ok(p.darkTokens.primary100, `Palette ${p.id} darkTokens.primary100 is defined`);
      assert.ok(p.darkTokens.primary050, `Palette ${p.id} darkTokens.primary050 is defined`);
      assert.ok(p.darkTokens.focusRing, `Palette ${p.id} darkTokens.focusRing is defined`);
      assert.ok(p.darkTokens.surfaceSelected, `Palette ${p.id} darkTokens.surfaceSelected is defined`);

      // Dark mode primary700 must NOT be the dark light-mode primaryLight (which would be unreadable on dark backgrounds)
      assert.notStrictEqual(
        p.darkTokens.primary700.toLowerCase(),
        p.primaryLight.toLowerCase(),
        `Palette ${p.id} dark primary700 must provide high contrast on dark backgrounds`
      );

      // darkBadgeBg must be defined
      assert.ok(p.darkBadgeBg, `Palette ${p.id} must define darkBadgeBg`);
    });
  });
});
