import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDelhiveryErrorMessage } from '../utils/delhivery-error';

describe('formatDelhiveryErrorMessage', () => {
  it('translates prepaid wallet insufficient balance into user-friendly recharge guidance', () => {
    const raw = "Crashing while saving package due to exception 'Prepaid client manifest charge API failed due to insufficient balance'. Package might have been partially saved.";
    const result = formatDelhiveryErrorMessage(raw);

    assert.ok(result.includes('Delhivery prepaid wallet balance is insufficient'));
    assert.ok(result.includes('one.delhivery.com'));
  });

  it('translates unregistered warehouse into facility registration guidance', () => {
    const raw = "Crashing while saving package due to exception 'Client Warehouse VAY-SURAT doesn't exist'. Package might have been partially saved.";
    const result = formatDelhiveryErrorMessage(raw);

    assert.ok(result.includes("Pickup facility/warehouse 'VAY-SURAT' is not registered"));
    assert.ok(result.includes('Delhivery panel'));
  });

  it('translates unserviceable pincode into friendly delivery mode error', () => {
    const raw = "Crashing while saving package due to exception 'Pin code 500090 is not serviceable for delivery mode Surface'. Package might have been partially saved.";
    const result = formatDelhiveryErrorMessage(raw);

    assert.strictEqual(
      result,
      'Destination pincode is not serviceable by Delhivery for the selected shipping mode.'
    );
  });

  it('translates invalid phone error into 10-digit mobile guidance', () => {
    const raw = "Crashing while saving package due to exception 'Mobile number is invalid'. Package might have been partially saved.";
    const result = formatDelhiveryErrorMessage(raw);

    assert.strictEqual(
      result,
      'Customer phone number is invalid. Delhivery requires a valid 10-digit mobile number.'
    );
  });

  it('extracts unhandled exception cleanly and strips internal crash wrapper', () => {
    const raw = "Crashing while saving package due to exception 'E-Way bill number is missing for consignment value > 50000'. Package might have been partially saved.";
    const result = formatDelhiveryErrorMessage(raw);

    assert.strictEqual(
      result,
      'Delhivery: E-Way bill number is missing for consignment value > 50000.'
    );
  });

  it('extracts unhandled JSON remarks cleanly from raw CMU API error', () => {
    const raw = 'Delhivery CMU API error: 400 - {"status": "Fail", "remarks": ["Commodity description cannot contain special characters"]}';
    const result = formatDelhiveryErrorMessage(raw);

    assert.strictEqual(
      result,
      'Delhivery: Commodity description cannot contain special characters.'
    );
  });

  it('handles null, undefined, or empty error inputs with fallback message', () => {
    const fallback = 'Shipment manifestation failed with Delhivery. Please check order details and try again.';
    assert.strictEqual(formatDelhiveryErrorMessage(null), fallback);
    assert.strictEqual(formatDelhiveryErrorMessage(undefined), fallback);
    assert.strictEqual(formatDelhiveryErrorMessage(''), fallback);
    assert.strictEqual(formatDelhiveryErrorMessage('   '), fallback);
  });

  it('strips backend prefix "Delhivery manifestation failed:" before categorizing', () => {
    const raw = "Delhivery manifestation failed: Client Warehouse VAY-SURAT doesn't exist";
    const result = formatDelhiveryErrorMessage(raw);

    assert.ok(result.includes("Pickup facility/warehouse 'VAY-SURAT' is not registered"));
  });
});
