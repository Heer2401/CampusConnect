/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * rentalReminderService.js
 *
 * Scheduled jobs (node-cron) that:
 *  1. Fire unsent due-date reminders → emit events to Heer Shah's notification pipeline
 *  2. Mark active rentals as overdue when their due date has passed
 *
 * Integration contract with Heer Shah (Notification Lead):
 *   Event type : 'RENTAL_DUE_SOON' | 'RENTAL_OVERDUE' | 'RENTAL_RETURN_CONFIRMED'
 *   Payload    : { type, rentalId, userId, dueDate }
 *
 * Usage: imported once in server.js — startRentalScheduler(io)
 */

const cron = require('node-cron');
const Rental = require('../models/Rental');
const RentalReminder = require('../models/RentalReminder');

/**
 * Emits a rental notification event.
 * When Heer Shah's Socket.io notification room is ready, replace the
 * console.log with:  io.to(`user:${userId}`).emit('notification', payload)
 */
function emitRentalEvent(io, userId, payload) {
  console.log(`[RentalReminder] Emitting event to user ${userId}:`, payload);

  // ── Integration point for Heer Shah ──────────────────────────────────
  // Agreed event structure — do NOT change without coordinating with Heer Shah
  if (io) {
    io.to(`user:${userId.toString()}`).emit('notification', payload);
  }
  // ─────────────────────────────────────────────────────────────────────
}

/**
 * Job 1 — runs every 15 minutes
 * Finds unsent reminders whose scheduledFor time has arrived and sends them.
 */
function startDueSoonReminders(io) {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const pending = await RentalReminder.find({
        scheduledFor: { $lte: now },
        sentAt: null,
      }).populate('rentalId');

      for (const reminder of pending) {
        const rental = reminder.rentalId;
        if (!rental) continue;

        // Skip if rental is already completed or cancelled
        if (['completed', 'cancelled'].includes(rental.status)) {
          reminder.sentAt = now;
          await reminder.save();
          continue;
        }

        const payload = {
          type: reminder.type === 'return_confirmed' ? 'RENTAL_RETURN_CONFIRMED' : 'RENTAL_DUE_SOON',
          rentalId: rental._id,
          userId: reminder.userId,
          dueDate: rental.dueDate,
          message:
            reminder.type === 'due_soon'
              ? `Reminder: Your rental is due on ${rental.dueDate.toDateString()}.`
              : `Your rental return has been confirmed.`,
        };

        emitRentalEvent(io, reminder.userId, payload);

        reminder.sentAt = now;
        await reminder.save();
      }
    } catch (err) {
      console.error('[RentalReminder] Error sending due-soon reminders:', err.message);
    }
  });

  console.log('[RentalReminder] Due-soon reminder scheduler started (every 15 min).');
}

/**
 * Job 2 — runs every hour
 * Marks active rentals whose dueDate has passed as 'overdue' and
 * sends an overdue notification to the renter.
 */
function startOverdueChecker(io) {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const overdueRentals = await Rental.find({
        status: 'active',
        dueDate: { $lt: now },
      });

      for (const rental of overdueRentals) {
        rental.status = 'overdue';
        await rental.save();

        const payload = {
          type: 'RENTAL_OVERDUE',
          rentalId: rental._id,
          userId: rental.renterId,
          dueDate: rental.dueDate,
          message: `Your rental was due on ${rental.dueDate.toDateString()} and is now overdue. Please return the item immediately.`,
        };

        emitRentalEvent(io, rental.renterId, payload);

        // Also notify owner
        const ownerPayload = {
          type: 'RENTAL_OVERDUE',
          rentalId: rental._id,
          userId: rental.ownerId,
          dueDate: rental.dueDate,
          message: `A rental of your item is overdue since ${rental.dueDate.toDateString()}.`,
        };
        emitRentalEvent(io, rental.ownerId, ownerPayload);

        console.log(`[RentalReminder] Rental ${rental._id} marked as overdue.`);
      }
    } catch (err) {
      console.error('[RentalReminder] Error checking overdue rentals:', err.message);
    }
  });

  console.log('[RentalReminder] Overdue checker started (every hour).');
}

/**
 * Start all rental scheduler jobs.
 * Call this once from server.js after the Socket.io instance is created.
 */
function startRentalScheduler(io) {
  startDueSoonReminders(io);
  startOverdueChecker(io);
}

module.exports = { startRentalScheduler };
