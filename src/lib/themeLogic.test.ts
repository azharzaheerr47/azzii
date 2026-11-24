import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_USER_APPEARANCE,
  buildCustomBackgroundImageStyle,
  buildCustomBackgroundOverlayColor,
  normalizeAppearance,
  optimizeCloudinaryBackgroundUrl,
  resolveEffectiveTheme,
  resolveSurfacePolarity,
} from './themeLogic';

test('defaults to system mode and follows OS dark/light preference', () => {
  assert.equal(DEFAULT_USER_APPEARANCE.themeMode, 'system');
  assert.equal(DEFAULT_USER_APPEARANCE.romanticMode, false);
  assert.equal(resolveEffectiveTheme(DEFAULT_USER_APPEARANCE, true), 'dark');
  assert.equal(resolveEffectiveTheme(DEFAULT_USER_APPEARANCE, false), 'light');
  assert.equal(resolveSurfacePolarity(DEFAULT_USER_APPEARANCE, true), 'dark');
  assert.equal(resolveSurfacePolarity(DEFAULT_USER_APPEARANCE, false), 'light');
});

test('romanticMode acts as a non-destructive override preserving prior themeMode', () => {
  const customWithRomantic = normalizeAppearance({
    themeMode: 'custom',
    romanticMode: true,
    customBackground: {
      url: '/api/media/abc.jpg',
      publicId: 'local/abc.jpg',
      position: 'top',
      scale: 120,
      blur: 6,
      brightness: 90,
      overlayOpacity: 50,
      overlayMode: 'dark',
    },
  });

  assert.equal(resolveEffectiveTheme(customWithRomantic, true), 'romantic');
  assert.equal(resolveSurfacePolarity(customWithRomantic, true), 'light');
  assert.equal(customWithRomantic.themeMode, 'custom');
  assert.ok(customWithRomantic.customBackground);

  // Toggling romantic mode off restores underlying custom theme cleanly
  const restored = { ...customWithRomantic, romanticMode: false };
  assert.equal(resolveEffectiveTheme(restored, true), 'custom');
  assert.equal(resolveSurfacePolarity(restored, true), 'dark');
});

test('normalizeAppearance clamps out-of-range custom photo values and rejects custom without url', () => {
  const missingUrl = normalizeAppearance({
    themeMode: 'custom',
    romanticMode: false,
    customBackground: null,
  });
  assert.equal(missingUrl.themeMode, 'system');

  const clamped = normalizeAppearance({
    themeMode: 'custom',
    romanticMode: false,
    customBackground: {
      url: 'https://res.cloudinary.com/demo/image/upload/v123/sample.jpg',
      publicId: 'sample',
      position: 'right',
      scale: 300,
      blur: -10,
      brightness: 10,
      overlayOpacity: 99,
      overlayMode: 'light',
    },
  });

  assert.ok(clamped.customBackground);
  assert.equal(clamped.customBackground.scale, 150);
  assert.equal(clamped.customBackground.blur, 0);
  assert.equal(clamped.customBackground.brightness, 40);
  assert.equal(clamped.customBackground.overlayOpacity, 85);
  assert.equal(resolveSurfacePolarity(clamped, true), 'light');

  const style = buildCustomBackgroundImageStyle(clamped.customBackground);
  assert.equal(style.objectPosition, '85% 50%');
  assert.equal(style.transform, 'scale(1.50)');
  assert.equal(style.filter, 'blur(0px) brightness(40%)');
  assert.equal(
    buildCustomBackgroundOverlayColor(clamped.customBackground),
    'rgba(255, 250, 253, 0.85)',
  );
});

test('optimizeCloudinaryBackgroundUrl injects auto format/quality without modifying non-cloudinary URLs', () => {
  assert.equal(
    optimizeCloudinaryBackgroundUrl('https://res.cloudinary.com/demo/image/upload/v1/our-little-space/themes/bg.jpg'),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1920,c_limit/v1/our-little-space/themes/bg.jpg',
  );
  assert.equal(
    optimizeCloudinaryBackgroundUrl('/api/media/12345678-1234-1234-1234-123456789012.jpeg'),
    '/api/media/12345678-1234-1234-1234-123456789012.jpeg',
  );
});
