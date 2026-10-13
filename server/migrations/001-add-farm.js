/**
 * Migration 001 — move single-tenant data into one farm.
 *
 * - Creates "Abariisa Demo Farm" owned by the oldest existing manager (once).
 * - Sets `farm` on every manager/worker and on every document in the
 *   farm-owned collections that doesn't have one yet.
 * - Replaces the global unique index on livestock.animalId with a per-farm
 *   one, and SystemConfig's unique `key` with a per-farm { key, farm } index.
 *
 * Idempotent: only touches documents without a farm, and index changes are
 * skipped when already applied. Safe to run again (e.g. right after deploy, to
 * catch anything the old backend wrote in between).
 *
 * Usage (from server/):
 *   node migrations/001-add-farm.js [district] [--dry-run]
 *   node migrations/001-add-farm.js Mbarara --dry-run   # report only, write nothing
 *
 * Uses MONGO_URI from server/.env (same as config/db.js) unless already set.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// Use raw collections only — no model validation, and no automatic index builds
// against half-migrated data.
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const FARM_NAME = 'Abariisa Demo Farm';
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DISTRICT = args.find((a) => !a.startsWith('--')) || 'Mbarara';

// Collections whose documents belong to a farm (Mongoose default collection names).
const FARM_OWNED = ['livestocks', 'tasks', 'attendances', 'leaves', 'workplans', 'trustscores', 'notifications', 'invites'];

const missingFarm = { $or: [{ farm: { $exists: false } }, { farm: null }] };

const log = (...m) => console.log(DRY_RUN ? '[dry-run]' : '', ...m);

const hasIndex = async (collection, name) => {
  try {
    return (await collection.indexes()).some((i) => i.name === name);
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') return false;
    throw err;
  }
};

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (server/.env)');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  log(`Connected to ${mongoose.connection.host}/${db.databaseName}`);

  // ── 1. The farm ────────────────────────────────────────────────────────
  const users = db.collection('users');
  const farms = db.collection('farms');

  let farm = await farms.findOne({ name: FARM_NAME });
  if (farm) {
    log(`Farm exists: "${farm.name}" (${farm._id}) — reusing it`);
  } else {
    const owner = await users.find({ role: 'manager' }).sort({ createdAt: 1, _id: 1 }).limit(1).next();
    if (!owner) {
      const unlinked = await users.countDocuments({ role: { $in: ['manager', 'worker'] }, ...missingFarm });
      if (unlinked === 0) {
        log('No managers and no unlinked users — nothing to migrate.');
        await mongoose.disconnect();
        return;
      }
      throw new Error(`Found ${unlinked} manager/worker accounts without a farm but no manager to own "${FARM_NAME}". Promote one user to manager and re-run.`);
    }
    const now = new Date();
    farm = {
      _id: new mongoose.Types.ObjectId(),
      name: FARM_NAME,
      district: DISTRICT,
      owner: owner._id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      __v: 0
    };
    if (!DRY_RUN) await farms.insertOne(farm);
    log(`Created farm "${FARM_NAME}" (district ${DISTRICT}) owned by ${owner.name} <${owner.email}>`);
  }

  // ── 2. Users ───────────────────────────────────────────────────────────
  const userFilter = { role: { $in: ['manager', 'worker'] }, ...missingFarm };
  const userCount = await users.countDocuments(userFilter);
  if (!DRY_RUN && userCount) {
    // Existing accounts are fully onboarded members of the demo farm.
    await users.updateMany(userFilter, { $set: { farm: farm._id, needsOnboarding: false } });
  }
  log(`users (manager/worker): ${userCount} linked to the farm`);

  // ── 3. Farm-owned collections ──────────────────────────────────────────
  const totals = { users: userCount };
  for (const name of FARM_OWNED) {
    const col = db.collection(name);
    const count = await col.countDocuments(missingFarm);
    if (!DRY_RUN && count) await col.updateMany(missingFarm, { $set: { farm: farm._id } });
    totals[name] = count;
    log(`${name}: ${count} document(s) stamped`);
  }

  // ── 4. Indexes ─────────────────────────────────────────────────────────
  const livestock = db.collection('livestocks');
  if (await hasIndex(livestock, 'animalId_1')) {
    if (!DRY_RUN) await livestock.dropIndex('animalId_1');
    log('livestocks: dropped global unique index animalId_1');
  } else {
    log('livestocks: global animalId_1 index already gone');
  }
  if (!DRY_RUN) {
    await livestock.createIndex({ farm: 1, animalId: 1 }, { unique: true, name: 'farm_1_animalId_1' });
  }
  log('livestocks: ensured unique index { farm, animalId }');

  const configs = db.collection('systemconfigs');
  if (await hasIndex(configs, 'key_1')) {
    if (!DRY_RUN) await configs.dropIndex('key_1');
    log('systemconfigs: dropped global unique index key_1 (existing values become the platform default)');
  }
  if (!DRY_RUN) await configs.createIndex({ key: 1, farm: 1 }, { unique: true, name: 'key_1_farm_1' });
  log('systemconfigs: ensured unique index { key, farm }');

  if (!DRY_RUN) {
    for (const name of ['users', ...FARM_OWNED]) {
      await db.collection(name).createIndex({ farm: 1 }, { name: 'farm_1' });
    }
  }
  log('ensured { farm } index on users and all farm-owned collections');

  // ── 5. Verify ──────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    const leftovers = {};
    leftovers.users = await users.countDocuments(userFilter);
    for (const name of FARM_OWNED) leftovers[name] = await db.collection(name).countDocuments(missingFarm);
    const remaining = Object.entries(leftovers).filter(([, n]) => n > 0);
    if (remaining.length) throw new Error(`Documents still without a farm: ${JSON.stringify(Object.fromEntries(remaining))}`);
  }

  console.log('\nSummary (documents updated):');
  console.table(totals);
  console.log(DRY_RUN ? 'Dry run — nothing was written.' : `✅ Migration complete. Farm id: ${farm._id}`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('❌ Migration failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
