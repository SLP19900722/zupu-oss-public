const { getEnv, getBaseUrl, setEnv } = require('./utils/env.js')

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key)
}

App({
  globalData: {
    env: getEnv(),
    baseUrl: getBaseUrl(),

    userInfo: null,
    token: null,
    isAdmin: false,
    isSuperAdmin: false,
    isMember: true,

    preferredMemberId: null,
    preferredMemberName: '',
    displayMemberId: null,
    displayMemberName: '',
    identityType: null,
    preferredMemberVisible: false,
    spouseOwnerMemberId: null,
    spouseOwnerMemberName: '',

    bindingStatus: 'NONE',
    readOnlyMode: false,
    readOnlyReason: '',
    pendingMemberId: null,
    pendingMemberName: '',
    pendingDisplayMemberId: null,
    pendingDisplayMemberName: '',
    bindingRemark: '',

    currentUserLoaded: false,
    currentUserLoading: false,
    lastCurrentUserRefreshAt: 0,

    identityMetaLoaded: false,
    identityMetaLoading: false,
    lastIdentityRefreshAt: 0,

    __authRedirecting: false
  },

  setEnv(env) {
    const ok = setEnv(env)
    if (ok) {
      this.globalData.env = env
      this.globalData.baseUrl = getBaseUrl()
    }
    return ok
  },

  onLaunch() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    const isMember = wx.getStorageSync('isMember')

    if (!token || !userInfo) {
      return
    }

    this.globalData.token = token
    const normalizedUser = this.syncCurrentUserInfo(userInfo, {
      loaded: false,
      persist: false
    })

    const inferredMember = this.globalData.isAdmin
      || !!normalizeId(normalizedUser.preferredMemberId)
      || normalizedUser.bindingStatus === 'PENDING'

    this.globalData.isMember = typeof isMember === 'boolean' ? isMember : inferredMember
    this.globalData.currentUserLoaded = false
    this.globalData.currentUserLoading = false
    this.globalData.lastCurrentUserRefreshAt = 0
    this.globalData.identityMetaLoaded = false
    this.globalData.identityMetaLoading = false
    this.globalData.lastIdentityRefreshAt = 0
    this.setIdentityMeta(normalizedUser, { loaded: false })
  },

  onShow() {
    if (!this.checkLogin()) {
      return
    }

    this.refreshCurrentUser({
      minInterval: 3000
    }).catch(() => null)
  },

  saveLoginInfo(token, userInfo) {
    this.globalData.token = token
    const normalizedUser = this.syncCurrentUserInfo(userInfo, {
      loaded: false
    })
    this.globalData.currentUserLoaded = false
    this.globalData.currentUserLoading = false
    this.globalData.lastCurrentUserRefreshAt = 0
    this.globalData.identityMetaLoaded = false
    this.globalData.identityMetaLoading = false
    this.globalData.lastIdentityRefreshAt = 0

    wx.setStorageSync('token', token)
    wx.removeStorageSync('guestMode')

    this.setIdentityMeta(normalizedUser, { loaded: false })
  },

  syncCurrentUserInfo(userInfo = {}, options = {}) {
    const normalizedUser = {
      ...(this.globalData.userInfo || {}),
      ...(userInfo || {})
    }

    this.globalData.userInfo = normalizedUser
    this.globalData.isAdmin = normalizedUser.role >= 1
    this.globalData.isSuperAdmin = normalizedUser.role >= 2
    this.globalData.currentUserLoaded = options.loaded !== false

    const refreshedAt = Number(options.refreshedAt || 0)
    if (refreshedAt > 0) {
      this.globalData.lastCurrentUserRefreshAt = refreshedAt
    }

    if (options.persist !== false) {
      wx.setStorageSync('userInfo', normalizedUser)
    }

    return normalizedUser
  },

  setIdentityMeta(meta = {}, options = {}) {
    const preferredMemberId = normalizeId(meta.preferredMemberId)
    const pendingMemberId = normalizeId(meta.pendingMemberId)
    const pendingDisplayMemberId = normalizeId(meta.pendingDisplayMemberId)
    const displayMemberId = normalizeId(meta.displayMemberId)
      || pendingDisplayMemberId
      || preferredMemberId
      || pendingMemberId

    const preferredMemberName = meta.preferredMemberName || meta.pendingMemberName || ''
    const displayMemberName = meta.displayMemberName
      || meta.pendingDisplayMemberName
      || ((displayMemberId && preferredMemberId && displayMemberId === preferredMemberId) ? preferredMemberName : '')
      || ''

    const bindingStatus = meta.bindingStatus || (preferredMemberId ? 'APPROVED' : 'NONE')
    const readOnlyMode = !!meta.readOnlyMode
    const loaded = options.loaded !== false
    const refreshedAt = Number(options.refreshedAt || 0)

    this.globalData.preferredMemberId = preferredMemberId
    this.globalData.preferredMemberName = preferredMemberName
    this.globalData.displayMemberId = displayMemberId
    this.globalData.displayMemberName = displayMemberName
    this.globalData.identityType = meta.identityType || null
    this.globalData.preferredMemberVisible = !!meta.preferredMemberVisible
    this.globalData.spouseOwnerMemberId = normalizeId(meta.spouseOwnerMemberId)
    this.globalData.spouseOwnerMemberName = meta.spouseOwnerMemberName || ''

    this.globalData.bindingStatus = bindingStatus
    this.globalData.readOnlyMode = readOnlyMode
    this.globalData.readOnlyReason = meta.readOnlyReason || ''
    this.globalData.pendingMemberId = pendingMemberId
    this.globalData.pendingMemberName = meta.pendingMemberName || ''
    this.globalData.pendingDisplayMemberId = pendingDisplayMemberId
    this.globalData.pendingDisplayMemberName = meta.pendingDisplayMemberName || ''
    this.globalData.bindingRemark = meta.bindingRemark || ''

    this.globalData.isMember = this.globalData.isAdmin || !!preferredMemberId || bindingStatus === 'PENDING'
    this.globalData.identityMetaLoaded = loaded

    if (refreshedAt > 0) {
      this.globalData.lastIdentityRefreshAt = refreshedAt
    }

    if (this.globalData.userInfo) {
      this.globalData.userInfo.preferredMemberId = preferredMemberId
      this.globalData.userInfo.preferredMemberName = preferredMemberName
      this.globalData.userInfo.displayMemberId = displayMemberId
      this.globalData.userInfo.displayMemberName = displayMemberName
      this.globalData.userInfo.identityType = this.globalData.identityType
      this.globalData.userInfo.preferredMemberVisible = this.globalData.preferredMemberVisible
      this.globalData.userInfo.spouseOwnerMemberId = this.globalData.spouseOwnerMemberId
      this.globalData.userInfo.spouseOwnerMemberName = this.globalData.spouseOwnerMemberName
      this.globalData.userInfo.bindingStatus = bindingStatus
      this.globalData.userInfo.readOnlyMode = readOnlyMode
      this.globalData.userInfo.readOnlyReason = this.globalData.readOnlyReason
      this.globalData.userInfo.pendingMemberId = pendingMemberId
      this.globalData.userInfo.pendingMemberName = this.globalData.pendingMemberName
      this.globalData.userInfo.pendingDisplayMemberId = pendingDisplayMemberId
      this.globalData.userInfo.pendingDisplayMemberName = this.globalData.pendingDisplayMemberName
      this.globalData.userInfo.bindingRemark = this.globalData.bindingRemark
      wx.setStorageSync('userInfo', this.globalData.userInfo)
    }

    wx.setStorageSync('isMember', this.globalData.isMember)
  },

  getIdentityMetaSnapshot() {
    return {
      preferredMemberId: this.globalData.preferredMemberId,
      preferredMemberName: this.globalData.preferredMemberName,
      displayMemberId: this.globalData.displayMemberId,
      displayMemberName: this.globalData.displayMemberName,
      identityType: this.globalData.identityType,
      preferredMemberVisible: this.globalData.preferredMemberVisible,
      spouseOwnerMemberId: this.globalData.spouseOwnerMemberId,
      spouseOwnerMemberName: this.globalData.spouseOwnerMemberName,
      bindingStatus: this.globalData.bindingStatus,
      readOnlyMode: this.globalData.readOnlyMode,
      readOnlyReason: this.globalData.readOnlyReason,
      pendingMemberId: this.globalData.pendingMemberId,
      pendingMemberName: this.globalData.pendingMemberName,
      pendingDisplayMemberId: this.globalData.pendingDisplayMemberId,
      pendingDisplayMemberName: this.globalData.pendingDisplayMemberName,
      bindingRemark: this.globalData.bindingRemark
    }
  },

  redirectToLogin(message = '登录状态已失效，请重新登录') {
    if (this.globalData.__authRedirecting) return
    this.globalData.__authRedirecting = true
    wx.showToast({
      title: message,
      icon: 'none'
    })
    setTimeout(() => {
      this.clearLoginInfo()
      wx.reLaunch({
        url: '/pages/login/login'
      })
      this.globalData.__authRedirecting = false
    }, 300)
  },

  refreshCurrentUser(options = {}) {
    if (!this.checkLogin()) {
      return Promise.resolve(this.globalData.userInfo || null)
    }

    const force = !!options.force
    const minInterval = Number.isFinite(Number(options.minInterval))
      ? Number(options.minInterval)
      : 0
    const now = Date.now()

    if (!force && this.__currentUserRefreshPromise) {
      return this.__currentUserRefreshPromise
    }

    if (!force
      && this.globalData.currentUserLoaded
      && minInterval > 0
      && now - Number(this.globalData.lastCurrentUserRefreshAt || 0) < minInterval) {
      return Promise.resolve(this.globalData.userInfo || null)
    }

    this.globalData.currentUserLoading = true
    const token = this.globalData.token
    const baseUrl = this.globalData.baseUrl || getBaseUrl()

    this.__currentUserRefreshPromise = new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}/auth/current`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        success: (res) => {
          const statusCode = Number(res.statusCode || 0)
          const payload = res.data || {}
          const businessCode = Number(payload.code || 0)
          const message = payload.message || ''

          if (statusCode === 200 && businessCode === 200) {
            const user = this.syncCurrentUserInfo(payload.data || {}, {
              loaded: true,
              refreshedAt: Date.now()
            })
            resolve(user)
            return
          }

          if (statusCode === 401 || businessCode === 401) {
            this.redirectToLogin(message || '登录状态已失效，请重新登录')
          }

          const error = {
            code: businessCode || statusCode || 0,
            message: message || '当前用户信息刷新失败'
          }

          if (options.showErrorToast && error.message) {
            wx.showToast({
              title: error.message,
              icon: 'none'
            })
          }
          reject(error)
        },
        fail: (error) => {
          if (options.showErrorToast) {
            wx.showToast({
              title: '当前用户信息刷新失败',
              icon: 'none'
            })
          }
          reject(error)
        }
      })
    }).finally(() => {
      this.globalData.currentUserLoading = false
      this.__currentUserRefreshPromise = null
    })

    return this.__currentUserRefreshPromise
  },

  refreshIdentityMeta(options = {}) {
    if (!this.checkLogin()) {
      return Promise.resolve(this.getIdentityMetaSnapshot())
    }

    const force = !!options.force
    const minInterval = Number.isFinite(Number(options.minInterval))
      ? Number(options.minInterval)
      : 0
    const now = Date.now()

    if (!force && this.__identityRefreshPromise) {
      return this.__identityRefreshPromise
    }

    if (!force
      && this.globalData.identityMetaLoaded
      && minInterval > 0
      && now - Number(this.globalData.lastIdentityRefreshAt || 0) < minInterval) {
      return Promise.resolve(this.getIdentityMetaSnapshot())
    }

    this.globalData.identityMetaLoading = true
    const token = this.globalData.token
    const baseUrl = this.globalData.baseUrl || getBaseUrl()

    this.__identityRefreshPromise = new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}/auth/preferred-member`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        success: (res) => {
          const statusCode = Number(res.statusCode || 0)
          const payload = res.data || {}
          const businessCode = Number(payload.code || 0)
          const message = payload.message || ''

          if (statusCode === 200 && businessCode === 200) {
            const meta = payload.data || {}
            this.setIdentityMeta(meta, {
              loaded: true,
              refreshedAt: Date.now()
            })
            resolve(meta)
            return
          }

          if (statusCode === 401 || businessCode === 401) {
            this.redirectToLogin(message || '登录状态已失效，请重新登录')
          }

          const error = {
            code: businessCode || statusCode || 0,
            message: message || '身份信息刷新失败'
          }

          if (options.showErrorToast && error.message) {
            wx.showToast({
              title: error.message,
              icon: 'none'
            })
          }
          reject(error)
        },
        fail: (error) => {
          if (options.showErrorToast) {
            wx.showToast({
              title: '身份信息刷新失败',
              icon: 'none'
            })
          }
          reject(error)
        }
      })
    }).finally(() => {
      this.globalData.identityMetaLoading = false
      this.__identityRefreshPromise = null
    })

    return this.__identityRefreshPromise
  },

  shouldForceBindSelection(meta = {}) {
    if (!this.checkLogin() || this.globalData.isAdmin) {
      return false
    }

    const preferredMemberId = normalizeId(hasOwn(meta, 'preferredMemberId')
      ? meta.preferredMemberId
      : this.globalData.preferredMemberId)
    const bindingStatus = meta.bindingStatus || this.globalData.bindingStatus || 'NONE'

    return !preferredMemberId && bindingStatus !== 'PENDING'
  },

  setPreferredMemberId(memberId) {
    this.setIdentityMeta({
      preferredMemberId: memberId,
      displayMemberId: memberId,
      preferredMemberVisible: !!memberId,
      bindingStatus: memberId ? 'APPROVED' : 'NONE'
    })
  },

  setMemberStatus(isMember) {
    this.globalData.isMember = isMember
    wx.setStorageSync('isMember', isMember)
  },

  clearLoginInfo() {
    this.globalData.token = null
    this.globalData.userInfo = null
    this.globalData.isAdmin = false
    this.globalData.isSuperAdmin = false
    this.globalData.isMember = true

    this.globalData.preferredMemberId = null
    this.globalData.preferredMemberName = ''
    this.globalData.displayMemberId = null
    this.globalData.displayMemberName = ''
    this.globalData.identityType = null
    this.globalData.preferredMemberVisible = false
    this.globalData.spouseOwnerMemberId = null
    this.globalData.spouseOwnerMemberName = ''

    this.globalData.bindingStatus = 'NONE'
    this.globalData.readOnlyMode = false
    this.globalData.readOnlyReason = ''
    this.globalData.pendingMemberId = null
    this.globalData.pendingMemberName = ''
    this.globalData.pendingDisplayMemberId = null
    this.globalData.pendingDisplayMemberName = ''
    this.globalData.bindingRemark = ''

    this.globalData.currentUserLoaded = false
    this.globalData.currentUserLoading = false
    this.globalData.lastCurrentUserRefreshAt = 0
    this.__currentUserRefreshPromise = null
    this.globalData.identityMetaLoaded = false
    this.globalData.identityMetaLoading = false
    this.globalData.lastIdentityRefreshAt = 0
    this.__identityRefreshPromise = null

    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('isMember')
    wx.removeStorageSync('guestMode')
  },

  checkLogin() {
    return !!this.globalData.token
  },

  checkAdmin() {
    return this.globalData.isAdmin
  },

  isReadOnlyMode() {
    return !!this.globalData.readOnlyMode
  }
})
