const api = require('../../utils/api.js')
const app = getApp()

function createDefaultFamilyEventSubscription() {
  return {
    enabled: false,
    templateId: '',
    page: '',
    mode: 'one_time',
    subscribed: false,
    fullySubscribed: false,
    subscribeStatus: 'NONE',
    statusText: '尚未开启微信提醒',
    preferredMemberBound: false,
    requestTemplateIds: [],
    templates: [],
    enabledTemplateCount: 0,
    acceptedTemplateCount: 0
  }
}

function splitTemplateIds(templateIds, size = 3) {
  const result = []
  const list = Array.isArray(templateIds) ? templateIds.filter(Boolean) : []
  for (let i = 0; i < list.length; i += size) {
    result.push(list.slice(i, i + size))
  }
  return result
}

function requestSubscribeMessages(templateIds) {
  const groups = splitTemplateIds(templateIds, 3)
  if (!groups.length) {
    return Promise.resolve({
      resultMap: {},
      interrupted: false
    })
  }

  const merged = {}

  const runGroup = (index) => {
    if (index >= groups.length) {
      return Promise.resolve({
        resultMap: merged,
        interrupted: false
      })
    }

    return new Promise((resolve) => {
      wx.requestSubscribeMessage({
        tmplIds: groups[index],
        success: (res) => {
          Object.assign(merged, res || {})
          resolve({
            interrupted: false
          })
        },
        fail: () => {
          resolve({
            interrupted: true
          })
        }
      })
    }).then((state) => {
      if (state && state.interrupted) {
        return {
          resultMap: merged,
          interrupted: true
        }
      }
      return runGroup(index + 1)
    })
  }

  return runGroup(0)
}

function getPendingTemplateIds(subscription) {
  const templates = Array.isArray(subscription && subscription.templates) ? subscription.templates : []
  const pending = templates
    .filter((item) => item && item.templateId && item.subscribeStatus !== 'ACCEPTED')
    .map((item) => item.templateId)

  if (pending.length > 0) {
    return pending
  }

  return Array.isArray(subscription && subscription.requestTemplateIds)
    ? subscription.requestTemplateIds.filter(Boolean)
    : []
}

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    isSuperAdmin: false,
    isLoggedIn: false,
    preferredMemberId: null,
    displayMemberId: null,
    identityType: null,
    bindingStatus: 'NONE',
    readOnlyMode: false,
    readOnlyReason: '',
    bindingRemark: '',
    displayMemberName: '',
    spouseOwnerMemberName: '',
    identityTitle: '家族成员',
    familyEventSubscription: createDefaultFamilyEventSubscription(),
    familyEventLoading: false
  },

  onShow() {
    const syncView = () => {
      const identityType = app.globalData.identityType || null
      const bindingStatus = app.globalData.bindingStatus || 'NONE'

      this.setData({
        userInfo: app.globalData.userInfo,
        isAdmin: app.globalData.isAdmin,
        isSuperAdmin: app.globalData.isSuperAdmin,
        isLoggedIn: app.checkLogin(),
        preferredMemberId: app.globalData.preferredMemberId || null,
        displayMemberId: app.globalData.displayMemberId || null,
        identityType,
        bindingStatus,
        readOnlyMode: !!app.globalData.readOnlyMode,
        readOnlyReason: app.globalData.readOnlyReason || '',
        bindingRemark: app.globalData.bindingRemark || '',
        displayMemberName: app.globalData.displayMemberName || '',
        spouseOwnerMemberName: app.globalData.spouseOwnerMemberName || '',
        identityTitle: this.getIdentityTitle(identityType, bindingStatus)
      })
    }

    if (!app.checkLogin()) {
      syncView()
      this.setData({
        familyEventSubscription: createDefaultFamilyEventSubscription(),
        familyEventLoading: false
      })
      return
    }

    Promise.all([
      app.refreshCurrentUser({
        force: true
      }).catch(() => null),
      app.refreshIdentityMeta({
        force: true
      }).catch(() => null)
    ])
      .finally(() => {
        syncView()
        this.loadFamilyEventSubscriptionStatus()
      })
  },

  getIdentityTitle(identityType, bindingStatus) {
    if (bindingStatus === 'PENDING') {
      return '认领待审核'
    }
    if (identityType === 'EXTERNAL_SPOUSE') {
      return '配偶身份'
    }
    return '家族成员'
  },

  loadFamilyEventSubscriptionStatus() {
    if (!app.checkLogin()) {
      this.setData({
        familyEventSubscription: createDefaultFamilyEventSubscription(),
        familyEventLoading: false
      })
      return
    }

    this.setData({
      familyEventLoading: true
    })

    api.getFamilyEventSubscriptionStatus()
      .then((status) => {
        this.setData({
          familyEventSubscription: this.normalizeFamilyEventSubscription(status),
          familyEventLoading: false
        })
      })
      .catch(() => {
        this.setData({
          familyEventLoading: false
        })
      })
  },

  normalizeFamilyEventSubscription(status) {
    return {
      ...createDefaultFamilyEventSubscription(),
      ...(status || {}),
      requestTemplateIds: Array.isArray(status && status.requestTemplateIds) ? status.requestTemplateIds : [],
      templates: Array.isArray(status && status.templates) ? status.templates : []
    }
  },

  handleFamilyEventSubscription() {
    if (!this.data.isLoggedIn) {
      this.goLogin()
      return
    }

    const subscription = this.data.familyEventSubscription || createDefaultFamilyEventSubscription()
    const pendingTemplateIds = getPendingTemplateIds(subscription)

    if (!subscription.enabled || pendingTemplateIds.length === 0) {
      wx.showToast({
        title: subscription.enabled ? '当前无需重新授权' : '管理员尚未配置通知模板',
        icon: 'none'
      })
      return
    }

    if (!subscription.preferredMemberBound && !this.data.isAdmin) {
      wx.showToast({
        title: '请先完成身份绑定',
        icon: 'none'
      })
      return
    }

    if (typeof wx.requestSubscribeMessage !== 'function') {
      wx.showToast({
        title: '当前微信版本不支持订阅消息',
        icon: 'none'
      })
      return
    }

    requestSubscribeMessages(pendingTemplateIds)
      .then(({ resultMap, interrupted }) => {
        const normalizedResultMap = resultMap || {}
        const acceptedCount = Object.keys(normalizedResultMap).filter((key) => normalizedResultMap[key] === 'accept').length
        if (Object.keys(normalizedResultMap).length === 0) {
          wx.showToast({
            title: '订阅授权未完成',
            icon: 'none'
          })
          return null
        }
        return api.acceptFamilyEventSubscription({
          scene: 'profile',
          result: normalizedResultMap
        })
          .then((latestStatus) => {
            this.setData({
              familyEventSubscription: this.normalizeFamilyEventSubscription(latestStatus)
            })

            wx.showToast({
              title: interrupted
                ? (acceptedCount > 0 ? `已保存 ${acceptedCount} 个授权` : '已保存本次授权结果')
                : (acceptedCount > 0 ? `已获取 ${acceptedCount} 个授权` : '未获取通知授权'),
              icon: acceptedCount > 0 ? 'success' : 'none'
            })
          })
      })
      .catch(() => {
        wx.showToast({
          title: '订阅授权未完成',
          icon: 'none'
        })
      })
  },

  goFamilyEventHistory() {
    if (!this.data.isLoggedIn) {
      this.goLogin()
      return
    }

    wx.navigateTo({
      url: '/pages/notification/history/history'
    })
  },

  goAudit() {
    wx.navigateTo({
      url: '/pages/audit/list/list'
    })
  },

  goSelectSelf() {
    if (this.data.readOnlyMode && !this.data.isAdmin) {
      wx.showToast({
        title: '认领审核通过前不可重新选择身份',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/member/select-self/select-self?from=profile'
    })
  },

  goMyIdentity() {
    if (!this.data.isLoggedIn) {
      this.goLogin()
      return
    }

    const targetId = this.data.preferredMemberId || this.data.displayMemberId
    if (!targetId) {
      this.goSelectSelf()
      return
    }

    wx.navigateTo({
      url: `/pages/member/detail/detail?id=${targetId}`
    })
  },

  goGalleryUpload() {
    if (!this.data.isLoggedIn) {
      this.goLogin()
      return
    }
    if (this.data.readOnlyMode && !this.data.isAdmin) {
      wx.showToast({
        title: '认领审核通过前不可提交内容',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/gallery/upload/upload'
    })
  },

  goGalleryManage() {
    if (!this.data.isLoggedIn) {
      this.goLogin()
      return
    }
    if (this.data.readOnlyMode && !this.data.isAdmin) {
      wx.showToast({
        title: '认领审核通过前仅可浏览公开内容',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/gallery/manage/manage'
    })
  },

  goLogin() {
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  handleAccountAction() {
    if (this.data.isLoggedIn) {
      this.logout()
      return
    }
    this.goLogin()
  },

  logout() {
    app.clearLoginInfo()
    wx.reLaunch({
      url: '/pages/login/login'
    })
  }
})
