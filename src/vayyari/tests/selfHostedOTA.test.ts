import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCandidateHosts,
  calculateDownloadProgress,
  isUpdateNewer,
  OTAStateManager,
  OTAProgressInfo,
} from '../utils/otaUtils';

describe('Self-Hosted OTA Utility & State Manager Tests', () => {
  test('buildCandidateHosts returns prioritized deduplicated list with required endpoints', () => {
    const hosts = buildCandidateHosts('192.168.0.170');
    assert.ok(Array.isArray(hosts), 'buildCandidateHosts should return an array');
    assert.ok(hosts.length >= 3, 'Should include at least 3 fallback hosts');
    assert.ok(hosts.includes('adminapi.vayyarifashions.com'), 'Must include public DNS host');
    assert.ok(hosts.includes('192.168.0.170'), 'Must include local LAN host');
    assert.ok(hosts.includes('100.98.244.8'), 'Must include Tailscale gateway host');

    // Verify deduplication
    const unique = new Set(hosts);
    assert.equal(hosts.length, unique.size, 'Candidate hosts list must be deduplicated');
  });

  test('OTAStateManager notifies subscribers immediately and upon state transitions', () => {
    const manager = new OTAStateManager('1.0.0.0');
    let callCount = 0;
    let receivedState: OTAProgressInfo | null = null;

    const unsubscribe = manager.subscribe((state) => {
      callCount++;
      receivedState = state;
    });

    assert.equal(callCount, 1, 'Listener should be invoked synchronously on registration');
    assert.equal((receivedState as any)?.stage, 'idle');
    assert.equal((receivedState as any)?.currentVersion, '1.0.0.0');

    // Emit checking
    manager.update({ stage: 'checking' });
    assert.equal(callCount, 2);
    assert.equal((receivedState as any)?.stage, 'checking');

    // Emit downloading with progress
    manager.update({
      stage: 'downloading',
      percent: 45,
      bytesDownloaded: 4500,
      totalBytes: 10000,
      newVersion: '1.0.0.210',
    });
    assert.equal(callCount, 3);
    assert.equal((receivedState as any)?.stage, 'downloading');
    assert.equal((receivedState as any)?.percent, 45);
    assert.equal((receivedState as any)?.newVersion, '1.0.0.210');

    // Emit ready
    manager.update({ stage: 'ready', percent: 100 });
    assert.equal(callCount, 4);
    assert.equal((receivedState as any)?.stage, 'ready');
    assert.equal((receivedState as any)?.percent, 100);

    unsubscribe();
    manager.update({ stage: 'idle' });
    // After unsubscribe, listener should not be called again
    assert.equal(callCount, 4);
  });

  test('calculateDownloadProgress clamps accurately between 0 and 100', () => {
    assert.equal(calculateDownloadProgress(0, 1000), 0);
    assert.equal(calculateDownloadProgress(500, 1000), 50);
    assert.equal(calculateDownloadProgress(1000, 1000), 100);
    assert.equal(calculateDownloadProgress(1500, 1000), 100); // Clamped upper bound
    assert.equal(calculateDownloadProgress(-50, 1000), 0); // Clamped lower bound
    assert.equal(calculateDownloadProgress(100, 0), 0); // Zero total safeguard
    assert.equal(calculateDownloadProgress(100, -100), 0); // Negative total safeguard
  });

  test('isUpdateNewer accurately classifies subversions and handles force flag', () => {
    // Normal newer subversion
    assert.equal(
      isUpdateNewer({ version: '1.0.0.210', subversion: 210 }, { version: '1.0.0.209', subversion: 209 }),
      true
    );
    // Identical version and subversion
    assert.equal(
      isUpdateNewer({ version: '1.0.0.209', subversion: 209 }, { version: '1.0.0.209', subversion: 209 }),
      false
    );
    // Older subversion
    assert.equal(
      isUpdateNewer({ version: '1.0.0.208', subversion: 208 }, { version: '1.0.0.209', subversion: 209 }),
      false
    );
    // Force flag overrides comparison
    assert.equal(
      isUpdateNewer({ version: '1.0.0.209', subversion: 209 }, { version: '1.0.0.209', subversion: 209 }, true),
      true
    );
  });
});
