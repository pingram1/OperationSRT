#!/usr/bin/env node
/**
 * seed-school-cohort.js
 * ---------------------------------------------------------------------------
 * Self-contained bulk seeder for the "School Cohort Partnership" feature.
 *
 * Creates, idempotently:
 *   1. One mock School cohort  ........ "Oak Creek Middle School" (sector: public)
 *   2. One School Admin / Teacher ..... role: school_admin, linked via schoolId
 *   3. Exactly 20 mock Students ....... oakcreek_student1@mock.com .. student20
 *                                       all linked to the school via schoolId +
 *                                       sector, each with a randomized base XP.
 *
 * It then runs the SAME cohort-rollup aggregation the platform would use for a
 * school leaderboard and prints the result as a CLI confirmation, plus the exact
 * queries you can paste into mongosh / Compass to verify independently.
 *
 * --------------------------------------------------------------------------
 * USAGE (from the repository root):
 *
 *     node scripts/seed-school-cohort.js            # create / upsert the cohort
 *     node scripts/seed-school-cohort.js --reset    # delete this mock cohort first, then reseed
 *     node scripts/seed-school-cohort.js --verify   # only run the verification queries
 *
 * It reads the same MongoDB connection string the API uses, from server/.env
 * (MONGO_URI). No existing application files are modified.
 * --------------------------------------------------------------------------
 */

'use strict';

const path = require('path');

// Resolve everything against the server workspace so we reuse the SAME mongoose
// singleton + Mongoose models (and their pre-save password hashing hook) that
// the running API uses. This keeps the script self-contained and dependency-free
// at the repo root.
const SERVER_DIR = path.resolve(__dirname, '..', 'server');

require(path.join(SERVER_DIR, 'node_modules', 'dotenv')).config({
    path: path.join(SERVER_DIR, '.env'),
});

const mongoose = require(path.join(SERVER_DIR, 'node_modules', 'mongoose'));
const User = require(path.join(SERVER_DIR, 'models', 'User'));
const School = require(path.join(SERVER_DIR, 'models', 'School'));

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SCHOOL_NAME = 'Oak Creek Middle School';
const SCHOOL_DISTRICT = 'Oak Creek Unified School District';
const SCHOOL_SECTOR = 'public'; // one of: public | private | charter
const STUDENT_COUNT = 20;
const EMAIL_PREFIX = 'oakcreek_student';
const EMAIL_DOMAIN = 'mock.com';

// Every mock account shares one easy-to-remember password that still satisfies
// the User model's strength validator (8+ chars, at least one letter + number).
const DEFAULT_PASSWORD = process.env.SEED_COHORT_PASSWORD || 'OakCreek2026';

const TEACHER = {
    name: 'Dana Rivera',
    email: 'oakcreek_admin@mock.com',
    role: 'school_admin',
};

// Randomized base XP window for the students.
const XP_MIN = 50;
const XP_MAX = 950;

const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const VERIFY_ONLY = args.has('--verify');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const randomXp = () => Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;

// Mirror the platform's level formula (see challengeController / visualizerController):
//   user.level = Math.floor(user.xp / 100) + 1
const levelFor = (xp) => Math.floor(xp / 100) + 1;

const studentEmail = (n) => `${EMAIL_PREFIX}${n}@${EMAIL_DOMAIN}`;

const log = (...a) => console.log(...a);
const divider = () => log('━'.repeat(64));

/**
 * Find-or-create the mock school. We deliberately use .save() (not
 * findOneAndUpdate) so the SchoolSchema pre('validate') hook fires and a unique
 * registrationCode is generated for the invite/onboarding flow.
 */
async function upsertSchool() {
    let school = await School.findOne({ name: SCHOOL_NAME });
    if (school) {
        log(`• School already exists: "${school.name}" (${school._id})`);
        return school;
    }
    school = new School({
        name: SCHOOL_NAME,
        district: SCHOOL_DISTRICT,
        sector: SCHOOL_SECTOR,
        status: 'active_pilot',
        primaryContactName: TEACHER.name,
        primaryContactEmail: TEACHER.email,
        pilotStartDate: new Date(),
    });
    await school.save(); // triggers registrationCode generation
    log(`✓ Created School: "${school.name}" (${school._id})`);
    return school;
}

/**
 * Find-or-create one school_admin/teacher bound to the cohort. Uses .save() so
 * the User pre-save hook hashes the password.
 */
async function upsertTeacher(school) {
    let teacher = await User.findOne({ email: TEACHER.email });
    if (teacher) {
        teacher.schoolId = school._id;
        teacher.sector = school.sector;
        teacher.role = TEACHER.role;
        await teacher.save();
        log(`• Teacher/School Admin updated: ${teacher.email} (${teacher._id})`);
        return teacher;
    }
    teacher = new User({
        name: TEACHER.name,
        email: TEACHER.email,
        password: DEFAULT_PASSWORD,
        role: TEACHER.role,
        schoolId: school._id,
        sector: school.sector,
        accountStatus: 'active',
    });
    await teacher.save();
    log(`✓ Created Teacher/School Admin: ${teacher.email} (${teacher._id})`);
    return teacher;
}

/**
 * Create / refresh exactly STUDENT_COUNT students linked to the cohort, each
 * with a randomized base XP and matching level.
 */
async function upsertStudents(school) {
    const results = [];
    for (let i = 1; i <= STUDENT_COUNT; i += 1) {
        const email = studentEmail(i);
        const xp = randomXp();
        const level = levelFor(xp);

        let student = await User.findOne({ email });
        if (student) {
            student.schoolId = school._id;
            student.sector = school.sector;
            student.role = 'student';
            student.xp = xp;
            student.level = level;
            await student.save();
        } else {
            student = new User({
                name: `Oak Creek Student ${i}`,
                email,
                password: DEFAULT_PASSWORD,
                role: 'student',
                schoolId: school._id,
                sector: school.sector,
                xp,
                level,
                accountStatus: 'active',
                studentProfile: { gradeLevel: 'Middle School' },
            });
            await student.save();
        }
        results.push({ email, xp, level });
    }
    log(`✓ Upserted ${results.length} students into the cohort`);
    return results;
}

/**
 * Optional teardown: remove this mock cohort + its members so the seeder can be
 * re-run from a clean slate. Scoped strictly to the mock emails / school name so
 * it can never touch real data.
 */
async function resetCohort() {
    const school = await School.findOne({ name: SCHOOL_NAME });
    const emails = [TEACHER.email];
    for (let i = 1; i <= STUDENT_COUNT; i += 1) emails.push(studentEmail(i));

    const delUsers = await User.deleteMany({ email: { $in: emails } });
    let delSchools = { deletedCount: 0 };
    if (school) {
        delSchools = await School.deleteMany({ _id: school._id });
    }
    log(`✓ Reset: removed ${delUsers.deletedCount} users and ${delSchools.deletedCount} school(s)`);
}

/**
 * The exact COHORT XP ROLLUP aggregation. This is the query a school-cohort
 * leaderboard endpoint should run to total student XP and rank cohorts.
 */
function cohortRollupPipeline(schoolId) {
    return [
        { $match: { role: 'student', schoolId: new mongoose.Types.ObjectId(schoolId) } },
        {
            $group: {
                _id: '$schoolId',
                cohortTotalXp: { $sum: '$xp' },
                studentCount: { $sum: 1 },
                averageXp: { $avg: '$xp' },
                topXp: { $max: '$xp' },
            },
        },
        {
            $lookup: {
                from: 'schools',
                localField: '_id',
                foreignField: '_id',
                as: 'school',
            },
        },
        { $unwind: '$school' },
        {
            $project: {
                _id: 0,
                schoolId: '$_id',
                schoolName: '$school.name',
                cohortTotalXp: 1,
                studentCount: 1,
                averageXp: { $round: ['$averageXp', 1] },
                topXp: 1,
            },
        },
    ];
}

async function verify(school) {
    divider();
    log('🔎 VERIFICATION — Cohort XP rollup (what a school leaderboard would show)');
    divider();

    const rollup = await User.aggregate(cohortRollupPipeline(school._id));
    if (rollup.length === 0) {
        log('⚠️  No students found for this cohort. Did the seed run?');
    } else {
        const r = rollup[0];
        log(`School:          ${r.schoolName}`);
        log(`School ID:       ${r.schoolId}`);
        log(`Student count:   ${r.studentCount}  (expected ${STUDENT_COUNT})`);
        log(`Cohort total XP: ${r.cohortTotalXp}`);
        log(`Average XP:      ${r.averageXp}`);
        log(`Top student XP:  ${r.topXp}`);
        log(r.studentCount === STUDENT_COUNT
            ? '✅ All students loaded into the cohort leaderboard.'
            : `❌ Expected ${STUDENT_COUNT} students, found ${r.studentCount}.`);
    }

    log('');
    log('Top 5 students in this cohort (individual leaderboard):');
    const top = await User.find({ role: 'student', schoolId: school._id })
        .select('name email xp level')
        .sort({ xp: -1 })
        .limit(5)
        .lean();
    top.forEach((s, idx) => {
        log(`  #${idx + 1}  ${s.email.padEnd(34)} xp=${String(s.xp).padStart(4)}  lvl=${s.level}`);
    });

    divider();
    log('📋 Paste-ready verification queries (mongosh / Compass):');
    divider();
    log(`// 1) Cohort rollup — total + rank inputs for "${school.name}"`);
    log(`db.users.aggregate([`);
    log(`  { $match: { role: "student", schoolId: ObjectId("${school._id}") } },`);
    log(`  { $group: { _id: "$schoolId", cohortTotalXp: { $sum: "$xp" }, studentCount: { $sum: 1 }, averageXp: { $avg: "$xp" } } }`);
    log(`]);`);
    log('');
    log(`// 2) Per-student leaderboard for this cohort`);
    log(`db.users.find(`);
    log(`  { role: "student", schoolId: ObjectId("${school._id}") },`);
    log(`  { name: 1, email: 1, xp: 1, level: 1 }`);
    log(`).sort({ xp: -1 });`);
    log('');
    log(`// 3) Quick count sanity check (should return ${STUDENT_COUNT})`);
    log(`db.users.countDocuments({ role: "student", schoolId: ObjectId("${school._id}") });`);
    divider();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI is not set. Add it to server/.env before running.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
    });
    log(`✅ Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    divider();

    if (RESET) {
        await resetCohort();
        divider();
    }

    if (VERIFY_ONLY) {
        const existing = await School.findOne({ name: SCHOOL_NAME });
        if (!existing) {
            log('⚠️  Cohort not found — run without --verify first to seed it.');
        } else {
            await verify(existing);
        }
        await mongoose.disconnect();
        return;
    }

    const school = await upsertSchool();
    const teacher = await upsertTeacher(school);
    const students = await upsertStudents(school);

    divider();
    log('🎓 SEED COMPLETE');
    divider();
    log(`School:            ${school.name}`);
    log(`Sector:            ${school.sector}`);
    log(`Registration code: ${school.registrationCode}   (students self-onboard with this)`);
    log(`Teacher login:     ${teacher.email}  /  ${DEFAULT_PASSWORD}`);
    log(`Students:          ${students.length}  (${studentEmail(1)} .. ${studentEmail(STUDENT_COUNT)})`);
    log(`Student password:  ${DEFAULT_PASSWORD}  (same for all mock students)`);

    await verify(school);

    await mongoose.disconnect();
    log('👋 Disconnected.');
}

main().catch(async (err) => {
    console.error('❌ Seed failed:', err);
    try {
        await mongoose.disconnect();
    } catch (_) {
        /* ignore */
    }
    process.exit(1);
});
