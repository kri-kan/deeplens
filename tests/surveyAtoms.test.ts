import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Mudra Coin Integration & Assets Verification', () => {
  const rootDir = process.cwd();

  test('Mudra coin SVG asset exists across all required app directories', () => {
    const assetPaths = [
      'src/apps/storybook/assets/mudra-icon.svg',
      'src/store/assets/mudra-icon.svg',
      'src/experimental/storePrelaunch/public/assets/mudra-icon.svg',
      'src/vayyari/assets/images/mudra-icon.svg',
    ];

    for (const p of assetPaths) {
      const fullPath = path.join(rootDir, p);
      assert.ok(fs.existsSync(fullPath), `Asset must exist at ${p}`);
      const stats = fs.statSync(fullPath);
      assert.ok(stats.size > 1000, `Asset at ${p} must have non-trivial SVG content`);
    }
  });

  test('MudraCoin atom component is created in Storybook with correct SVG definitions', () => {
    const compPath = path.join(rootDir, 'src/apps/storybook/src/components/atoms/MudraCoin/MudraCoin.tsx');
    assert.ok(fs.existsSync(compPath), 'MudraCoin component must exist');

    const content = fs.readFileSync(compPath, 'utf8');
    assert.ok(content.includes('export const MudraCoin'), 'Must export MudraCoin');
    assert.ok(content.includes('export const MudraCoinIcon'), 'Must export MudraCoinIcon alias');
    assert.ok(content.includes('conic-gradient'), 'Must preserve radiant gold sheen');
    assert.ok(content.includes('viewBox="0 0 150 150"'), 'Must match Figma 150x150 viewBox');
  });

  test('SurveyMudrasBadge uses MudraCoin instead of generic LuCoins', () => {
    const badgePath = path.join(
      rootDir,
      'src/apps/storybook/src/components/atoms/SurveyMudrasBadge/SurveyMudrasBadge.tsx'
    );
    const content = fs.readFileSync(badgePath, 'utf8');
    assert.ok(content.includes("import { MudraCoin } from '../MudraCoin'"), 'Must import MudraCoin');
    assert.ok(!content.includes('LuCoins'), 'Must no longer use generic LuCoins');
  });

  test('SurveyCoverPage uses MudraCoin in reward chip', () => {
    const coverPath = path.join(
      rootDir,
      'src/apps/storybook/src/components/molecules/SurveyCoverPage/SurveyCoverPage.tsx'
    );
    const content = fs.readFileSync(coverPath, 'utf8');
    assert.ok(content.includes("import { MudraCoin } from '../../atoms/MudraCoin'"), 'Must import MudraCoin');
    assert.ok(!content.includes('LuCoins'), 'Must no longer use generic LuCoins');
  });

  test('Admin Survey Builder and Responses pages use MudraCoin for rewards', () => {
    const builderPath = path.join(
      rootDir,
      'src/apps/storybook/src/components/pages/survey-admin/AdminSurveyBuilderPage.tsx'
    );
    const builderContent = fs.readFileSync(builderPath, 'utf8');
    assert.ok(builderContent.includes('MudraCoin'), 'AdminSurveyBuilderPage must use MudraCoin');

    const responsesPath = path.join(
      rootDir,
      'src/apps/storybook/src/components/pages/survey-admin/AdminSurveyResponsesPage.tsx'
    );
    const responsesContent = fs.readFileSync(responsesPath, 'utf8');
    assert.ok(responsesContent.includes('MudraCoin'), 'AdminSurveyResponsesPage must use MudraCoin');
  });

  test('Store Prelaunch web app has MudraCoinIcon and serves SVG asset', () => {
    const iconsPath = path.join(
      rootDir,
      'src/experimental/storePrelaunch/src/components/Icons.tsx'
    );
    const content = fs.readFileSync(iconsPath, 'utf8');
    assert.ok(content.includes('export const MudraCoinIcon'), 'Store prelaunch must export MudraCoinIcon');
    assert.ok(content.includes('/assets/mudra-icon.svg'), 'Must reference served SVG asset');
  });

  test('Store App has atomic symlinks to MudraCoin', () => {
    const storeLinkPath = path.join(rootDir, 'src/store/src/components/atoms/MudraCoin');
    assert.ok(fs.existsSync(storeLinkPath), 'Store app must have MudraCoin atom available');
  });

  test('MudraCoin stories hierarchy is flattened to Atoms/Mudra Coin and purges legacy comparison', () => {
    const storyPath = path.join(rootDir, 'src/apps/storybook/src/stories/atoms/MudraCoin.stories.tsx');
    assert.ok(fs.existsSync(storyPath), 'MudraCoin stories must exist');
    const content = fs.readFileSync(storyPath, 'utf8');
    assert.ok(content.includes("title: 'Atoms/Mudra Coin'"), 'Storybook title must be Atoms/Mudra Coin');
    assert.ok(!content.includes('LegacyVsNewComparison'), 'Must not contain LegacyVsNewComparison');
    assert.ok(!content.includes('LuCoins'), 'Must not import or reference LuCoins');
    assert.ok(content.includes('CompactBadges'), 'Must include CompactBadges story');
  });

  test('SurveyMudrasBadge supports compact count-only variant and optical lineHeight alignment', () => {
    const badgePath = path.join(
      rootDir,
      'src/apps/storybook/src/components/atoms/SurveyMudrasBadge/SurveyMudrasBadge.tsx'
    );
    const content = fs.readFileSync(badgePath, 'utf8');
    assert.ok(content.includes("variant?: 'vault' | 'chip' | 'compact'"), 'Must support compact variant');
    assert.ok(content.includes('showLabel?: boolean'), 'Must support showLabel prop');
    assert.ok(content.includes('lineHeight={lineHeight}'), 'Must specify explicit lineHeight for alignment');
  });

  test('VayyariLogo atom component exists with multi-variant support and vector emblem', () => {
    const logoCompPath = path.join(
      rootDir,
      'src/apps/storybook/src/components/atoms/VayyariLogo/VayyariLogo.tsx'
    );
    assert.ok(fs.existsSync(logoCompPath), 'VayyariLogo component must exist');
    const content = fs.readFileSync(logoCompPath, 'utf8');
    assert.ok(content.includes('export const VayyariLogo'), 'Must export VayyariLogo');
    assert.ok(content.includes('export const VayyariLogoEmblem'), 'Must export VayyariLogoEmblem');
    assert.ok(content.includes('export const VayyariLogoIcon'), 'Must export VayyariLogoIcon');
    assert.ok(content.includes('VAYYARI'), 'Must contain VAYYARI wordmark');
    assert.ok(content.includes('FASHIONS'), 'Must contain FASHIONS tracking');
    assert.ok(content.includes('viewBox="0 0 103 104"'), 'Must match Figma 103x104 viewBox');
  });

  test('VayyariLogo stories exist under Atoms/Vayyari Fashions Logo', () => {
    const logoStoryPath = path.join(
      rootDir,
      'src/apps/storybook/src/stories/atoms/VayyariLogo.stories.tsx'
    );
    assert.ok(fs.existsSync(logoStoryPath), 'VayyariLogo stories must exist');
    const content = fs.readFileSync(logoStoryPath, 'utf8');
    assert.ok(content.includes("title: 'Atoms/Vayyari Fashions Logo'"), 'Must have correct story title');
    assert.ok(content.includes('Variants'), 'Must include Variants story');
    assert.ok(content.includes('SizeSpectrum'), 'Must include SizeSpectrum story');
  });

  test('VayyariLogo is symlinked in store and created in mobile app', () => {
    const storeLinkPath = path.join(rootDir, 'src/store/src/components/atoms/VayyariLogo');
    assert.ok(fs.existsSync(storeLinkPath), 'Store app must have VayyariLogo atom available');

    const mobileIconPath = path.join(rootDir, 'src/vayyari/components/icons/VayyariLogoIcon.tsx');
    assert.ok(fs.existsSync(mobileIconPath), 'Mobile app must have VayyariLogoIcon');
  });
});
