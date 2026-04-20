const api = require('../../../utils/api.js')
const app = getApp()

Page({
  data: {
    activeTab: 'pending',
    isAdmin: false,
    isSuperAdmin: false,
    operatorUserId: null,

    pending: [],
    loading: false,
    summaryText: '正在读取待审核申请...',
    stats: {
      total: 0,
      member: 0,
      binding: 0
    },

    adminUsers: [],
    userLoading: false,
    userSummaryText: '正在读取用户列表...',
    userKeyword: '',
    userRoleFilter: '',
    userStats: {
      total: 0,
      admin: 0,
      normal: 0
    }
  },

  onShow() {
    this.bootstrapPage()
  },

  bootstrapPage() {
    if (!app.checkLogin()) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }

    app.refreshCurrentUser({
      force: true
    })
      .catch(() => null)
      .finally(() => {
        if (!app.globalData.isAdmin) {
          this.redirectUnauthorized('当前账号已无管理员权限')
          return
        }

        const isSuperAdmin = !!app.globalData.isSuperAdmin
        const nextTab = isSuperAdmin ? this.data.activeTab : 'pending'

        this.setData({
          isAdmin: !!app.globalData.isAdmin,
          isSuperAdmin,
          activeTab: nextTab,
          operatorUserId: this.normalizeNumber(app.globalData.userInfo && app.globalData.userInfo.id)
        })

        if (nextTab === 'users') {
          this.loadAdminUsers()
          return
        }
        this.loadPending()
      })
  },

  switchTab(e) {
    const nextTab = e.currentTarget.dataset.tab
    if (!nextTab || nextTab === this.data.activeTab) {
      return
    }
    if (nextTab === 'users' && !this.data.isSuperAdmin) {
      wx.showToast({
        title: '仅超级管理员可管理管理员权限',
        icon: 'none'
      })
      return
    }

    this.setData({
      activeTab: nextTab
    })

    if (nextTab === 'users') {
      this.loadAdminUsers()
      return
    }
    this.loadPending()
  },

  refreshCurrentTab() {
    if (this.data.activeTab === 'users') {
      this.loadAdminUsers()
      return
    }
    this.loadPending()
  },

  goPublishFamilyEvent() {
    wx.navigateTo({
      url: '/pages/notification/send/send'
    })
  },

  loadPending() {
    this.setData({
      loading: true,
      summaryText: '正在读取待审核申请...'
    })

    api.getPendingAudits()
      .then((list) => {
        const pending = (Array.isArray(list) ? list : []).map((item, index) => this.normalizePending(item, index))
        const member = pending.filter((item) => item.targetType === 'member').length
        const binding = pending.filter((item) => item.targetType === 'identity_binding').length

        this.setData({
          pending,
          loading: false,
          summaryText: pending.length > 0 ? `当前还有 ${pending.length} 条申请待处理` : '当前没有待处理申请',
          stats: {
            total: pending.length,
            member,
            binding
          }
        })
      })
      .catch((error) => {
        if (this.handlePermissionDrift(error)) {
          return
        }

        console.error('加载待审核申请失败:', error)
        this.setData({
          pending: [],
          loading: false,
          summaryText: '待审核数据加载失败，请稍后重试。',
          stats: {
            total: 0,
            member: 0,
            binding: 0
          }
        })
      })
  },

  loadAdminUsers() {
    if (!this.data.isSuperAdmin) {
      return
    }

    const role = this.data.userRoleFilter === '' ? undefined : Number(this.data.userRoleFilter)
    const keyword = (this.data.userKeyword || '').trim()
    const params = {
      status: 0
    }

    if (typeof role === 'number' && Number.isFinite(role)) {
      params.role = role
    }
    if (keyword) {
      params.keyword = keyword
    }

    this.setData({
      userLoading: true,
      userSummaryText: '正在读取用户列表...'
    })

    api.getAdminUsers(params)
      .then((list) => {
        const users = Array.isArray(list) ? list : []
        const adminCount = users.filter((item) => Number(item.role || 0) >= 1 && Number(item.role || 0) < 2).length
        const normalCount = users.filter((item) => Number(item.role || 0) === 0).length

        this.setData({
          adminUsers: users.map((item, index) => this.normalizeAdminUser(item, index)),
          userLoading: false,
          userSummaryText: users.length > 0 ? `当前筛出 ${users.length} 个账号，可直接切换管理员权限` : '当前筛选条件下没有可管理账号',
          userStats: {
            total: users.length,
            admin: adminCount,
            normal: normalCount
          }
        })
      })
      .catch((error) => {
        if (this.handlePermissionDrift(error)) {
          return
        }

        console.error('加载用户列表失败:', error)
        this.setData({
          adminUsers: [],
          userLoading: false,
          userSummaryText: (error && error.message) ? error.message : '用户列表加载失败，请稍后重试。',
          userStats: {
            total: 0,
            admin: 0,
            normal: 0
          }
        })
      })
  },

  normalizePending(item, index) {
    const targetType = item.targetType || 'member'
    const displayName = item.displayName || item.name || '未命名申请'
    const isBinding = targetType === 'identity_binding'
    const genderText = item.gender === 1 ? '男' : item.gender === 2 ? '女' : '未录入'

    return {
      ...item,
      displayName,
      targetType,
      initial: displayName && displayName.length > 0 ? displayName[0] : '审',
      genderText,
      birthText: item.birthDate || '出生日期待补充',
      generationText: item.generation ? `第${item.generation}代` : '世代未录入',
      occupationText: item.occupation || (isBinding ? '身份认领申请' : '资料待补充'),
      locationText: item.currentAddress || (isBinding ? '认领后将以该成员为默认落点' : '现居信息待补充'),
      noteText: item.noteText || (isBinding ? '普通男性成员首次认领需要管理员审核。' : '审核通过后才会正式写入家族数据。'),
      typeBadge: isBinding ? '身份认领' : '成员申请',
      accent: index % 2 === 0 ? 'ruby' : 'gold'
    }
  },

  normalizeAdminUser(item, index) {
    const role = Number(item.role || 0)
    const userId = this.normalizeNumber(item.id)
    const accountDisplayName = this.pickReadableAccountName(item, userId)
    const memberDisplayName = this.buildBoundMemberDisplayName(item)
    const hasBoundMember = !!memberDisplayName
    const displayName = memberDisplayName || accountDisplayName
    const isSelf = !!userId && userId === this.data.operatorUserId
    const isSuperAdmin = role >= 2
    const isDisabled = isSelf || isSuperAdmin
    const status = Number(item.status || 0)
    const accountLabelText = hasBoundMember
      ? (accountDisplayName && accountDisplayName !== memberDisplayName ? `账号：${accountDisplayName}` : '已绑定家族成员')
      : '未绑定家族成员'

    return {
      ...item,
      id: userId,
      role,
      displayName,
      accountDisplayName,
      realNameText: accountLabelText,
      initial: displayName && displayName.length > 0 ? displayName[0] : '户',
      roleBadge: role >= 2 ? '超级管理员' : role >= 1 ? '管理员' : '普通用户',
      roleTone: role >= 2 ? 'super' : role >= 1 ? 'admin' : 'member',
      statusText: status === 1 ? '已禁用' : '正常',
      statusTone: status === 1 ? 'muted' : 'live',
      phoneText: item.phone ? `手机号：${this.maskPhone(item.phone)}` : '手机号未录入',
      noteText: hasBoundMember ? '需要换绑定成员时，点击“身份改绑”。' : '先完成身份改绑，后面就会按成员名显示。',
      actionText: role >= 1 ? '取消管理员' : '设为管理员',
      nextRole: role >= 1 ? 0 : 1,
      actionTone: role >= 1 ? 'reject' : 'approve',
      disabled: isDisabled,
      disabledText: isSelf ? '当前账号' : isSuperAdmin ? '超级管理员' : '',
      accent: role >= 1 ? 'ruby' : (index % 2 === 0 ? 'gold' : 'ruby')
    }
  },

  buildBoundMemberDisplayName(item = {}) {
    const memberName = this.normalizeText(item.preferredMemberName || item.displayMemberName)
    if (!memberName) {
      return ''
    }

    const ownerName = this.normalizeText(item.spouseOwnerMemberName)
    if ((item.identityType === 'EXTERNAL_SPOUSE' || Number(item.isExternalSpouse || 0) === 1) && ownerName) {
      return `${memberName}（挂靠 ${ownerName}）`
    }

    return memberName
  },

  pickReadableAccountName(item = {}, userId) {
    const candidates = [item.nickName, item.realName]
    for (let index = 0; index < candidates.length; index += 1) {
      const text = this.normalizeText(candidates[index])
      if (text && !this.isLikelyGarbledText(text)) {
        return text
      }
    }
    return userId ? `账号 ${userId}` : '微信用户'
  },

  maskPhone(phone) {
    if (!phone) {
      return '手机号未录入'
    }
    const text = String(phone)
    if (text.length < 7) {
      return text
    }
    return `${text.slice(0, 3)}****${text.slice(-4)}`
  },

  normalizeNumber(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  },

  normalizeText(value) {
    if (value === null || value === undefined) {
      return ''
    }
    return String(value).trim().replace(/\s+/g, ' ')
  },

  isLikelyGarbledText(value) {
    const text = this.normalizeText(value)
    if (!text) {
      return false
    }
    const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const mojibakeCount = (text.match(/[ÃÂâãåæçèéêëìíîïðñòóôõöøùúûüýþÿœžš]/g) || []).length
    return cjkCount === 0 && mojibakeCount >= 2
  },

  onUserKeywordInput(e) {
    this.setData({
      userKeyword: e.detail.value || ''
    })
  },

  onUserKeywordConfirm() {
    this.loadAdminUsers()
  },

  clearUserKeyword() {
    if (!this.data.userKeyword) {
      return
    }

    this.setData({
      userKeyword: ''
    })
    this.loadAdminUsers()
  },

  selectRoleFilter(e) {
    const role = e.currentTarget.dataset.role
    const nextRole = role === '' ? '' : Number(role)
    if (nextRole === this.data.userRoleFilter) {
      return
    }

    this.setData({
      userRoleFilter: nextRole
    })
    this.loadAdminUsers()
  },

  approve(e) {
    const id = Number(e.currentTarget.dataset.id)
    const targetType = e.currentTarget.dataset.type
    this.review(targetType, id, 1, '审核通过')
  },

  reject(e) {
    const id = Number(e.currentTarget.dataset.id)
    const targetType = e.currentTarget.dataset.type
    wx.showModal({
      title: '填写驳回原因',
      editable: true,
      placeholderText: '请输入驳回原因',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        const remark = (res.content || '').trim() || '审核驳回'
        this.review(targetType, id, 2, remark)
      }
    })
  },

  review(targetType, id, status, remark) {
    const action = targetType === 'identity_binding'
      ? api.auditIdentityBinding(id, status, remark)
      : api.auditMember(id, status, remark)

    action
      .then(() => {
        wx.showToast({
          title: status === 1 ? '已通过' : '已驳回',
          icon: status === 1 ? 'success' : 'none'
        })
        this.loadPending()
      })
      .catch((error) => {
        if (this.handlePermissionDrift(error)) {
          return
        }

        wx.showToast({
          title: (error && error.message) ? error.message : '处理失败，请重试',
          icon: 'none'
        })
      })
  },

  toggleAdminRole(e) {
    const userId = Number(e.currentTarget.dataset.id)
    const nextRole = Number(e.currentTarget.dataset.role)
    const actionText = e.currentTarget.dataset.action || '更新管理员权限'
    const name = e.currentTarget.dataset.name || '该账号'
    const disabled = e.currentTarget.dataset.disabled === true || e.currentTarget.dataset.disabled === 'true'

    if (disabled) {
      return
    }

    wx.showModal({
      title: actionText,
      content: nextRole === 1
        ? `确认将 ${name} 设为管理员吗？`
        : `确认取消 ${name} 的管理员权限吗？`,
      confirmText: nextRole === 1 ? '确认设置' : '确认取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        api.updateAdminUserRole(userId, nextRole)
          .then(() => {
            wx.showToast({
              title: nextRole === 1 ? '已设为管理员' : '已取消管理员',
              icon: 'success'
            })
            this.loadAdminUsers()
          })
          .catch((error) => {
            if (this.handlePermissionDrift(error)) {
              return
            }

            wx.showToast({
              title: (error && error.message) ? error.message : '更新失败，请重试',
              icon: 'none'
            })
          })
      }
    })
  },

  goManageBinding(e) {
    const userId = Number(e.currentTarget.dataset.id)
    const name = e.currentTarget.dataset.name || ''

    if (!userId) {
      return
    }

    wx.navigateTo({
      url: `/pages/audit/user-binding/user-binding?userId=${userId}&userName=${encodeURIComponent(name)}`
    })
  },

  handlePermissionDrift(error) {
    if (!this.isPermissionError(error)) {
      return false
    }

    const wasUserTab = this.data.activeTab === 'users'

    app.refreshCurrentUser({
      force: true
    })
      .catch(() => null)
      .finally(() => {
        const isAdmin = !!app.globalData.isAdmin
        const isSuperAdmin = !!app.globalData.isSuperAdmin

        this.setData({
          isAdmin,
          isSuperAdmin,
          operatorUserId: this.normalizeNumber(app.globalData.userInfo && app.globalData.userInfo.id),
          activeTab: isSuperAdmin ? this.data.activeTab : 'pending'
        })

        if (!isAdmin) {
          this.redirectUnauthorized('当前账号已无管理员权限')
          return
        }

        if (!isSuperAdmin && wasUserTab) {
          wx.showToast({
            title: '仅超级管理员可管理管理员权限',
            icon: 'none'
          })
          this.setData({
            activeTab: 'pending'
          })
          this.loadPending()
        }
      })

    return true
  },

  isPermissionError(error) {
    const code = Number(error && error.code)
    const message = ((error && error.message) || '').toLowerCase()
    return code === 401
      || code === 403
      || message.includes('无权限')
      || message.includes('no permission')
      || message.includes('token invalid')
  },

  redirectUnauthorized(message) {
    wx.showToast({
      title: message,
      icon: 'none'
    })
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/profile/profile'
      })
    }, 350)
  }
})
