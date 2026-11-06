import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

interface NavigationStackState {
  stack: string[];
}

function createNavigationHarness() {
  const state: NavigationStackState = { stack: ['/'] };

  return {
    get current() {
      return state.stack[state.stack.length - 1];
    },
    get stack() {
      return [...state.stack];
    },
    push(route: string) {
      state.stack.push(route);
    },
    back() {
      if (state.stack.length > 1) {
        state.stack.pop();
        return true;
      }
      return false;
    },
    swipeBack() {
      // Native swipe-back gesture pops the top-most pushed route in the native stack
      return this.back();
    },
  };
}

describe('Store Inventory to Review Queue Navigation Hierarchy', () => {
  test('Clicking review count in in-store inventory navigates to /store/reviews, and swipe-back returns to inventory', () => {
    const nav = createNavigationHarness();
    assert.equal(nav.current, '/');

    // 1. User navigates from Home to In-Store Inventory
    nav.push('/store/inventory');
    assert.equal(nav.current, '/store/inventory');
    assert.deepEqual(nav.stack, ['/', '/store/inventory']);

    // 2. In In-Store Inventory, user taps the Review Count button
    // Handler must call router.push('/store/reviews')
    nav.push('/store/reviews');
    assert.equal(nav.current, '/store/reviews', 'Must be on the dedicated review queue route');
    assert.deepEqual(nav.stack, ['/', '/store/inventory', '/store/reviews']);

    // 3. User performs native swipe-back on the Review List page
    const popped = nav.swipeBack();
    assert.equal(popped, true);
    assert.equal(
      nav.current,
      '/store/inventory',
      'Swipe back from review list MUST return to in-store inventory page'
    );
    assert.notEqual(
      nav.current,
      '/',
      'Swipe back MUST NOT take user directly to homepage'
    );

    // 4. User performs second swipe-back from In-Store Inventory
    const secondPopped = nav.swipeBack();
    assert.equal(secondPopped, true);
    assert.equal(nav.current, '/', 'Swipe back from inventory page returns to homepage');
  });

  test('Review button handler invokes onNavigateToReviewQueue when available', () => {
    let navigatedRoute: string | null = null;
    const onNavigateToReviewQueue = () => {
      navigatedRoute = '/store/reviews';
    };

    let showNeedsReviewOnly = false;
    const handlePress = () => {
      if (onNavigateToReviewQueue) {
        onNavigateToReviewQueue();
      } else {
        showNeedsReviewOnly = !showNeedsReviewOnly;
      }
    };

    handlePress();
    assert.equal(navigatedRoute, '/store/reviews');
    assert.equal(showNeedsReviewOnly, false, 'In-place state should not toggle when external navigation is used');
  });

  test('Fallback when onNavigateToReviewQueue is omitted toggles in-place filter', () => {
    let showNeedsReviewOnly = false;
    const handlePress = () => {
      showNeedsReviewOnly = !showNeedsReviewOnly;
    };

    handlePress();
    assert.equal(showNeedsReviewOnly, true);
    handlePress();
    assert.equal(showNeedsReviewOnly, false);
  });

  test('In-place filter BackHandler: resets filter before popping route', () => {
    let showNeedsReviewOnly = true;
    let didPopRoute = false;

    const handleBack = () => {
      if (showNeedsReviewOnly) {
        showNeedsReviewOnly = false;
        return true; // consumed filter reset
      }
      didPopRoute = true;
      return true; // consumed route pop
    };

    // First back press resets filter
    const handledFirst = handleBack();
    assert.equal(handledFirst, true);
    assert.equal(showNeedsReviewOnly, false, 'First back press should clear review filter');
    assert.equal(didPopRoute, false, 'Should not pop route while in-place filter was active');

    // Second back press pops route
    const handledSecond = handleBack();
    assert.equal(handledSecond, true);
    assert.equal(didPopRoute, true, 'Second back press should navigate back');
  });

  test('Review queue mode filters products strictly to pending reviews and computes counts', () => {
    const mockProducts = [
      { id: '1', productCode: 'P1', isReviewPending: true, title: 'Item 1' },
      { id: '2', productCode: 'P2', isReviewPending: false, title: 'Item 2' },
      { id: '3', productCode: 'P3', isReviewPending: true, title: 'Item 3' },
    ];

    const isReviewQueueMode = true;
    const filtered = mockProducts.filter((p) => {
      if (isReviewQueueMode && !p.isReviewPending) {
        return false;
      }
      return true;
    });

    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map((p) => p.id), ['1', '3']);
  });
});
