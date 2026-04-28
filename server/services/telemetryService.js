const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const TelemetryEvent = require('../models/TelemetryEvent');
const logger = require('../utils/logger');

function toObjectIdMaybe(value) {
    if (value == null || value === '') {
        return null;
    }
    if (value instanceof mongoose.Types.ObjectId) {
        return value;
    }
    if (mongoose.isValidObjectId(value)) {
        return new mongoose.Types.ObjectId(value);
    }
    return null;
}

/**
 * Persist a telemetry event without blocking the request path (hot path principle).
 *
 * @param {string} eventName - Catalog event name (e.g. `auth_login_success`)
 * @param {object} [payload={}] - Event-specific measurements (stored in `payload`)
 * @param {object} [context={}] - Envelope overrides: ids, timezone, correlationId, occurredAt, eventId, deviceContext
 */
function trackEvent(eventName, payload = {}, context = {}) {
    const eventId = context.eventId || randomUUID();
    const occurredAt = context.occurredAt != null
        ? new Date(context.occurredAt)
        : new Date();

    const doc = {
        schemaVersion: context.schemaVersion || '2025.04.v1',
        eventId,
        eventName,
        occurredAt,
        serverReceivedAt: new Date(),
        actorUserId: toObjectIdMaybe(context.actorUserId),
        subjectStudentId: toObjectIdMaybe(context.subjectStudentId),
        schoolId: toObjectIdMaybe(context.schoolId),
        bookingId: toObjectIdMaybe(context.bookingId),
        correlationId: context.correlationId ?? null,
        clientTimezone: context.clientTimezone ?? null,
        deviceContext: context.deviceContext ?? null,
        payload: payload && typeof payload === 'object' ? payload : {},
    };

    return TelemetryEvent.create(doc).catch((err) => {
        logger.warn('[telemetry] write failed', {
            eventName,
            message: err.message,
        });
    });
}

module.exports = {
    trackEvent,
};
