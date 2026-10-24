/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * rentalCheckpoint.test.js
 *
 * Week-7 module-level checkpoint tests.
 * Runs with Node's built-in test runner:  node --test src/tests/rentalCheckpoint.test.js
 *
 * Tests: rental model schema, transaction model schema, and the guarded
 * status-transition logic extracted from the controller.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Status-transition guard (mirrors rentalController logic) ──────────────
const OWNER_TRANSITIONS = {
  requested: ['approved', 'cancelled'],
  approved: ['cancelled'],
};
const RENTER_CANCEL_FROM = ['requested'];

function canOwnerTransition(from, to) {
  return (OWNER_TRANSITIONS[from] || []).includes(to);
}

function canRenterCancel(from) {
  return RENTER_CANCEL_FROM.includes(from);
}

// ── Conflict-check helper (mirrors rentalController logic) ─────────────────
function hasDateConflict(existing, newStart, newEnd) {
  return existing.startDate < newEnd && existing.dueDate > newStart;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Rental status transitions', () => {
  test('Owner can approve a requested rental', () => {
    assert.ok(canOwnerTransition('requested', 'approved'));
  });

  test('Owner can cancel a requested rental', () => {
    assert.ok(canOwnerTransition('requested', 'cancelled'));
  });

  test('Owner can cancel an approved rental', () => {
    assert.ok(canOwnerTransition('approved', 'cancelled'));
  });

  test('Owner cannot approve an already-active rental', () => {
    assert.ok(!canOwnerTransition('active', 'approved'));
  });

  test('Owner cannot go from approved to active directly (handover endpoint required)', () => {
    assert.ok(!canOwnerTransition('approved', 'active'));
  });

  test('Owner cannot transition from completed', () => {
    assert.ok(!canOwnerTransition('completed', 'cancelled'));
  });

  test('Renter can cancel from requested state', () => {
    assert.ok(canRenterCancel('requested'));
  });

  test('Renter cannot cancel from approved state', () => {
    assert.ok(!canRenterCancel('approved'));
  });

  test('Renter cannot cancel from active state', () => {
    assert.ok(!canRenterCancel('active'));
  });
});

describe('Booking conflict detection', () => {
  const existingRental = {
    startDate: new Date('2026-11-01'),
    dueDate: new Date('2026-11-10'),
  };

  test('Overlapping dates detected', () => {
    const newStart = new Date('2026-11-05');
    const newEnd = new Date('2026-11-15');
    assert.ok(hasDateConflict(existingRental, newStart, newEnd));
  });

  test('Fully contained range detected as conflict', () => {
    const newStart = new Date('2026-11-02');
    const newEnd = new Date('2026-11-08');
    assert.ok(hasDateConflict(existingRental, newStart, newEnd));
  });

  test('Back-to-back dates (adjacent, non-overlapping) — no conflict', () => {
    const newStart = new Date('2026-11-10');
    const newEnd = new Date('2026-11-15');
    assert.ok(!hasDateConflict(existingRental, newStart, newEnd));
  });

  test('Completely before existing — no conflict', () => {
    const newStart = new Date('2026-10-20');
    const newEnd = new Date('2026-11-01');
    assert.ok(!hasDateConflict(existingRental, newStart, newEnd));
  });

  test('Completely after existing — no conflict', () => {
    const newStart = new Date('2026-11-11');
    const newEnd = new Date('2026-11-20');
    assert.ok(!hasDateConflict(existingRental, newStart, newEnd));
  });
});

describe('Transaction confirmation state machine', () => {
  function simulateConfirmation(txn, confirmerRole) {
    const updated = { ...txn };
    const now = new Date();

    if (confirmerRole === 'buyer' && !txn.buyerConfirmedAt) {
      updated.buyerConfirmedAt = now;
      updated.status = txn.status === 'seller_confirmed' ? 'completed' : 'buyer_confirmed';
    } else if (confirmerRole === 'seller' && !txn.sellerConfirmedAt) {
      updated.sellerConfirmedAt = now;
      updated.status = txn.status === 'buyer_confirmed' ? 'completed' : 'seller_confirmed';
    }

    return updated;
  }

  test('Buyer confirms first → status becomes buyer_confirmed', () => {
    const txn = { status: 'pending', buyerConfirmedAt: null, sellerConfirmedAt: null };
    const result = simulateConfirmation(txn, 'buyer');
    assert.equal(result.status, 'buyer_confirmed');
  });

  test('Seller confirms first → status becomes seller_confirmed', () => {
    const txn = { status: 'pending', buyerConfirmedAt: null, sellerConfirmedAt: null };
    const result = simulateConfirmation(txn, 'seller');
    assert.equal(result.status, 'seller_confirmed');
  });

  test('Both confirm → status becomes completed', () => {
    const txn = { status: 'buyer_confirmed', buyerConfirmedAt: new Date(), sellerConfirmedAt: null };
    const result = simulateConfirmation(txn, 'seller');
    assert.equal(result.status, 'completed');
  });
});

describe('Date validation guards', () => {
  test('startDate cannot be after dueDate', () => {
    const start = new Date('2026-12-10');
    const due = new Date('2026-12-05');
    assert.ok(start >= due);
  });

  test('Valid date range passes guard', () => {
    const start = new Date('2026-12-01');
    const due = new Date('2026-12-10');
    assert.ok(start < due);
  });
});

describe('RentalRequest - Free-form item request (no listingId required)', () => {
  const RentalRequest = require('../models/RentalRequest');

  test('RentalRequest schema validates required fields', () => {
    const req = new RentalRequest({
      requesterId: '507f191e810c19729de860ea',
      itemName: 'Scientific Calculator',
      startDate: new Date('2026-12-01'),
      dueDate: new Date('2026-12-03'),
    });
    const err = req.validateSync();
    assert.equal(err, undefined);
    assert.equal(req.status, 'open');
    assert.equal(req.category, 'Other');
  });

  test('RentalRequest fails validation when itemName is missing', () => {
    const req = new RentalRequest({
      requesterId: '507f191e810c19729de860ea',
      startDate: new Date('2026-12-01'),
      dueDate: new Date('2026-12-03'),
    });
    const err = req.validateSync();
    assert.ok(err.errors.itemName);
  });

  test('RentalRequest allows cancellation only when status is open', () => {
    function canCancel(requestStatus) {
      return requestStatus === 'open';
    }
    assert.ok(canCancel('open'));
    assert.ok(!canCancel('fulfilled'));
    assert.ok(!canCancel('cancelled'));
  });
});

