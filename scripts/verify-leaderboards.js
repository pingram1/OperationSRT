#!/usr/bin/env node
/**
 * verify-leaderboards.js
 * ---------------------------------------------------------------------------
 * End-to-end verification for the School Cohort leaderboard endpoints.
 *
 * It proves the two new endpoints work over real HTTP against the running API:
 *   A) GET /api/schools/leaderboards/cohorts        (cohort-vs-cohort rank)
 *   B) GET /api/schools/:schoolId/leaderboard       (internal cohort rank)
 *
 * Strategy (self-contained, no manual steps):
 *   1. Connect to MongoDB to locate "Oak Creek Middle School" + its school_admin.
 *   2. Mint a short-lived JWT for that school_admin using the SAME JWT_SECRET the
 *      API uses (token payload shape matches authController).
 *   3. Independently compute the expected cohort total XP straight from Mongo.
 *   4. Call both endpoints over HTTP with the Bearer token.
 *   5. Assert: studentCount === 20 AND the HTTP cohortTotalXp matches the DB sum.
 *
 * --------------------------------------------------------------------------
 * USAGE (from the repository root, with the API server running):
 *
 *     node scripts/verify-leaderboards.js
 *
 * Env (read from server/.env, override-able):
 *     MONGO_URI      - database connection (required)
 *     JWT_SECRET     - same secret the API signs with (required)
 *     PORT           - API port (default 3001)
 *     API_BASE_URL   - full base URL override (default http://localhost:$PORT)
 * --------------------------------------------------------------------------
 */

'use strict';

const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..', 'server');

require(path.join(SERVER_DIR, 'node_modules', 'dotenv')).config({
    path: path.join(SERVER_DIR, '.env'),
});

const mongoose = require(path.join(SERVER_DIR, 'node_modules', 'mongoose'));
const jwt = require(path.join(SERVER_DIR, 'node_modules', 'jsonwebtoken'));
const User = require(path.join(SERVER_DIR, 'models', 'User'));
const School = require(path.join(SERVER_DIR, 'models', 'School'));

const SCHOOL_NAME = 'Oak Creek Middle School';
const EXPECTED_STUDENTS = 20;
const TEACHER_EMAIL = 'oakcreek_admin@mock.com';

const PORT = process.env.PORT || 3001;
const BASE_URL = (process.env.API_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const log = (...a) => console.log(...a);
const divider = () => log('━'.repeat(64));

let failures = 0;
function assert(condition, message) {
    if (condition) {
        log(`  ✅ ${message}`);
    } else {
        log(`  ❌ ${message}`);
        failures += 1;
    }
}

async function httpGet(url, token) {
    if (typeof fetch !== 'function') {
        throw new Error('global fetch is unavailable — Node 18+ is required to run this verifier');
    }
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    let body = null;
    try {
        body = await res.json();
    } catch (_) {
        body = null;
    }
    return { status: res.status, body };
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (server/.env).');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set (server/.env).');

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    log(`✅ Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    log(`🌐 API base URL: ${BASE_URL}`);
    divider();

    // 1. Locate the seeded cohort + a school_admin to authenticate as.
    const school = await School.findOne({ name: SCHOOL_NAME });
    if (!school) {
        throw new Error(`Cohort "${SCHOOL_NAME}" not found. Run: node scripts/seed-school-cohort.js --reset`);
    }
    const teacher = await User.findOne({ email: TEACHER_EMAIL, role: 'school_admin' });
    if (!teacher) {
        throw new Error(`School admin ${TEACHER_EMAIL} not found. Run the seeder first.`);
    }

    // 2. Independently compute the expected cohort total straight from Mongo.
    const dbRollup = await User.aggregate([
        { $match: { role: 'student', schoolId: school._id } },
        { $group: { _id: '$schoolId', total: { $sum: '$xp' }, count: { $sum: 1 } } },
    ]);
    const expectedTotalXp = dbRollup[0]?.total ?? 0;
    const expectedCount = dbRollup[0]?.count ?? 0;
    log(`📊 DB truth for "${school.name}": studentCount=${expectedCount}, cohortTotalXp=${expectedTotalXp}`);

    // 3. Mint a JWT for the school_admin (payload shape matches authController).
    const token = jwt.sign(
        { user: { id: String(teacher._id), role: teacher.role } },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
    );

    divider();
    log('TEST A — GET /api/schools/leaderboards/cohorts (cohort-vs-cohort rank)');
    divider();
    const a = await httpGet(`${BASE_URL}/api/schools/leaderboards/cohorts`, token);
    assert(a.status === 200, `HTTP 200 (got ${a.status})`);
    const cohorts = a.body?.cohorts || [];
    const oak = cohorts.find((c) => String(c.schoolId) === String(school._id));
    assert(Boolean(oak), `"${school.name}" appears in the cohort leaderboard`);
    if (oak) {
        log(`     → rank=${oak.rank}, studentCount=${oak.studentCount}, cohortTotalXp=${oak.cohortTotalXp}, avg=${oak.averageXp}`);
        assert(oak.studentCount === EXPECTED_STUDENTS, `studentCount === ${EXPECTED_STUDENTS} (got ${oak.studentCount})`);
        assert(oak.cohortTotalXp === expectedTotalXp, `cohortTotalXp matches DB sum (${expectedTotalXp})`);
        assert(typeof oak.rank === 'number' && oak.rank >= 1, 'rank is a positive integer');
    }

    divider();
    log('TEST B — GET /api/schools/:schoolId/leaderboard (internal cohort rank)');
    divider();
    const b = await httpGet(`${BASE_URL}/api/schools/${school._id}/leaderboard`, token);
    assert(b.status === 200, `HTTP 200 (got ${b.status})`);
    const lb = b.body || {};
    assert(lb.studentCount === EXPECTED_STUDENTS, `studentCount === ${EXPECTED_STUDENTS} (got ${lb.studentCount})`);
    assert(lb.cohortTotalXp === expectedTotalXp, `cohortTotalXp matches DB sum (${expectedTotalXp})`);
    const board = lb.leaderboard || [];
    const sortedDesc = board.every((s, i) => i === 0 || board[i - 1].xp >= s.xp);
    assert(sortedDesc, 'students are sorted by xp descending');
    assert(board[0]?.rank === 1, 'first student has rank 1');
    if (board.length > 0) {
        log(`     → top student: ${board[0].name} (xp=${board[0].xp}, level=${board[0].level})`);
    }

    divider();
    if (failures === 0) {
        log('🎉 ALL CHECKS PASSED — cohort leaderboards are working end-to-end.');
    } else {
        log(`❌ ${failures} check(s) FAILED — see output above.`);
    }
    divider();

    await mongoose.disconnect();
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
    console.error('❌ Verification failed:', err.message);
    try {
        await mongoose.disconnect();
    } catch (_) {
        /* ignore */
    }
    process.exit(1);
});
