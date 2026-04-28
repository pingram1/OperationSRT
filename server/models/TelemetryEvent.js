const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const Schema = mongoose.Schema;

/**
 * Immutable telemetry envelope for Adaptive Learning ingestion (hot path writes only).
 *
 * MongoDB Atlas Time Series Collections require a discrete `metaField` + `timeField`; this flat
 * document shape matches the v1 Event Catalog. Compound indexes (`actorUserId` + `occurredAt`)
 * approximate time-series read patterns until a migration to `createCollection({ timeseries })`
 * nests envelope fields under the server’s chosen meta key.
 */

const TelemetryEventSchema = new Schema({
    schemaVersion: {
        type: String,
        required: true,
        default: '2025.04.v1',
    },
    eventId: {
        type: String,
        required: true,
        unique: true,
        default: () => randomUUID(),
    },
    eventName: {
        type: String,
        required: true,
    },
    occurredAt: {
        type: Date,
        required: true,
    },
    serverReceivedAt: {
        type: Date,
        default: Date.now,
    },
    actorUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    subjectStudentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        default: null,
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        default: null,
    },
    correlationId: {
        type: String,
        default: null,
    },
    clientTimezone: {
        type: String,
        default: null,
    },
    deviceContext: {
        type: Schema.Types.Mixed,
        default: null,
    },
    payload: {
        type: Schema.Types.Mixed,
        default: null,
    },
}, {
    collection: 'telemetryevents',
});

TelemetryEventSchema.index({ actorUserId: 1, occurredAt: -1 });
TelemetryEventSchema.index({ eventName: 1, occurredAt: -1 });
TelemetryEventSchema.index({ occurredAt: -1 });

module.exports = mongoose.model('TelemetryEvent', TelemetryEventSchema);
