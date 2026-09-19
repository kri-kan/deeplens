import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * ScrollAnchorCoordinator models the one-shot landing and user scroll position maintenance logic
 * implemented in FullMessageBrowser (src/vayyari/app/utilities/whatsapp/messages/[jid].tsx).
 */
class ScrollAnchorCoordinator {
  initialLandingCompleted = false;
  userInteracted = false;
  timers: Array<ReturnType<typeof setTimeout>> = [];
  scrollInvocations = 0;
  pulseActive = false;

  constructor(public targetId: string | null = null) {
    if (targetId) {
      this.pulseActive = true;
    }
  }

  // Reset when user navigates to a different target (targetKey change)
  resetForNewTarget(newTargetId: string | null) {
    this.targetId = newTargetId;
    this.initialLandingCompleted = false;
    this.userInteracted = false;
    this.pulseActive = !!newTargetId;
    this.clearPendingTimers();
  }

  clearPendingTimers() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }

  // User drag or swipe initiates on FlatList
  onScrollBeginDrag() {
    this.userInteracted = true;
    this.initialLandingCompleted = true;
    this.pulseActive = false;
    this.clearPendingTimers();
  }

  onMomentumScrollBegin() {
    this.userInteracted = true;
    this.initialLandingCompleted = true;
    this.clearPendingTimers();
  }

  // Scroll to target handler
  scrollToTarget() {
    if (this.userInteracted) {
      return false;
    }
    if (!this.targetId) {
      return false;
    }
    this.scrollInvocations++;
    return true;
  }

  // Initial landing effect
  onInitialLandingEffect(itemsLoaded: boolean) {
    if (!itemsLoaded || !this.targetId) return;
    if (this.initialLandingCompleted || this.userInteracted) return;

    this.initialLandingCompleted = true;

    // Primary landing
    const t1 = setTimeout(() => {
      if (!this.userInteracted) {
        this.scrollToTarget();
      }
    }, 10);

    // Micro-alignment for layout stability
    const t2 = setTimeout(() => {
      if (!this.userInteracted) {
        this.scrollToTarget();
      }
    }, 20);

    this.timers = [t1, t2];
  }

  // Simulates re-render when zoning mode toggles, groups are merged, or metadata refreshes
  onGroupOrZoningChange() {
    // In our new architecture, NO secondary effect calls scrollToTarget on group/zoning mutation.
    // Viewport position is preserved by FlatList maintainVisibleContentPosition.
  }

  // FlatList onScrollToIndexFailed handler
  onScrollToIndexFailed(retryCallback: () => void) {
    if (this.userInteracted) {
      return false;
    }
    retryCallback();
    return true;
  }
}

describe('WhatsApp Chat Scroll Anchor Release & Viewport Preservation Rules', () => {
  test('one-shot initial landing scrolls to target exactly on first mount', async () => {
    const coordinator = new ScrollAnchorCoordinator('msg_target_123');
    assert.equal(coordinator.initialLandingCompleted, false);
    assert.equal(coordinator.userInteracted, false);
    assert.equal(coordinator.pulseActive, true);

    // Effect triggers when messages are loaded
    coordinator.onInitialLandingEffect(true);
    assert.equal(coordinator.initialLandingCompleted, true);

    // Wait for the timers to execute
    await new Promise(r => setTimeout(r, 40));
    assert.equal(coordinator.scrollInvocations, 2); // Initial jump + micro-alignment
  });

  test('subsequent re-renders or message list updates do not re-trigger initial landing effect', async () => {
    const coordinator = new ScrollAnchorCoordinator('msg_target_123');
    coordinator.onInitialLandingEffect(true);
    await new Promise(r => setTimeout(r, 40));
    const countAfterFirst = coordinator.scrollInvocations;

    // Simulate subsequent re-renders with more messages loaded
    coordinator.onInitialLandingEffect(true);
    coordinator.onInitialLandingEffect(true);
    await new Promise(r => setTimeout(r, 40));

    // Invocations must NOT increase
    assert.equal(coordinator.scrollInvocations, countAfterFirst);
  });

  test('user scroll/drag immediately releases scroll lock and cancels pending alignment timers', async () => {
    const coordinator = new ScrollAnchorCoordinator('msg_target_123');
    coordinator.onInitialLandingEffect(true);

    // User starts dragging before secondary micro-alignment timer expires
    coordinator.onScrollBeginDrag();

    assert.equal(coordinator.userInteracted, true);
    assert.equal(coordinator.initialLandingCompleted, true);
    assert.equal(coordinator.pulseActive, false);
    assert.equal(coordinator.timers.length, 0);

    // Wait for timer durations to elapse
    await new Promise(r => setTimeout(r, 40));

    // Invocations should be 0 because drag aborted pending timers
    assert.equal(coordinator.scrollInvocations, 0);
  });

  test('user momentum scroll immediately releases scroll lock and blocks future scrollToTarget', () => {
    const coordinator = new ScrollAnchorCoordinator('msg_target_123');
    coordinator.onMomentumScrollBegin();

    assert.equal(coordinator.userInteracted, true);
    assert.equal(coordinator.initialLandingCompleted, true);

    const scrolled = coordinator.scrollToTarget();
    assert.equal(scrolled, false);
    assert.equal(coordinator.scrollInvocations, 0);
  });

  test('onScrollToIndexFailed aborts immediately if user has interacted', () => {
    const coordinator = new ScrollAnchorCoordinator('msg_target_123');
    let retryRan = false;

    // First when user has not interacted
    const retried1 = coordinator.onScrollToIndexFailed(() => { retryRan = true; });
    assert.equal(retried1, true);
    assert.equal(retryRan, true);

    // After user interacts
    coordinator.onScrollBeginDrag();
    retryRan = false;
    const retried2 = coordinator.onScrollToIndexFailed(() => { retryRan = true; });
    assert.equal(retried2, false);
    assert.equal(retryRan, false);
  });

  test('actions like zoning mode toggle, section merge, and meta fetch do not hijack user scroll', async () => {
    const coordinator = new ScrollAnchorCoordinator('msg_target_123');
    coordinator.onInitialLandingEffect(true);
    await new Promise(r => setTimeout(r, 40));

    // User scrolled away to read an earlier/later conversation
    coordinator.onScrollBeginDrag();
    const currentScrollCalls = coordinator.scrollInvocations;

    // User performs actions: toggles zoning mode, merges sections, or meta loads
    coordinator.onGroupOrZoningChange();
    coordinator.onGroupOrZoningChange();

    // scrollToTarget is never called; user scroll position remains intact
    assert.equal(coordinator.scrollInvocations, currentScrollCalls);
  });

  test('navigating to a distinct target message resets coordinator state cleanly', () => {
    const coordinator = new ScrollAnchorCoordinator('msg_old');
    coordinator.onScrollBeginDrag();
    assert.equal(coordinator.userInteracted, true);

    // New target navigation from PDP
    coordinator.resetForNewTarget('msg_new');
    assert.equal(coordinator.targetId, 'msg_new');
    assert.equal(coordinator.userInteracted, false);
    assert.equal(coordinator.initialLandingCompleted, false);
    assert.equal(coordinator.pulseActive, true);
  });
});
