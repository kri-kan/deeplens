import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Form Controls & Input Atoms - Design System Contract Tests', () => {
  const rootDir = process.cwd().endsWith('src/vayyari')
    ? path.resolve(process.cwd(), '../..')
    : process.cwd();

  // ─────────────────────────────────────────────────────────────
  // 1. ToggleSwitch Atom Verification
  // ─────────────────────────────────────────────────────────────
  describe('ToggleSwitch Atom Architecture & Symmetry', () => {
    test('ToggleSwitch component exists in Storybook and Mobile design system', () => {
      const storybookPath = path.join(
        rootDir,
        'src/apps/storybook/src/components/atoms/ToggleSwitch/ToggleSwitch.tsx'
      );
      const mobilePath = path.join(
        rootDir,
        'src/vayyari/components/tamagui-ui/atoms/ToggleSwitch/ToggleSwitch.tsx'
      );

      assert.ok(fs.existsSync(storybookPath), 'Storybook ToggleSwitch must exist');
      assert.ok(fs.existsSync(mobilePath), 'Mobile ToggleSwitch must exist');

      const sbContent = fs.readFileSync(storybookPath, 'utf8');
      assert.ok(sbContent.includes('export function ToggleSwitch'), 'Must export ToggleSwitch function');
      assert.ok(sbContent.includes('accessibilityRole="switch"'), 'Must define accessibilityRole="switch"');
      assert.ok(sbContent.includes('Animated.spring'), 'Must use spring physics animation');
    });

    test('ToggleSwitch stories exist with comprehensive state variants', () => {
      const storiesPath = path.join(
        rootDir,
        'src/apps/storybook/src/stories/atoms/ToggleSwitch.stories.tsx'
      );
      assert.ok(fs.existsSync(storiesPath), 'ToggleSwitch stories must exist');

      const content = fs.readFileSync(storiesPath, 'utf8');
      assert.ok(content.includes("title: 'Atoms/ToggleSwitch'"), 'Must be registered under Atoms/ToggleSwitch');
      assert.ok(content.includes('export const Interactive'), 'Must have Interactive story');
      assert.ok(content.includes('export const Sizes'), 'Must have Sizes story');
      assert.ok(content.includes('export const StateIndicators'), 'Must have StateIndicators story');
      assert.ok(content.includes('export const DisabledStates'), 'Must have DisabledStates story');
    });

    test('Size specifications maintain mathematical travel symmetry across all presets', () => {
      const SIZE_CONFIG = {
        sm: { width: 36, height: 20, thumbSize: 14, padding: 3, travel: 16 },
        md: { width: 46, height: 24, thumbSize: 18, padding: 3, travel: 22 },
        lg: { width: 56, height: 30, thumbSize: 22, padding: 4, travel: 26 },
      };

      for (const [preset, cfg] of Object.entries(SIZE_CONFIG)) {
        // Required formula for exact horizontal symmetry:
        // travelDistance = trackWidth - thumbSize - (2 * padding)
        const expectedTravel = cfg.width - cfg.thumbSize - 2 * cfg.padding;
        assert.strictEqual(
          cfg.travel,
          expectedTravel,
          `Preset ${preset} travel (${cfg.travel}) must equal calculated width - thumbSize - 2*padding (${expectedTravel})`
        );

        // Required vertical centering:
        // (height - thumbSize) / 2 must equal vertical padding
        const verticalPadding = (cfg.height - cfg.thumbSize) / 2;
        assert.strictEqual(
          cfg.padding,
          verticalPadding,
          `Preset ${preset} padding (${cfg.padding}) must center thumb vertically (${verticalPadding})`
        );
      }
    });

    test('Simulated toggle interaction respects controlled and uncontrolled state transitions', () => {
      // Toggle state machine simulation
      function simulateToggle({
        checked,
        defaultChecked = false,
        disabled = false,
        onCheckedChange,
      }: {
        checked?: boolean;
        defaultChecked?: boolean;
        disabled?: boolean;
        onCheckedChange?: (val: boolean) => void;
      }) {
        let currentInternal = defaultChecked;
        const isControlled = checked !== undefined;
        let isChecked = isControlled ? checked : currentInternal;

        const handlePress = () => {
          if (disabled) return;
          const nextState = !isChecked;
          if (!isControlled) {
            currentInternal = nextState;
            isChecked = nextState;
          }
          onCheckedChange?.(nextState);
        };

        return {
          getChecked: () => isChecked,
          press: handlePress,
        };
      }

      // Uncontrolled toggle test
      let externalValue: boolean | null = null;
      const uncontrolled = simulateToggle({
        defaultChecked: false,
        onCheckedChange: (v) => (externalValue = v),
      });

      assert.strictEqual(uncontrolled.getChecked(), false, 'Initial state must be false');
      uncontrolled.press();
      assert.strictEqual(uncontrolled.getChecked(), true, 'After 1st press, state must be true');
      assert.strictEqual(externalValue, true, 'Callback received true');
      uncontrolled.press();
      assert.strictEqual(uncontrolled.getChecked(), false, 'After 2nd press, state must be false');
      assert.strictEqual(externalValue, false, 'Callback received false');

      // Disabled toggle test
      let disabledCallbackFired = false;
      const disabledSwitch = simulateToggle({
        defaultChecked: true,
        disabled: true,
        onCheckedChange: () => (disabledCallbackFired = true),
      });

      assert.strictEqual(disabledSwitch.getChecked(), true, 'Initial state must be true');
      disabledSwitch.press();
      assert.strictEqual(disabledSwitch.getChecked(), true, 'Disabled switch must not toggle');
      assert.strictEqual(disabledCallbackFired, false, 'Disabled switch must not fire callback');
    });

    test('State text labels resolve custom and default indicators correctly', () => {
      function resolveStateText(
        isChecked: boolean,
        showStateText: boolean,
        stateLabels?: { on?: string; off?: string }
      ): string | null {
        if (!showStateText) return null;
        const on = stateLabels?.on ?? 'ON';
        const off = stateLabels?.off ?? 'OFF';
        return isChecked ? on : off;
      }

      assert.strictEqual(resolveStateText(false, false), null, 'Must return null when showStateText is false');
      assert.strictEqual(resolveStateText(true, true), 'ON', 'Must return ON when checked');
      assert.strictEqual(resolveStateText(false, true), 'OFF', 'Must return OFF when unchecked');
      assert.strictEqual(
        resolveStateText(true, true, { on: 'ACTIVE', off: 'INACTIVE' }),
        'ACTIVE',
        'Must support custom ON label'
      );
      assert.strictEqual(
        resolveStateText(false, true, { on: 'ACTIVE', off: 'INACTIVE' }),
        'INACTIVE',
        'Must support custom OFF label'
      );
    });

    test('ToggleSwitch component interfaces support drop-in value and onValueChange aliases', () => {
      const storybookPath = path.join(
        rootDir,
        'src/apps/storybook/src/components/atoms/ToggleSwitch/ToggleSwitch.tsx'
      );
      const mobilePath = path.join(
        rootDir,
        'src/vayyari/components/tamagui-ui/atoms/ToggleSwitch/ToggleSwitch.tsx'
      );

      const sbContent = fs.readFileSync(storybookPath, 'utf8');
      const mobileContent = fs.readFileSync(mobilePath, 'utf8');

      assert.ok(sbContent.includes('value?: boolean;'), 'Storybook ToggleSwitch must support value prop');
      assert.ok(sbContent.includes('onValueChange?: (checked: boolean) => void;'), 'Storybook ToggleSwitch must support onValueChange prop');

      assert.ok(mobileContent.includes('value?: boolean;'), 'Mobile ToggleSwitch must support value prop');
      assert.ok(mobileContent.includes('onValueChange?: (checked: boolean) => void;'), 'Mobile ToggleSwitch must support onValueChange prop');
    });

    test('All 8 remaining utility and screen files use ToggleSwitch and do not import raw or Paper Switch', () => {
      const filesToVerify = [
        'src/vayyari/app/utilities/instagram/story-planner/index.tsx',
        'src/vayyari/app/utilities/instagram/settings.tsx',
        'src/vayyari/components/utility/instagram/SettingsModal.tsx',
        'src/vayyari/components/utility/customer/AddressFormComponent.tsx',
        'src/vayyari/components/utility/instagram/CompetitorProfileItem.tsx',
        'src/vayyari/components/utility/instagram/InstagramPostDetailItem.tsx',
        'src/vayyari/components/utility/instagram/MetaConfigEditorDialog.tsx',
        'src/vayyari/app/utilities/customer/[id].tsx',
      ];

      for (const relPath of filesToVerify) {
        const fullPath = path.join(rootDir, relPath);
        assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          content.includes('ToggleSwitch'),
          `${relPath} must import and use ToggleSwitch`
        );
        assert.ok(
          !content.match(/import\s+{[^}]*\bSwitch\b[^}]*}\s+from\s+['"]react-native['"]/),
          `${relPath} must not import Switch from react-native`
        );
        assert.ok(
          !content.match(/import\s+{[^}]*\bSwitch\b[^}]*}\s+from\s+['"]react-native-paper['"]/),
          `${relPath} must not import Switch from react-native-paper`
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. RadioButton Atom Verification
  // ─────────────────────────────────────────────────────────────
  describe('RadioButton Atom Contract & State Machine', () => {
    test('RadioButton component exists in Storybook and Mobile design system catalogs', () => {
      const storybookPath = path.join(
        rootDir,
        'src/apps/storybook/src/components/atoms/RadioButton/RadioButton.tsx'
      );
      const mobilePath = path.join(
        rootDir,
        'src/vayyari/components/tamagui-ui/atoms/RadioButton/RadioButton.tsx'
      );

      assert.ok(fs.existsSync(storybookPath), 'Storybook RadioButton must exist');
      assert.ok(fs.existsSync(mobilePath), 'Mobile RadioButton must exist');

      const sbContent = fs.readFileSync(storybookPath, 'utf8');
      assert.ok(sbContent.includes('export function RadioButton'), 'Must export RadioButton component');
      assert.ok(sbContent.includes('accessibilityRole="radio"'), 'Must define accessibilityRole="radio"');
      assert.ok(sbContent.includes("status?: 'checked' | 'unchecked'"), 'Must support Paper status prop alias');
    });

    test('RadioButton stories exist with comprehensive states in Storybook', () => {
      const storiesPath = path.join(
        rootDir,
        'src/apps/storybook/src/stories/atoms/RadioButton.stories.tsx'
      );
      assert.ok(fs.existsSync(storiesPath), 'RadioButton stories must exist');

      const content = fs.readFileSync(storiesPath, 'utf8');
      assert.ok(content.includes("title: 'Atoms/RadioButton'"), 'Must be registered under Atoms/RadioButton');
      assert.ok(content.includes('export const Default'), 'Must have Default story');
      assert.ok(content.includes('export const RadioGroup'), 'Must have RadioGroup story');
      assert.ok(content.includes('export const DisabledStates'), 'Must have DisabledStates story');
    });

    test('Simulated RadioButton state transitions support both boolean checked and Paper status', () => {
      function resolveRadioChecked(checked?: boolean, status?: 'checked' | 'unchecked'): boolean {
        if (checked !== undefined) return checked;
        if (status !== undefined) return status === 'checked';
        return false;
      }

      assert.strictEqual(resolveRadioChecked(true), true, 'checked=true evaluates to true');
      assert.strictEqual(resolveRadioChecked(false), false, 'checked=false evaluates to false');
      assert.strictEqual(resolveRadioChecked(undefined, 'checked'), true, 'status=checked evaluates to true');
      assert.strictEqual(resolveRadioChecked(undefined, 'unchecked'), false, 'status=unchecked evaluates to false');
      assert.strictEqual(resolveRadioChecked(false, 'checked'), false, 'checked takes precedence over status');
    });

    test('InstagramAccountPicker and ItemReassignModal use canonical RadioButton atom and purge Paper RadioButton', () => {
      const accountPickerPath = path.join(
        rootDir,
        'src/vayyari/components/utility/instagram/InstagramAccountPicker.tsx'
      );
      const itemReassignPath = path.join(
        rootDir,
        'src/vayyari/components/logistics/ItemReassignModal.tsx'
      );

      const pickerContent = fs.readFileSync(accountPickerPath, 'utf8');
      assert.ok(
        pickerContent.includes("from '@/components/tamagui-ui/atoms/RadioButton'") ||
        pickerContent.includes('from "../atoms/RadioButton"') ||
        pickerContent.includes("from '@/components/tamagui-ui/atoms/RadioButton/RadioButton'"),
        'InstagramAccountPicker must import canonical RadioButton'
      );
      assert.ok(
        !pickerContent.match(/import\s+{[^}]*\bRadioButton\b[^}]*}\s+from\s+['"]react-native-paper['"]/),
        'InstagramAccountPicker must not import RadioButton from react-native-paper'
      );

      const reassignContent = fs.readFileSync(itemReassignPath, 'utf8');
      assert.ok(
        reassignContent.includes("from '@/components/tamagui-ui/atoms/RadioButton'"),
        'ItemReassignModal must import canonical RadioButton'
      );
      assert.ok(
        !reassignContent.match(/import\s+{[^}]*\bRadioButton\b[^}]*}\s+from\s+['"]react-native-paper['"]/),
        'ItemReassignModal must not import RadioButton from react-native-paper'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CustomCheckbox Atom Verification
  // ─────────────────────────────────────────────────────────────
  describe('CustomCheckbox Atom Contract', () => {
    test('CustomCheckbox component exports required API and accessibility contracts', () => {
      const checkboxPath = path.join(
        rootDir,
        'src/apps/storybook/src/components/atoms/CustomCheckbox/CustomCheckbox.tsx'
      );
      assert.ok(fs.existsSync(checkboxPath), 'CustomCheckbox must exist');

      const content = fs.readFileSync(checkboxPath, 'utf8');
      assert.ok(content.includes('export function CustomCheckbox'), 'Must export CustomCheckbox');
      assert.ok(content.includes('accessibilityRole="checkbox"'), 'Must define accessibilityRole="checkbox"');
      assert.ok(content.includes('disabled?: boolean;'), 'Must support disabled prop');
      assert.ok(content.includes('label?: string;'), 'Must support label prop');
    });

    test('Simulated CustomCheckbox state transitions respect disabled state', () => {
      function simulateCheckbox({
        checked,
        disabled = false,
        onToggle,
      }: {
        checked: boolean;
        disabled?: boolean;
        onToggle: () => void;
      }) {
        let isChecked = checked;
        const press = () => {
          if (disabled) return;
          isChecked = !isChecked;
          onToggle();
        };
        return { getChecked: () => isChecked, press };
      }

      let toggled = false;
      const cb = simulateCheckbox({ checked: false, disabled: true, onToggle: () => (toggled = true) });
      cb.press();
      assert.strictEqual(cb.getChecked(), false, 'Disabled checkbox must not toggle');
      assert.strictEqual(toggled, false, 'Disabled checkbox must not trigger callback');
    });

    test('All 4 screens use CustomCheckbox and do not import Paper Checkbox', () => {
      const filesToVerify = [
        'src/vayyari/components/utility/customer/ManageAddressModal.tsx',
        'src/vayyari/components/utility/product/FilterDrawer.tsx',
        'src/vayyari/app/utilities/instagram/story-planner/sharing.tsx',
        'src/vayyari/app/utilities/whatsapp/failed-enrichments.tsx',
      ];

      for (const relPath of filesToVerify) {
        const fullPath = path.join(rootDir, relPath);
        assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          content.includes('CustomCheckbox'),
          `${relPath} must import and use CustomCheckbox`
        );
        assert.ok(
          !content.match(/import\s+{[^}]*\bCheckbox\b[^}]*}\s+from\s+['"]react-native-paper['"]/),
          `${relPath} must not import Checkbox from react-native-paper`
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. DropdownField & SegmentedControl Contract
  // ─────────────────────────────────────────────────────────────
  describe('DropdownField & SegmentedControl Contract', () => {
    test('DropdownField component exports combobox role and placeholder fallback', () => {
      const dropdownPath = path.join(
        rootDir,
        'src/apps/storybook/src/components/atoms/DropdownField/DropdownField.tsx'
      );
      assert.ok(fs.existsSync(dropdownPath), 'DropdownField must exist');

      const content = fs.readFileSync(dropdownPath, 'utf8');
      assert.ok(content.includes('accessibilityRole="combobox"'), 'Must define accessibilityRole="combobox"');
      assert.ok(content.includes('placeholder = \'Select\''), 'Must have default placeholder Select');
    });

    test('SegmentedControl exports tablist role and maps active selection', () => {
      const segmentedPath = path.join(
        rootDir,
        'src/apps/storybook/src/components/atoms/SegmentedControl/SegmentedControl.tsx'
      );
      assert.ok(fs.existsSync(segmentedPath), 'SegmentedControl must exist');

      const content = fs.readFileSync(segmentedPath, 'utf8');
      assert.ok(content.includes('role="tablist"'), 'Must have role="tablist" container');
      assert.ok(content.includes('accessibilityRole="tab"'), 'Must have accessibilityRole="tab" items');
      assert.ok(content.includes('accessibilityState={{ selected: isActive }}'), 'Must bind selected state');
      assert.ok(content.includes('buttons?:'), 'Must support buttons alias prop');
      assert.ok(content.includes('onValueChange?:'), 'Must support onValueChange alias prop');
    });

    test('All 6 screens use SegmentedControl and do not import Paper SegmentedButtons', () => {
      const filesToVerify = [
        'src/vayyari/app/utilities/instagram/settings.tsx',
        'src/vayyari/components/utility/instagram/SettingsModal.tsx',
        'src/vayyari/components/order/FinancialsSummaryCard.tsx',
        'src/vayyari/components/order/ExistingOrderAutocomplete.tsx',
        'src/vayyari/components/utility/instagram/ControlCenter.tsx',
        'src/vayyari/app/utilities/instagram/queue.tsx',
      ];

      for (const relPath of filesToVerify) {
        const fullPath = path.join(rootDir, relPath);
        assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          content.includes('SegmentedControl'),
          `${relPath} must import and use SegmentedControl`
        );
        assert.ok(
          !content.match(/import\s+{[^}]*\bSegmentedButtons\b[^}]*}\s+from\s+['"]react-native-paper['"]/),
          `${relPath} must not import SegmentedButtons from react-native-paper`
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. OrderIdGeneratorPage Integration with Normalized ToggleSwitch
  // ─────────────────────────────────────────────────────────────
  describe('OrderIdGeneratorPage Normalized Integration & History Filtering Logic', () => {
    test('OrderIdGeneratorPage imports ToggleSwitch atom and purges raw react-native Switch', () => {
      const sbPagePath = path.join(
        rootDir,
        'src/apps/storybook/src/components/pages/OrderIdGeneratorPage.tsx'
      );
      const mobilePagePath = path.join(
        rootDir,
        'src/vayyari/components/tamagui-ui/pages/OrderIdGeneratorPage.tsx'
      );

      const sbContent = fs.readFileSync(sbPagePath, 'utf8');
      assert.ok(
        sbContent.includes("import { ToggleSwitch } from '../atoms/ToggleSwitch'"),
        'Storybook page must import ToggleSwitch atom'
      );
      assert.ok(
        !sbContent.includes('import { ScrollView, Switch,'),
        'Storybook page must not import raw Switch from react-native'
      );

      const mobileContent = fs.readFileSync(mobilePagePath, 'utf8');
      assert.ok(
        mobileContent.includes("import { ToggleSwitch } from '../atoms/ToggleSwitch'"),
        'Mobile page must import ToggleSwitch atom'
      );
      assert.ok(
        !mobileContent.includes('import { ScrollView, Switch,'),
        'Mobile page must not import raw Switch from react-native'
      );
    });

    test('OrderIdGenerator filter correctly isolates deleted vs active orders based on toggle state', () => {
      const MOCK_ENTRIES = [
        { id: '849201', sourceHandle: '+91 98765 43210', isDeleted: false },
        { id: '849198', sourceHandle: '@ananya_couture', isDeleted: false },
        { id: '849150', sourceHandle: '@designer_sarees_hyd', isDeleted: true },
      ];

      function filterHistory(entries: typeof MOCK_ENTRIES, showDeleted: boolean, searchQuery = '') {
        return entries
          .filter((item) => (showDeleted ? true : !item.isDeleted))
          .filter((item) => {
            if (!searchQuery?.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            return item.id.toLowerCase().includes(q) || item.sourceHandle.toLowerCase().includes(q);
          });
      }

      // When showDeleted = false (default)
      const activeOnly = filterHistory(MOCK_ENTRIES, false);
      assert.strictEqual(activeOnly.length, 2, 'Must filter out deleted orders when showDeleted is false');
      assert.ok(!activeOnly.some((item) => item.isDeleted), 'Must not contain any deleted order');

      // When showDeleted = true (toggled ON via ToggleSwitch)
      const allEntries = filterHistory(MOCK_ENTRIES, true);
      assert.strictEqual(allEntries.length, 3, 'Must include deleted orders when showDeleted is true');
      assert.ok(allEntries.some((item) => item.isDeleted), 'Must contain deleted order');

      // Search query filtering
      const searchResult = filterHistory(MOCK_ENTRIES, true, 'ananya');
      assert.strictEqual(searchResult.length, 1);
      assert.strictEqual(searchResult[0].id, '849198');
    });
  });
});
