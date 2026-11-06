import test, { describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  PromptDialogIntent,
  getPromptDialogIntentColors,
} from '../utils/feedbackRules';

describe('PromptDialog Atom Logic & Contract', () => {
  const rootDir = process.cwd().endsWith('src/vayyari')
    ? path.resolve(process.cwd(), '../..')
    : process.cwd();

  test('resolves correct intent styling and token configuration for all 5 intents', () => {
    const intents: PromptDialogIntent[] = ['success', 'failure', 'warning', 'info', 'critical'];

    intents.forEach((intent) => {
      const lightColors = getPromptDialogIntentColors(intent, false);
      const darkColors = getPromptDialogIntentColors(intent, true);

      assert.ok(lightColors.base, `Missing base color for ${intent}`);
      assert.ok(lightColors.subtle, `Missing subtle color for ${intent}`);
      assert.ok(lightColors.border, `Missing border color for ${intent}`);
      assert.ok(lightColors.text, `Missing text color for ${intent}`);

      assert.ok(darkColors.base, `Missing dark base color for ${intent}`);
      assert.ok(darkColors.subtle, `Missing dark subtle color for ${intent}`);
      assert.ok(darkColors.border, `Missing dark border color for ${intent}`);
      assert.ok(darkColors.text, `Missing dark text color for ${intent}`);
    });

    const success = getPromptDialogIntentColors('success', false);
    assert.strictEqual(success.base, '#10B981');
    assert.strictEqual(success.text, '#059669');

    const failure = getPromptDialogIntentColors('failure', false);
    assert.strictEqual(failure.base, '#EF4444');

    const critical = getPromptDialogIntentColors('critical', false);
    assert.strictEqual(critical.base, '#EF4444');

    const warning = getPromptDialogIntentColors('warning', false);
    assert.strictEqual(warning.base, '#F59E0B');

    const info = getPromptDialogIntentColors('info', false);
    assert.strictEqual(info.base, '#3B82F6');
  });

  test('PromptDialog component files exist and meet design system symmetry in Storybook and Vayyari', () => {
    const sbPath = path.join(
      rootDir,
      'src/apps/storybook/src/components/atoms/PromptDialog/PromptDialog.tsx'
    );
    const vayyariPath = path.join(
      rootDir,
      'src/vayyari/components/tamagui-ui/atoms/PromptDialog/PromptDialog.tsx'
    );

    assert.ok(fs.existsSync(sbPath), 'Storybook PromptDialog must exist');
    assert.ok(fs.existsSync(vayyariPath), 'Vayyari PromptDialog must exist');

    const sbContent = fs.readFileSync(sbPath, 'utf8');
    const vayyariContent = fs.readFileSync(vayyariPath, 'utf8');

    // Verification of contract
    assert.ok(sbContent.includes('export function PromptDialog'), 'Must export PromptDialog in Storybook');
    assert.ok(vayyariContent.includes('export function PromptDialog'), 'Must export PromptDialog in Vayyari');
    assert.ok(vayyariContent.includes('Modal'), 'Must use Modal wrapper');
    assert.ok(vayyariContent.includes('role="alert"'), 'Must have role="alert" or alertdialog for accessibility');
    assert.ok(vayyariContent.includes('singleButton'), 'Must support singleButton mode');
    assert.ok(vayyariContent.includes('dismissOnBackdropPress'), 'Must support dismissOnBackdropPress');
    assert.ok(vayyariContent.includes('isLoading'), 'Must support isLoading state');
  });
});
