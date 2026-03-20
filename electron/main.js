const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Gym Management System',
    backgroundColor: '#f8fafc',
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await db.init();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Members ──────────────────────────────────────────────────────────────────
ipcMain.handle('members:getAll', () => db.getAllMembers());
ipcMain.handle('members:search', (_, query) => db.searchMembers(query));
ipcMain.handle('members:getById', (_, id) => db.getMemberById(id));
ipcMain.handle('members:create', (_, data) => db.createMember(data));
ipcMain.handle('members:update', (_, id, data) => db.updateMember(id, data));
ipcMain.handle('members:delete', (_, id) => db.deleteMember(id));

// ── Memberships ───────────────────────────────────────────────────────────────
ipcMain.handle('memberships:getByMemberId', (_, memberId) => db.getMembershipsByMemberId(memberId));
ipcMain.handle('memberships:getActive', (_, memberId) => db.getActiveMembership(memberId));
ipcMain.handle('memberships:create', (_, data) => db.createMembership(data));
ipcMain.handle('memberships:update', (_, id, data) => db.updateMembership(id, data));
ipcMain.handle('memberships:deactivate', (_, id) => db.deactivateMembership(id));

// ── Attendance ────────────────────────────────────────────────────────────────
ipcMain.handle('attendance:getByDate', (_, date) => db.getAttendanceByDate(date));
ipcMain.handle('attendance:getByMembership', (_, membershipId) => db.getAttendanceByMembershipId(membershipId));
ipcMain.handle('attendance:checkIn', (_, data) => db.checkIn(data));
ipcMain.handle('attendance:delete', (_, id) => db.deleteAttendance(id));

// ── Payments ──────────────────────────────────────────────────────────────────
ipcMain.handle('payments:create', (_, data) => db.createPayment(data));
ipcMain.handle('payments:get', (_, startDate, endDate) => db.getPayments(startDate, endDate));
ipcMain.handle('payments:delete', (_, id) => db.deletePayment(id));

// ── Lost key ──────────────────────────────────────────────────────────────────
ipcMain.handle('locker:lastUser', (_, lockerKey) => db.getLastLockerUser(lockerKey));
