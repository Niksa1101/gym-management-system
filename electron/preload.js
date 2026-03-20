const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Members
  getMembers: () => ipcRenderer.invoke('members:getAll'),
  searchMembers: (query) => ipcRenderer.invoke('members:search', query),
  getMember: (id) => ipcRenderer.invoke('members:getById', id),
  createMember: (data) => ipcRenderer.invoke('members:create', data),
  updateMember: (id, data) => ipcRenderer.invoke('members:update', id, data),
  deleteMember: (id) => ipcRenderer.invoke('members:delete', id),

  // Memberships
  getMemberships: (memberId) => ipcRenderer.invoke('memberships:getByMemberId', memberId),
  getActiveMembership: (memberId) => ipcRenderer.invoke('memberships:getActive', memberId),
  createMembership: (data) => ipcRenderer.invoke('memberships:create', data),
  updateMembership: (id, data) => ipcRenderer.invoke('memberships:update', id, data),
  deactivateMembership: (id) => ipcRenderer.invoke('memberships:deactivate', id),
  pauseMembership: (id) => ipcRenderer.invoke('memberships:pause', id),
  resumeMembership: (id) => ipcRenderer.invoke('memberships:resume', id),

  // Attendance
  getAttendanceByDate: (date) => ipcRenderer.invoke('attendance:getByDate', date),
  getAttendanceByMembership: (membershipId) => ipcRenderer.invoke('attendance:getByMembership', membershipId),
  checkIn: (data) => ipcRenderer.invoke('attendance:checkIn', data),
  deleteAttendance: (id) => ipcRenderer.invoke('attendance:delete', id),

  // Payments
  createPayment: (data) => ipcRenderer.invoke('payments:create', data),
  getPayments: (startDate, endDate) => ipcRenderer.invoke('payments:get', startDate, endDate),
  deletePayment: (id) => ipcRenderer.invoke('payments:delete', id),

  // Lost key
  getLastLockerUser: (lockerKey) => ipcRenderer.invoke('locker:lastUser', lockerKey),
});
