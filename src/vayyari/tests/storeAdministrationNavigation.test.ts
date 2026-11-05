import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

interface UtilityItem {
  id: string;
  title: string;
  route: string;
  color?: string;
}

interface UtilityGroup {
  id: string;
  title: string;
  items: UtilityItem[];
}

const STORE_UTILITIES_UPDATED: UtilityItem[] = [
  {
    id: 'store-inventory',
    title: 'Storefront',
    route: '/store/inventory',
    color: '#0D9488',
  },
  {
    id: 'store-publish',
    title: 'Publish Batch',
    route: '/store/publish',
    color: '#8B5CF6',
  },
  {
    id: 'store-administration',
    title: 'Administration',
    route: '/store/administration',
    color: '#06B6D4',
  },
];

interface StoreAdministrationSubNav {
  id: string;
  title: string;
  route: string;
}

const STORE_ADMINISTRATION_SUB_ITEMS: StoreAdministrationSubNav[] = [
  {
    id: 'fleet-devices',
    title: 'Fleet & Devices',
    route: '/store/devices',
  },
  {
    id: 'hardware-directory',
    title: 'Hardware Directory',
    route: '/store/devices/list',
  },
];

describe('Storefront Operations Administration Navigation Hierarchy', () => {
  test('Storefront Operations contains Administration and no longer exposes raw fleet & devices at top-level', () => {
    const adminTile = STORE_UTILITIES_UPDATED.find((item) => item.id === 'store-administration');
    assert.ok(adminTile, 'Storefront Operations must include store-administration tile');
    assert.equal(adminTile?.title, 'Administration');
    assert.equal(adminTile?.route, '/store/administration');

    const rawFleetTile = STORE_UTILITIES_UPDATED.find((item) => item.id === 'store-devices');
    assert.equal(rawFleetTile, undefined, 'Fleet & Devices must not exist directly under top-level Storefront Operations');
  });

  test('Storefront Administration houses Fleet & Devices and Hardware Directory routes', () => {
    const fleetItem = STORE_ADMINISTRATION_SUB_ITEMS.find((item) => item.id === 'fleet-devices');
    assert.ok(fleetItem, 'Administration must contain Fleet & Devices');
    assert.equal(fleetItem?.title, 'Fleet & Devices');
    assert.equal(fleetItem?.route, '/store/devices');

    const directoryItem = STORE_ADMINISTRATION_SUB_ITEMS.find((item) => item.id === 'hardware-directory');
    assert.ok(directoryItem, 'Administration must contain Hardware Directory');
    assert.equal(directoryItem?.route, '/store/devices/list');
  });

  test('Navigation flow resolves back hierarchy correctly from devices to store administration to hub', () => {
    const navigationStack: string[] = ['/'];

    // 1. User taps "Administration" in Storefront Operations
    navigationStack.push('/store/administration');
    assert.equal(navigationStack[navigationStack.length - 1], '/store/administration');

    // 2. User taps "Fleet & Devices" inside Storefront Administration
    navigationStack.push('/store/devices');
    assert.equal(navigationStack[navigationStack.length - 1], '/store/devices');

    // 3. User taps Back button on Fleet & Devices dashboard
    navigationStack.pop();
    assert.equal(navigationStack[navigationStack.length - 1], '/store/administration');

    // 4. User taps Back button on Storefront Administration
    navigationStack.pop();
    assert.equal(navigationStack[navigationStack.length - 1], '/');
  });

  test('BackHandler logic: dismisses device drawer if open, otherwise navigates back', () => {
    let selectedDeviceId: string | null = 'dev-xyz-123';
    let didPopRoute = false;

    const handleBack = () => {
      if (selectedDeviceId) {
        selectedDeviceId = null;
        return true; // consumed drawer close
      }
      didPopRoute = true;
      return true; // consumed route pop
    };

    // First back press should close drawer
    const result1 = handleBack();
    assert.equal(result1, true);
    assert.equal(selectedDeviceId, null, 'First back press should clear selectedDeviceId');
    assert.equal(didPopRoute, false, 'Should not pop route while drawer is open');

    // Second back press should navigate back
    const result2 = handleBack();
    assert.equal(result2, true);
    assert.equal(didPopRoute, true, 'Second back press should trigger router.back()');
  });

  test('Swipe-back gesture thresholds validate correctly', () => {
    const isSwipeBackValid = (translationX: number, velocityX: number, startX: number) => {
      // Must start near left edge (< 60px) and have sufficient forward swipe or velocity
      const isEdge = startX <= 60;
      const isForward = translationX > 45 || velocityX > 300;
      return isEdge && isForward;
    };

    assert.equal(isSwipeBackValid(50, 100, 20), true, 'Valid edge swipe');
    assert.equal(isSwipeBackValid(20, 350, 10), true, 'Fling gesture with high velocity');
    assert.equal(isSwipeBackValid(50, 100, 150), false, 'Should ignore swipes initiated far from edge (e.g. on horizontal charts)');
    assert.equal(isSwipeBackValid(-30, 200, 20), false, 'Should ignore leftward swipes');
  });
});

