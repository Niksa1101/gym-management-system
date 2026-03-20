const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
let dbPath;

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  dbPath = path.join(app.getPath('userData'), 'gym.db');

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      phone TEXT,
      discount_eligible INTEGER DEFAULT 0,
      discount_category TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      membership_type TEXT NOT NULL,
      membership_category TEXT NOT NULL,
      sessions_total INTEGER,
      sessions_used INTEGER DEFAULT 0,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      membership_id INTEGER,
      date TEXT NOT NULL,
      locker_key TEXT,
      visit_type TEXT NOT NULL,
      session_counted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (membership_id) REFERENCES memberships(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      member_name TEXT NOT NULL,
      date TEXT NOT NULL,
      membership_type TEXT,
      membership_category TEXT,
      amount INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
  `);

  save();
}

// ── Persistence ───────────────────────────────────────────────────────────────

function save() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// ── Query helpers ─────────────────────────────────────────────────────────────

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function run(sql, params = []) {
  db.run(sql, params);
}

function lastId() {
  const res = db.exec('SELECT last_insert_rowid()');
  return res[0].values[0][0];
}

// ── Members ──────────────────────────────────────────────────────────────────

function getAllMembers() {
  return all(`
    SELECT m.*,
      ms.id as membership_id,
      ms.membership_type, ms.membership_category,
      ms.expiry_date, ms.sessions_used, ms.sessions_total,
      ms.start_date, ms.is_active
    FROM members m
    LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.is_active = 1
    ORDER BY m.surname, m.name
  `);
}

function searchMembers(query) {
  const q = `%${query}%`;
  return all(`
    SELECT m.*,
      ms.id as membership_id,
      ms.membership_type, ms.membership_category,
      ms.expiry_date, ms.sessions_used, ms.sessions_total,
      ms.start_date, ms.is_active
    FROM members m
    LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.is_active = 1
    WHERE m.name LIKE ? OR m.surname LIKE ? OR CAST(m.id AS TEXT) LIKE ?
    ORDER BY m.surname, m.name
    LIMIT 20
  `, [q, q, q]);
}

function getMemberById(id) {
  return get(`SELECT * FROM members WHERE id = ?`, [id]);
}

function createMember(data) {
  run(
    `INSERT INTO members (name, surname, phone, discount_eligible, discount_category, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.name, data.surname, data.phone || null, data.discount_eligible ? 1 : 0,
     data.discount_category || null, data.notes || null]
  );
  const id = lastId();
  save();
  return { id };
}

function updateMember(id, data) {
  run(
    `UPDATE members SET name=?, surname=?, phone=?, discount_eligible=?, discount_category=?, notes=?
     WHERE id=?`,
    [data.name, data.surname, data.phone || null, data.discount_eligible ? 1 : 0,
     data.discount_category || null, data.notes || null, id]
  );
  save();
  return getMemberById(id);
}

function deleteMember(id) {
  run(`DELETE FROM attendance WHERE member_id = ?`, [id]);
  run(`DELETE FROM memberships WHERE member_id = ?`, [id]);
  run(`DELETE FROM payments WHERE member_id = ?`, [id]);
  run(`DELETE FROM members WHERE id = ?`, [id]);
  save();
  return { success: true };
}

// ── Memberships ───────────────────────────────────────────────────────────────

function getMembershipsByMemberId(memberId) {
  return all(
    `SELECT ms.* FROM memberships ms WHERE ms.member_id = ? ORDER BY ms.created_at DESC`,
    [memberId]
  );
}

function getActiveMembership(memberId) {
  return get(
    `SELECT * FROM memberships WHERE member_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
    [memberId]
  );
}

function createMembership(data) {
  run(`UPDATE memberships SET is_active = 0 WHERE member_id = ? AND is_active = 1`, [data.member_id]);
  run(
    `INSERT INTO memberships (member_id, membership_type, membership_category, sessions_total, sessions_used, start_date, expiry_date, is_active)
     VALUES (?, ?, ?, ?, 0, ?, ?, 1)`,
    [data.member_id, data.membership_type, data.membership_category,
     data.sessions_total || null, data.start_date, data.expiry_date]
  );
  const id = lastId();
  save();
  return { id };
}

function updateMembership(id, data) {
  run(
    `UPDATE memberships SET membership_type=?, membership_category=?, sessions_total=?, sessions_used=?,
     start_date=?, expiry_date=?, is_active=? WHERE id=?`,
    [data.membership_type, data.membership_category, data.sessions_total, data.sessions_used,
     data.start_date, data.expiry_date, data.is_active ? 1 : 0, id]
  );
  save();
  return { success: true };
}

function deactivateMembership(id) {
  run(`UPDATE memberships SET is_active = 0 WHERE id = ?`, [id]);
  save();
  return { success: true };
}

// ── Attendance ────────────────────────────────────────────────────────────────

function getAttendanceByDate(date) {
  return all(`
    SELECT a.*, m.name, m.surname,
      ms.membership_type, ms.membership_category
    FROM attendance a
    JOIN members m ON a.member_id = m.id
    LEFT JOIN memberships ms ON a.membership_id = ms.id
    WHERE a.date = ?
    ORDER BY a.created_at DESC
  `, [date]);
}

function getAttendanceByMembershipId(membershipId) {
  return all(
    `SELECT * FROM attendance WHERE membership_id = ? ORDER BY date ASC`,
    [membershipId]
  );
}

function checkIn(data) {
  const { member_id, membership_id, date, locker_key, visit_type } = data;
  let session_counted = 0;

  if (visit_type === 'session' && membership_id) {
    const membership = get(`SELECT * FROM memberships WHERE id = ?`, [membership_id]);
    if (membership && membership.sessions_total) {
      session_counted = 1;
      const newUsed = membership.sessions_used + 1;
      run(`UPDATE memberships SET sessions_used = ? WHERE id = ?`, [newUsed, membership_id]);
      if (newUsed >= membership.sessions_total) {
        run(`UPDATE memberships SET is_active = 0 WHERE id = ?`, [membership_id]);
      }
    }
  }

  run(
    `INSERT INTO attendance (member_id, membership_id, date, locker_key, visit_type, session_counted)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [member_id, membership_id || null, date, locker_key || null, visit_type, session_counted]
  );

  const id = lastId();
  save();
  return { id, success: true };
}

function deleteAttendance(id) {
  const record = get(`SELECT * FROM attendance WHERE id = ?`, [id]);

  if (record && record.session_counted && record.membership_id) {
    const membership = get(`SELECT * FROM memberships WHERE id = ?`, [record.membership_id]);
    if (membership) {
      const newUsed = Math.max(0, membership.sessions_used - 1);
      const reactivate = (!membership.is_active && membership.sessions_total && newUsed < membership.sessions_total)
        ? 1 : membership.is_active;
      run(`UPDATE memberships SET sessions_used = ?, is_active = ? WHERE id = ?`,
        [newUsed, reactivate, record.membership_id]);
    }
  }

  run(`DELETE FROM attendance WHERE id = ?`, [id]);
  save();
  return { success: true };
}

// ── Payments ──────────────────────────────────────────────────────────────────

function createPayment(data) {
  run(
    `INSERT INTO payments (member_id, member_name, date, membership_type, membership_category, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.member_id || null,
      data.member_name,
      data.date,
      data.membership_type || null,
      data.membership_category || null,
      data.amount,
      data.notes || null,
    ]
  );
  const id = lastId();
  save();
  return { id, success: true };
}

function getPayments(startDate, endDate) {
  return all(`
    SELECT p.*
    FROM payments p
    WHERE p.date >= ? AND p.date <= ?
    ORDER BY p.date DESC, p.created_at DESC
  `, [startDate, endDate]);
}

function deletePayment(id) {
  run(`DELETE FROM payments WHERE id = ?`, [id]);
  save();
  return { success: true };
}

// ── Lost Key ──────────────────────────────────────────────────────────────────

function getLastLockerUser(lockerKey) {
  return get(`
    SELECT a.date, a.locker_key, m.name, m.surname, m.phone
    FROM attendance a
    JOIN members m ON a.member_id = m.id
    WHERE a.locker_key = ?
    ORDER BY a.created_at DESC
    LIMIT 1
  `, [lockerKey]);
}

module.exports = {
  init,
  getAllMembers,
  searchMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMembershipsByMemberId,
  getActiveMembership,
  createMembership,
  updateMembership,
  deactivateMembership,
  getAttendanceByDate,
  getAttendanceByMembershipId,
  checkIn,
  deleteAttendance,
  createPayment,
  getPayments,
  deletePayment,
  getLastLockerUser,
};
