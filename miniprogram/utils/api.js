const { get, post, put, del } = require('./request.js')

function wxLogin(code, nickName, avatarUrl, gender) {
  return post('/auth/wx/login', {
    code,
    nickName,
    avatarUrl,
    gender
  }, false)
}

function adminLogin(username, password) {
  return post('/auth/admin/login', {
    username,
    password
  }, false)
}

function getCurrentUser() {
  return get('/auth/current')
}

function refreshToken() {
  return post('/auth/refresh')
}

function getPreferredMember() {
  return get('/auth/preferred-member')
}

function getBindableMembers() {
  return get('/auth/bindable-members')
}

function requestPreferredMemberBinding(memberId) {
  return post('/auth/preferred-member/request', { memberId })
}

function setPreferredMember(memberId) {
  return put('/auth/preferred-member', { memberId })
}

function bindExternalSpousePreferredMember(ownerMemberId, spouseName) {
  return post('/auth/preferred-member/external-spouse', {
    ownerMemberId,
    spouseName
  })
}

function getMemberList() {
  return get('/member/list')
}

function searchMembers(keyword) {
  return post('/member/search', { keyword })
}

function getMemberDetail(id) {
  return get(`/member/${id}`)
}

function createMember(data) {
  return post('/member', data)
}

function updateMember(id, data) {
  return put(`/member/${id}`, data)
}

function deleteMember(id) {
  return del(`/member/${id}`)
}

function getChildren(id) {
  return get(`/member/${id}/children`)
}

function getParents(id) {
  return get(`/member/${id}/parents`)
}

function getFamilyTree() {
  return get('/member/tree')
}

function getPendingAudits() {
  return get('/audit/pending')
}

function getFamilyEventSubscriptionStatus() {
  return get('/notify/family-event/subscription/status')
}

function acceptFamilyEventSubscription(data) {
  return post('/notify/family-event/subscription/accept', data)
}

function getPublicFamilyEventNotifications(params = {}) {
  return get('/notify/family-event/notifications', params)
}

function getPublicFamilyEventNotification(id) {
  return get(`/notify/family-event/notifications/${id}`)
}

function createFamilyEventNotification(data) {
  return post('/admin/family-event-notifications', data)
}

function updateFamilyEventNotification(id, data) {
  return put(`/admin/family-event-notifications/${id}`, data)
}

function sendFamilyEventNotification(id) {
  return post(`/admin/family-event-notifications/${id}/send`, {})
}

function deleteFamilyEventNotification(id) {
  return del(`/admin/family-event-notifications/${id}`)
}

function getFamilyEventNotificationHistory() {
  return get('/admin/family-event-notifications/history')
}

function getAdminUsers(params = {}) {
  return get('/admin/users', params)
}

function updateAdminUserRole(id, role) {
  return put(`/admin/user/${id}/role`, { role })
}

function getAdminUserBindingDetail(id) {
  return get(`/admin/user/${id}/binding`)
}

function getAdminUserBindableMembers(id, params = {}) {
  return get(`/admin/user/${id}/bindable-members`, params)
}

function updateAdminUserPreferredMember(id, memberId) {
  return put(`/admin/user/${id}/preferred-member`, { memberId })
}

function auditMember(id, status, remark) {
  return post(`/audit/member/${id}`, {
    status,
    remark
  })
}

function auditIdentityBinding(id, status, remark) {
  return post(`/audit/identity-binding/${id}`, {
    status,
    remark
  })
}

function getAuditHistory(memberId = null) {
  const url = memberId ? `/audit/history?memberId=${memberId}` : '/audit/history'
  return get(url)
}

function submitAudit(memberData) {
  return post('/audit/submit', memberData)
}

function getMigrationTimeline() {
  return get('/migration/timeline')
}

function addMigrationTimeline(data) {
  return post('/migration/add', data)
}

function updateMigrationTimeline(data) {
  return put('/migration/update', data)
}

function deleteMigrationTimeline(id) {
  return del(`/migration/delete/${id}`)
}

function getGalleryHome() {
  return get('/gallery/home', {}, false)
}

function submitGallery(data) {
  return post('/gallery/upload', data)
}

function getPendingGallery() {
  return get('/gallery/pending')
}

function reviewGallery(id, status, remark) {
  return post(`/gallery/review/${id}`, {
    status,
    remark
  })
}

function updateGallerySort(id, sortOrder) {
  return post(`/gallery/sort/${id}`, {
    sortOrder
  })
}

function getMyGallery() {
  return get('/gallery/mine')
}

function deleteGallery(id) {
  return del(`/gallery/${id}`)
}

function uploadAvatar(filePath) {
  return uploadFile('/upload/avatar', filePath)
}

function uploadGalleryImage(filePath) {
  return uploadFile('/upload/gallery', filePath)
}

function uploadFile(path, filePath, extraFormData = {}) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    const app = getApp()
    const baseUrl = app && app.globalData && app.globalData.baseUrl
      ? app.globalData.baseUrl
      : 'http://localhost:8080/api'

    wx.uploadFile({
      url: `${baseUrl}${path}`,
      filePath,
      name: 'file',
      formData: extraFormData,
      header: {
        Authorization: `Bearer ${token}`
      },
      success: (res) => {
        let data = null
        try {
          data = JSON.parse(res.data)
        } catch (error) {
          reject(error)
          return
        }

        if (data.code === 200 && data.data && data.data.url) {
          resolve(data.data.url)
          return
        }

        wx.showToast({
          title: data.message || '上传失败',
          icon: 'none'
        })
        reject(new Error(data.message || '上传失败'))
      },
      fail: (err) => {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

module.exports = {
  wxLogin,
  adminLogin,
  getCurrentUser,
  refreshToken,
  getPreferredMember,
  getBindableMembers,
  requestPreferredMemberBinding,
  setPreferredMember,
  bindExternalSpousePreferredMember,
  getMemberList,
  searchMembers,
  getMemberDetail,
  createMember,
  updateMember,
  deleteMember,
  getChildren,
  getParents,
  getFamilyTree,
  getPendingAudits,
  getFamilyEventSubscriptionStatus,
  acceptFamilyEventSubscription,
  getPublicFamilyEventNotifications,
  getPublicFamilyEventNotification,
  createFamilyEventNotification,
  updateFamilyEventNotification,
  sendFamilyEventNotification,
  deleteFamilyEventNotification,
  getFamilyEventNotificationHistory,
  getAdminUsers,
  updateAdminUserRole,
  getAdminUserBindingDetail,
  getAdminUserBindableMembers,
  updateAdminUserPreferredMember,
  auditMember,
  auditIdentityBinding,
  getAuditHistory,
  submitAudit,
  getMigrationTimeline,
  addMigrationTimeline,
  updateMigrationTimeline,
  deleteMigrationTimeline,
  getGalleryHome,
  submitGallery,
  getPendingGallery,
  reviewGallery,
  updateGallerySort,
  getMyGallery,
  deleteGallery,
  uploadAvatar,
  uploadGalleryImage
}
