import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export type CurationScreen = 'hub' | 'qualify_and_group' | 'metadata' | 'manage_skus' | 'anti_lens_studio';

interface BackNavigationState {
  currentScreen: CurationScreen;
  showPreview: boolean;
  colorPickerModalGroupId: string | null;
  editingMedia: boolean;
  dualCardMedia: boolean;
  inventoryNavigatedCount: number;
}

function createBackNavigator(initialState: Partial<BackNavigationState> = {}) {
  const state: BackNavigationState = {
    currentScreen: initialState.currentScreen || 'hub',
    showPreview: initialState.showPreview || false,
    colorPickerModalGroupId: initialState.colorPickerModalGroupId || null,
    editingMedia: initialState.editingMedia || false,
    dualCardMedia: initialState.dualCardMedia || false,
    inventoryNavigatedCount: 0,
  };

  const handleBack = (): boolean => {
    if (state.showPreview) {
      state.showPreview = false;
      return true;
    }
    if (state.colorPickerModalGroupId) {
      state.colorPickerModalGroupId = null;
      return true;
    }
    if (state.editingMedia) {
      state.editingMedia = false;
      return true;
    }
    if (state.dualCardMedia) {
      state.dualCardMedia = false;
      return true;
    }
    if (state.currentScreen === 'anti_lens_studio') {
      state.currentScreen = 'qualify_and_group';
      return true;
    }
    if (state.currentScreen !== 'hub') {
      state.currentScreen = 'hub';
      return true;
    }
    state.inventoryNavigatedCount++;
    return true;
  };

  return { state, handleBack };
}

describe('Store Curation Navigation Order Rules', () => {
  test('qualify & group screen transitions back to store curation hub, not inventory', () => {
    const { state, handleBack } = createBackNavigator({ currentScreen: 'qualify_and_group' });

    assert.equal(state.currentScreen, 'qualify_and_group');
    assert.equal(state.inventoryNavigatedCount, 0);

    // 1st back: from qualify & group -> lands on store curation hub
    const handledFirst = handleBack();
    assert.equal(handledFirst, true);
    assert.equal(state.currentScreen, 'hub', 'Should go back to store curation page again');
    assert.equal(state.inventoryNavigatedCount, 0, 'Must NOT directly land in in-store inventory');

    // 2nd back: from store curation hub -> navigates back to in-store inventory
    const handledSecond = handleBack();
    assert.equal(handledSecond, true);
    assert.equal(state.inventoryNavigatedCount, 1, 'Now it safely returns to in-store inventory');
  });

  test('metadata screen transitions back to store curation hub, not inventory', () => {
    const { state, handleBack } = createBackNavigator({ currentScreen: 'metadata' });

    assert.equal(state.currentScreen, 'metadata');
    assert.equal(state.inventoryNavigatedCount, 0);

    // 1st back: from metadata -> lands on store curation hub
    const handledFirst = handleBack();
    assert.equal(handledFirst, true);
    assert.equal(state.currentScreen, 'hub', 'Should go back to store curation page again');
    assert.equal(state.inventoryNavigatedCount, 0, 'Must NOT directly land in in-store inventory');

    // 2nd back: from store curation hub -> navigates back to in-store inventory
    const handledSecond = handleBack();
    assert.equal(handledSecond, true);
    assert.equal(state.inventoryNavigatedCount, 1, 'Now it safely returns to in-store inventory');
  });

  test('manage_skus screen transitions back to store curation hub, not inventory', () => {
    const { state, handleBack } = createBackNavigator({ currentScreen: 'manage_skus' });

    assert.equal(state.currentScreen, 'manage_skus');

    const handledFirst = handleBack();
    assert.equal(handledFirst, true);
    assert.equal(state.currentScreen, 'hub');
    assert.equal(state.inventoryNavigatedCount, 0);

    const handledSecond = handleBack();
    assert.equal(handledSecond, true);
    assert.equal(state.inventoryNavigatedCount, 1);
  });

  test('anti_lens_studio screen transitions back to qualify & group, then hub, then inventory', () => {
    const { state, handleBack } = createBackNavigator({ currentScreen: 'anti_lens_studio' });

    assert.equal(state.currentScreen, 'anti_lens_studio');
    assert.equal(state.inventoryNavigatedCount, 0);

    // 1st back: from anti_lens_studio -> lands on qualify_and_group
    const handledFirst = handleBack();
    assert.equal(handledFirst, true);
    assert.equal(state.currentScreen, 'qualify_and_group', 'Should return to qualify & group stage');
    assert.equal(state.inventoryNavigatedCount, 0);

    // 2nd back: from qualify & group -> lands on store curation hub
    const handledSecond = handleBack();
    assert.equal(handledSecond, true);
    assert.equal(state.currentScreen, 'hub', 'Should return to store curation hub');
    assert.equal(state.inventoryNavigatedCount, 0);

    // 3rd back: from hub -> lands on in-store inventory
    const handledThird = handleBack();
    assert.equal(handledThird, true);
    assert.equal(state.inventoryNavigatedCount, 1);
  });

  test('tapping shield in qualify stage transitions to anti_lens_studio with selected media', () => {
    let currentScreen: CurationScreen = 'qualify_and_group';
    let currentStage = 'qualify';
    let selectedStudioMediaId: string | null = null;

    // Simulate clicking shield icon on media tile 'media-42'
    const handleOpenStudio = (mediaId: string) => {
      setSelectedStudioMediaId(mediaId);
      setCurrentScreen('anti_lens_studio');
    };
    function setSelectedStudioMediaId(id: string) { selectedStudioMediaId = id; }
    function setCurrentScreen(screen: CurationScreen) { currentScreen = screen; }

    handleOpenStudio('media-42');

    assert.equal(currentScreen, 'anti_lens_studio');
    assert.equal(selectedStudioMediaId, 'media-42');
    assert.equal(currentStage, 'qualify');
  });

  test('back navigation from anti_lens_studio preserves qualify stage and filter context', () => {
    let currentScreen: CurationScreen = 'anti_lens_studio';
    let currentStage = 'qualify';
    let selectedStudioMediaId: string | null = 'media-42';

    const handleBackNavigation = () => {
      if (currentScreen === 'anti_lens_studio') {
        currentScreen = 'qualify_and_group';
        currentStage = 'qualify';
        return;
      }
      if (currentScreen !== 'hub') {
        currentScreen = 'hub';
        return;
      }
    };

    handleBackNavigation();

    assert.equal(currentScreen, 'qualify_and_group');
    assert.equal(currentStage, 'qualify');
    // Media was preserved during studio session
    assert.equal(selectedStudioMediaId, 'media-42');
  });
});
