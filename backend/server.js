// ============================================
// UniClub — Node.js/Express Backend API
// ============================================
// Run: npm install && node server.js
// Requires: npm install express mysql2 bcrypt jsonwebtoken cors dotenv

require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'uniclub_secret_change_in_production';

app.use(cors());
app.use(express.json());

// ── DB POOL ──
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'uniclub',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── AUTH MIDDLEWARE ──
function authMiddleware(role) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (role && decoded.role !== role) return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// ============================================
// AUTH ROUTES
// ============================================

// POST /auth/admin/login
app.post('/auth/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, rows[0].password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: rows[0].id, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// POST /auth/club/login
app.post('/auth/club/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, rows[0].password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: rows[0].id, clubId: rows[0].club_id, role: 'head' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, clubId: rows[0].club_id, credsChanged: !!rows[0].creds_changed });
});

// ============================================
// APPLICATIONS
// ============================================

// POST /applications — submit new application
app.post('/applications', async (req, res) => {
  const d = req.body;
  const id = 'app' + Date.now();
  const today = new Date().toISOString().split('T')[0];
  try {
    const [exists] = await pool.query('SELECT id FROM applications WHERE LOWER(club_name)=LOWER(?)', [d.clubName]);
    if (exists.length) return res.status(409).json({ error: 'Club name already exists' });
    await pool.query(
      `INSERT INTO applications (id,contact_name,email,club_name,category,description,members,majors,
        female_pct,pres_year,treasurer,advisor,advisor_email,constitution,meetings_per_month,submitted_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,d.contactName,d.email,d.clubName,d.category,d.desc,d.members,d.majors,
       d.female,d.presYear,d.treasurer,d.advisor,d.advEmail,d.constitution,d.meetings,today]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /applications — list all (admin)
app.get('/applications', authMiddleware('admin'), async (req, res) => {
  const { status, q } = req.query;
  let sql = 'SELECT * FROM applications WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (q) { sql += ' AND (club_name LIKE ? OR contact_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY submitted_date DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /applications/:id
app.get('/applications/:id', authMiddleware('admin'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// POST /applications/:id/approve — admin assigns creds and approves
app.post('/applications/:id/approve', authMiddleware('admin'), async (req, res) => {
  const { username, password } = req.body;
  const appId = req.params.id;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length) return res.status(409).json({ error: 'Username already taken' });

  const [appRows] = await pool.query('SELECT * FROM applications WHERE id = ?', [appId]);
  if (!appRows.length) return res.status(404).json({ error: 'Application not found' });
  const application = appRows[0];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const clubId = 'c' + Date.now();
    await conn.query(
      'INSERT INTO clubs (id,app_id,name,category,status,head_user) VALUES (?,?,?,?,?,?)',
      [clubId, appId, application.club_name, application.category, 'active', username]
    );
    const passwordHash = await bcrypt.hash(password, 10);
    await conn.query(
      'INSERT INTO users (username,password_hash,club_id) VALUES (?,?,?)',
      [username, passwordHash, clubId]
    );
    await conn.query(
      'INSERT INTO members (club_id,name,role,is_head) VALUES (?,?,?,1)',
      [clubId, application.contact_name, 'Club Head']
    );
    await conn.query(
      'UPDATE applications SET status=?, assigned_user=?, assigned_pass=?, decided_at=NOW() WHERE id=?',
      ['approved', username, password, appId]
    );
    await conn.commit();
    res.json({ success: true, clubId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST /applications/:id/reject
app.post('/applications/:id/reject', authMiddleware('admin'), async (req, res) => {
  await pool.query(
    'UPDATE applications SET status=?, decided_at=NOW() WHERE id=?',
    ['rejected', req.params.id]
  );
  res.json({ success: true });
});

// ============================================
// CLUBS
// ============================================

// GET /clubs — all clubs (admin)
app.get('/clubs', authMiddleware('admin'), async (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT c.*, a.assigned_pass, a.contact_name FROM clubs c JOIN applications a ON c.app_id=a.id WHERE 1=1';
  const params = [];
  if (q) { sql += ' AND c.name LIKE ?'; params.push(`%${q}%`); }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /clubs/:id — club details
app.get('/clubs/:id', authMiddleware(), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT c.*, a.* FROM clubs c JOIN applications a ON c.app_id=a.id WHERE c.id=?',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// PATCH /clubs/:id/status — toggle active/inactive (admin)
app.patch('/clubs/:id/status', authMiddleware('admin'), async (req, res) => {
  const [rows] = await pool.query('SELECT status FROM clubs WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const newStatus = rows[0].status === 'active' ? 'inactive' : 'active';
  await pool.query('UPDATE clubs SET status=? WHERE id=?', [newStatus, req.params.id]);
  res.json({ success: true, status: newStatus });
});

// ============================================
// MEMBERS
// ============================================

// GET /clubs/:id/members
app.get('/clubs/:id/members', authMiddleware(), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM members WHERE club_id=? ORDER BY is_head DESC, joined_at ASC', [req.params.id]);
  res.json(rows);
});

// POST /clubs/:id/members
app.post('/clubs/:id/members', authMiddleware('head'), async (req, res) => {
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (req.user.clubId !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  await pool.query('INSERT INTO members (club_id,name,role) VALUES (?,?,?)', [req.params.id, name, role || 'Member']);
  res.json({ success: true });
});

// DELETE /clubs/:clubId/members/:memberId
app.delete('/clubs/:clubId/members/:memberId', authMiddleware('head'), async (req, res) => {
  if (req.user.clubId !== req.params.clubId) return res.status(403).json({ error: 'Forbidden' });
  await pool.query('DELETE FROM members WHERE id=? AND club_id=? AND is_head=0', [req.params.memberId, req.params.clubId]);
  res.json({ success: true });
});

// ============================================
// EVENTS
// ============================================

// GET /clubs/:id/events
app.get('/clubs/:id/events', authMiddleware(), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM events WHERE club_id=? ORDER BY event_date ASC', [req.params.id]);
  res.json(rows);
});

// POST /clubs/:id/events
app.post('/clubs/:id/events', authMiddleware('head'), async (req, res) => {
  const { name, date } = req.body;
  if (!name) return res.status(400).json({ error: 'Event name required' });
  if (req.user.clubId !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  await pool.query('INSERT INTO events (club_id,name,event_date) VALUES (?,?,?)', [req.params.id, name, date || null]);
  res.json({ success: true });
});

// DELETE /clubs/:clubId/events/:eventId
app.delete('/clubs/:clubId/events/:eventId', authMiddleware('head'), async (req, res) => {
  if (req.user.clubId !== req.params.clubId) return res.status(403).json({ error: 'Forbidden' });
  await pool.query('DELETE FROM events WHERE id=? AND club_id=?', [req.params.eventId, req.params.clubId]);
  res.json({ success: true });
});

// ============================================
// RULES
// ============================================

// GET /rules — all rules (public, so form can fetch them)
app.get('/rules', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM rules ORDER BY id');
  res.json(rows);
});

// POST /rules — add custom rule (admin)
app.post('/rules', authMiddleware('admin'), async (req, res) => {
  const { id, category, name, condition_text, message, english_sentence } = req.body;
  if (!id || !category || !name || !condition_text || !message) return res.status(400).json({ error: 'All fields required' });
  await pool.query(
    'INSERT INTO rules (id,category,name,condition_text,message,english_sentence,is_custom) VALUES (?,?,?,?,?,?,1)',
    [id, category, name, condition_text, message, english_sentence || null]
  );
  res.json({ success: true });
});

// DELETE /rules/:id — remove rule (admin)
app.delete('/rules/:id', authMiddleware('admin'), async (req, res) => {
  await pool.query('DELETE FROM rules WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================
// USER SETTINGS
// ============================================

// PATCH /users/credentials — change username+password (head, once only)
app.patch('/users/credentials', authMiddleware('head'), async (req, res) => {
  const { newUsername, newPassword } = req.body;
  if (!newUsername || !newPassword) return res.status(400).json({ error: 'Both fields required' });

  const [userRows] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!userRows.length) return res.status(404).json({ error: 'User not found' });
  if (userRows[0].creds_changed) return res.status(403).json({ error: 'Credentials can only be changed once' });

  const [existing] = await pool.query('SELECT id FROM users WHERE username=? AND id!=?', [newUsername, req.user.id]);
  if (existing.length) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET username=?,password_hash=?,creds_changed=1 WHERE id=?', [newUsername, hash, req.user.id]);
  await pool.query('UPDATE clubs SET head_user=?,creds_changed=1 WHERE id=?', [newUsername, req.user.clubId]);
  res.json({ success: true });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => console.log(`UniClub API running on port ${PORT}`));
