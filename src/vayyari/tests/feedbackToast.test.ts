import test, { describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  FeedbackToastIntent,
  getFeedbackToastIntentConfig,
  DEFAULT_TOAST_DURATION_MS,
} from '../utils/feedbackRules';

describe('FeedbackToast Atom Logic & Contract', () => {
  const rootDir = process.cwd().endsWith('src/vayyari')
    ? path.resolve(process.cwd(), '../..')
    : process.cwd();

  test('DEFAULT_TOAST_DURATION_MS is set to standard 2800ms', () => {
    assert.strictEqual(DEFAULT_TOAST_DURATION_MS, 2800);
  });

  test('resolves correct intent styling and token configuration for all 4 intents', () => {
    const intents: FeedbackToastIntent[] = ['success', 'failure', 'warning', 'info'];

    intents.forEach((intent) => {
      const config = getFeedbackToastIntentConfig(intent);
      assert.ok(config, `Missing config for ${intent}`);
      assert.ok(config.iconColor, `Missing iconColor for ${intent}`);
      assert.ok(config.badgeBg, `Missing badgeBg for ${intent}`);
      assert.ok(config.borderColor, `Missing borderColor for ${intent}`);
    });

    const success = getFeedbackToastIntentConfig('success');
    assert.strictEqual(success.iconColor, '#10B981');

    const failure = getFeedbackToastIntentConfig('failure');
    assert.strictEqual(failure.iconColor, '#EF4444');

    const warning = getFeedbackToastIntentConfig('warning');
    assert.strictEqual(warning.iconColor, '#F59E0B');

    const info = getFeedbackToastIntentConfig('info');
    assert.strictEqual(info.iconColor, '#3B82F6');
  });

  test('falls back gracefully to info intent for unknown or undefined intent', () => {
    const fallback = getFeedbackToastIntentConfig(undefined as any);
    assert.strictEqual(fallback.iconColor, '#3B82F6');
  });

  test('FeedbackToast component files exist and meet design system symmetry in Storybook and Vayyari', () => {
    const sbPath = path.join(
      rootDir,
      'src/apps/storybook/src/components/atoms/FeedbackToast/FeedbackToast.tsx'
    );
    const vayyariPath = path.join(
      rootDir,
      'src/vayyari/components/tamagui-ui/atoms/FeedbackToast/FeedbackToast.tsx'
    );

    assert.ok(fs.existsSync(sbPath), 'Storybook FeedbackToast must exist');
    assert.ok(fs.existsSync(vayyariPath), 'Vayyari FeedbackToast must exist');

    const sbContent = fs.readFileSync(sbPath, 'utf8');
    const vayyariContent = fs.readFileSync(vayyariPath, 'utf8');

    // Verification of contract
    assert.ok(sbContent.includes('export function FeedbackToast'), 'Must export FeedbackToast in Storybook');
    assert.ok(vayyariContent.includes('export function FeedbackToast'), 'Must export FeedbackToast in Vayyari');
    assert.ok(vayyariContent.includes('role="status"'), 'Must have role="status" for accessibility');
    assert.ok(vayyariContent.includes('aria-live="polite"'), 'Must have aria-live="polite"');
    assert.ok(vayyariContent.includes('setTimeout'), 'Must have auto-dismiss timer via setTimeout');
    assert.ok(vayyariContent.includes('clearTimeout'), 'Must clean up timer via clearTimeout');
    assert.ok(vayyariContent.includes('LuX'), 'Must have dismiss button with LuX icon');
  });
});
