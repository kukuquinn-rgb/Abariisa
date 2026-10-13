/**
 * Multi-farm isolation test.
 *
 * Boots the real Express app (app.js) in-process against a THROWAWAY database,
 * registers two farms and proves neither can see or touch the other's data.
 * The Anthropic SDK is stubbed, so the AI check inspects exactly what would be
 * sent to Claude without calling the API.
 *
 * Usage (from server/):
 *   TEST_MONGO_URI="mongodb://127.0.0.1:27017/abariisa_test" npm run test:isolation
 *
 * ⚠️  The database is DROPPED at the start. The script only reads TEST_MONGO_URI
 * (never MONGO_URI) and refuses to run unless the database name contains "test".
 * Transactions are exercised when the URI points to a replica set.
 */
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'isolation-test-secret';
process.env.ANTHROPIC_API_KEY = 'stubbed';

// ── Stub the Anthropic SDK: record system prompts instead of calling the API ──
const prompts = [];
const sdkPath = require.resolve('@anthropic-ai/sdk');
require.cache[sdkPath] = {
  id: sdkPath, filename: sdkPath, loaded: true,
  exports: class FakeAnthropic {
    constructor() {
      this.messages = { create: async ({ system }) => { prompts.push(system); return { content: [{ text: 'stub answer' }] }; } };
    }
  }
};

const app = require(path.join(__dirname, '..', 'app'));
const User = require('../models/User');

const uri = process.env.TEST_MONGO_URI;
if (!uri) {
  console.error('Set TEST_MONGO_URI to a throwaway database (its name must contain "test").');
  process.exit(1);
}

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log('      ', JSON.stringify(detail).slice(0, 500));
  }
};
const section = (title) => console.log(`\n── ${title}`);

const run = async () => {
  await mongoose.connect(uri);
  const dbName = mongoose.connection.db.databaseName;
  if (!/test/i.test(dbName)) throw new Error(`Refusing to run: database "${dbName}" does not look like a test database`);
  await mongoose.connection.dropDatabase();
  for (const name of mongoose.modelNames()) await mongoose.model(name).syncIndexes();

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, body: json };
  };

  try {
    // ── Registration ─────────────────────────────────────────────────────
    section('Registration');
    let r = await call('POST', '/auth/register', null, { name: 'Mallory', email: 'mallory@x.co', password: 'secret1', role: 'admin' });
    check('POST /auth/register with role "admin" and no invite is rejected', r.status === 400, r);
    check('…and no account was created', !(await User.exists({ email: 'mallory@x.co' })));

    const A = (await call('POST', '/auth/register-farm', null, { farmName: "Kato's Farm", district: 'Mbarara', village: 'Rwanyamahembe', name: 'Kato Manager', email: 'kato@farm-a.co', password: 'secret1' })).body;
    const B = (await call('POST', '/auth/register-farm', null, { farmName: "Mugisha's Farm", district: 'Kabale', name: 'Mugisha Manager', email: 'mugisha@farm-b.co', password: 'secret1' })).body;
    check('Farm A registered; owner is its manager', A?.user?.role === 'manager' && A.user.farm?.name === "Kato's Farm", A);
    check('Farm B registered; owner is its manager', B?.user?.role === 'manager' && B.user.farm?.name === "Mugisha's Farm", B);

    const inviteWorker = async (managerToken, name, email) => {
      const invite = await call('POST', '/invites', managerToken, { role: 'worker' });
      return (await call('POST', '/auth/register', null, { name, email, password: 'secret1', inviteCode: invite.body.code, role: 'admin' })).body;
    };
    const WA = await inviteWorker(A.token, 'Akello Worker', 'akello@farm-a.co');
    const WB = await inviteWorker(B.token, 'Bwambale Worker', 'bwambale@farm-b.co');
    check("Worker joins Farm A by invite (role from invite, not body)", WA?.user?.role === 'worker' && String(WA.user.farm?.id) === String(A.user.farm.id), WA);
    check("Worker joins Farm B by invite", WB?.user?.role === 'worker' && String(WB.user.farm?.id) === String(B.user.farm.id), WB);

    // ── Livestock ────────────────────────────────────────────────────────
    section('Livestock');
    const cowA = await call('POST', '/livestock', A.token, { animalId: 'C001', species: 'Cattle' });
    const cowB = await call('POST', '/livestock', B.token, { animalId: 'C001', species: 'Cattle' });
    check('Animal "C001" added on Farm A', cowA.status === 201, cowA);
    check('Animal "C001" added on Farm B too', cowB.status === 201, cowB);
    const bCow = cowB.body._id;

    r = await call('GET', '/livestock', A.token);
    check("A's livestock list contains only A's animal", r.body.length === 1 && r.body[0]._id === cowA.body._id, r.body);
    check("A cannot read B's animal by id (404)", (await call('GET', `/livestock/${bCow}`, A.token)).status === 404);
    check("A cannot update B's animal by id (404)", (await call('PUT', `/livestock/${bCow}`, A.token, { breed: 'changed' })).status === 404);
    check("A cannot delete B's animal by id (404)", (await call('DELETE', `/livestock/${bCow}`, A.token)).status === 404);
    const bCowNow = await mongoose.connection.db.collection('livestocks').findOne({ _id: new mongoose.Types.ObjectId(bCow) });
    check("B's animal is untouched", bCowNow.breed === undefined && bCowNow.isArchived === false, bCowNow);

    // ── Tasks ────────────────────────────────────────────────────────────
    section('Tasks');
    const taskB = await call('POST', '/tasks', B.token, { title: 'Spray cattle at Mugisha', assignedTo: WB.user.id, dueDate: new Date(), priority: 'Medium' });
    check('B creates a task for its own worker', taskB.status === 201, taskB);
    const bTask = taskB.body._id;
    r = await call('GET', '/tasks', A.token);
    check("A's task list excludes B's task", !r.body.some((t) => t._id === bTask), r.body);
    check("A cannot read B's task by id (404)", (await call('GET', `/tasks/${bTask}`, A.token)).status === 404);
    check("A cannot update B's task by id (404)", (await call('PUT', `/tasks/${bTask}`, A.token, { status: 'Completed' })).status === 404);
    check("A cannot delete B's task by id (404)", (await call('DELETE', `/tasks/${bTask}`, A.token)).status === 404);
    check("A cannot assign a task to B's worker", (await call('POST', '/tasks', A.token, { title: 'x', assignedTo: WB.user.id, dueDate: new Date() })).status === 400);
    await call('POST', '/tasks', A.token, { title: 'Milk the Ankole cows', assignedTo: WA.user.id, dueDate: new Date(), priority: 'Low' });

    // ── Workers ──────────────────────────────────────────────────────────
    section('Workers');
    r = await call('GET', '/users/workers', A.token);
    check("A's worker list contains only A's worker", r.body.length === 1 && r.body[0]._id === String(WA.user.id), r.body);
    check("A cannot read B's worker by id (404)", (await call('GET', `/users/${WB.user.id}`, A.token)).status === 404);
    check("A cannot update B's worker by id (404)", (await call('PUT', `/users/${WB.user.id}`, A.token, { name: 'changed' })).status === 404);
    check("A cannot deactivate B's worker by id (404)", (await call('DELETE', `/users/${WB.user.id}`, A.token)).status === 404);
    const wbNow = await User.findById(WB.user.id);
    check("B's worker is untouched", wbNow.isActive && wbNow.name === 'Bwambale Worker');

    // ── AI assistant ─────────────────────────────────────────────────────
    section('AI assistant (Anthropic stubbed; checks the context sent to Claude)');
    await call('POST', '/attendance/checkin', WB.token);
    r = await call('POST', '/ai', A.token, { question: 'Summarise my farm' });
    const promptA = prompts.pop() || '';
    check('AI request for A succeeds', r.status === 200, r);
    check("A's context names Farm A, its worker, animal and task", promptA.includes("Kato's Farm") && promptA.includes('Akello Worker') && promptA.includes('C001') && promptA.includes('LIVESTOCK (1 total)'), promptA);
    check("A's context contains nothing from Farm B", !/Mugisha|Bwambale|Spray cattle/.test(promptA), promptA);
    await call('POST', '/ai', WA.token, { question: 'What are my tasks?' });
    const promptWA = prompts.pop() || '';
    check("A's worker context contains nothing from Farm B", !/Mugisha|Bwambale|Spray cattle/.test(promptWA), promptWA);

    // ── Accounts without a farm ──────────────────────────────────────────
    section('Accounts without a farm');
    const pending = await User.create({ name: 'Pending Google', email: 'pending@x.co', password: 'secret1', role: 'worker', needsOnboarding: true });
    r = await call('GET', '/livestock', jwt.sign({ id: pending._id }, process.env.JWT_SECRET));
    check('A user without a farm gets 403 + needsOnboarding on farm data', r.status === 403 && r.body?.needsOnboarding === true, r);
  } finally {
    server.close();
  }

  console.log(failures ? `\n❌ ${failures} check(s) failed` : '\n✅ All isolation checks passed');
  await mongoose.disconnect();
  process.exit(failures ? 1 : 0);
};

run().catch(async (err) => {
  console.error('❌ Test run failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
