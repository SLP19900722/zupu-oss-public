const api = require('../../utils/api.js')
const app = getApp()
const ENTRANCE_STORAGE_PREFIX = 'homeEntrancePlayed'
const ENTRANCE_STEP_DURATIONS = [1900, 2050, 2450]
const ENTRANCE_FINISH_DELAY = 650
const ENABLE_ENTRANCE_SHOWCASE = true

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

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

function normalizeText(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim().replace(/\s+/g, ' ')
}

function normalizeLatestFamilyNotice(item) {
  if (!item || !item.id) {
    return null
  }

  const eventType = normalizeText(item.eventType || '家族通知')
  const memberName = normalizeText(item.memberName || '')
  const eventTimeText = normalizeText(item.eventTime || '时间待补充')
  const locationText = normalizeText(item.location || '')
  const remarkText = normalizeText(item.remark || '')
  const titleParts = [eventType, memberName].filter(Boolean)

  return {
    ...item,
    eventType,
    memberName,
    title: titleParts.length > 0 ? titleParts.join(' · ') : '家族通知',
    eventTimeText,
    locationText: locationText || '地点待补充',
    remarkText
  }
}

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    isLoggedIn: false,
    readOnlyMode: false,
    familyEventSubscription: createDefaultFamilyEventSubscription(),
    familyEventReminderLoading: false,
    latestFamilyNotice: null,
    stats: {
      memberCount: 0,
      imageCount: 0,
      pendingGalleryCount: 0,
      pendingAuditCount: 0
    },
    quickActions: [
      {
        title: '成员名录',
        desc: '看看家族群英谱，谁是隐藏大佬',
        url: '/pages/member/list/list',
        iconKey: 'members',
        tone: 'ruby'
      },
      {
        title: '家族树',
        desc: '顺藤摸瓜，追溯你从哪一支开挂',
        url: '/pages/tree/tree',
        iconKey: 'tree',
        tone: 'gold'
      },
      {
        title: '新增成员',
        desc: '扩编家族天团，给族谱加新角色',
        url: '/pages/member/add/add',
        iconKey: 'plus',
        tone: 'emerald'
      },
      {
        title: '个人中心',
        desc: '身份已绑定，低调查看主角光环',
        url: '/pages/profile/profile',
        iconKey: 'profile',
        tone: 'ink'
      }
    ],
    showEntranceOverlay: false,
    entranceStep: 0,
    entranceLines: [
      '你虽然没有马云有钱',
      '也没有特朗普有权',
      '但他们都入不了沈氏族谱，而你能！'
    ],
    galleryImages: [],
    galleryCurrent: 0,
    galleryAutoplay: false,
    galleryPaused: false,
    galleryLoading: true,
    galleryEmpty: false,
    gallerySectionDesc: '家族大片持续上映，点击影像还能临时当导演。',
    quickSectionDesc: '办正事要稳，讲段子要准，今天两样都在线。',
    galleryEmptyTitle: '首页影像还未发布',
    galleryEmptyText: '上传你的家族影像后，成员提交将进入管理员审核。'
  },

  onShow() {
    this.clearGalleryPauseTimer()
    this.clearEntranceTimers()

    const continueLoad = () => {
      if (app.globalData.__authRedirecting) {
        return
      }

      if (this.shouldRedirectToBinding()) {
        this.redirectToBinding()
        return
      }

      this.syncPageStateFromApp()
      this.playEntranceOverlayIfNeeded()
      this.loadStats()
      this.loadGallery()
      this.loadAdminStats()
      this.loadFamilyEventSubscriptionStatus()
      this.loadLatestFamilyNotice()
    }

    if (!app.checkLogin()) {
      continueLoad()
      return
    }

    app.refreshIdentityMeta({
      force: true
    })
      .catch(() => null)
      .finally(() => {
        continueLoad()
      })
  },

  onHide() {
    this.clearGalleryPauseTimer()
    this.clearEntranceTimers()
    this.resetEntranceOverlay()
  },

  onUnload() {
    this.clearGalleryPauseTimer()
    this.clearEntranceTimers()
    this.resetEntranceOverlay()
  },

  syncPageStateFromApp() {
    this.setData({
      userInfo: app.globalData.userInfo,
      isAdmin: app.globalData.isAdmin,
      isLoggedIn: app.checkLogin(),
      readOnlyMode: !!app.globalData.readOnlyMode
    })
  },

  goFamilyEventHistory() {
    wx.navigateTo({
      url: '/pages/notification/history/history'
    })
  },

  goLatestFamilyNotice() {
    const latestFamilyNotice = this.data.latestFamilyNotice
    if (latestFamilyNotice && latestFamilyNotice.id) {
      wx.navigateTo({
        url: `/pages/notification/history/history?notificationId=${latestFamilyNotice.id}`
      })
      return
    }
    this.goFamilyEventHistory()
  },

  shouldRedirectToBinding() {
    if (!app.checkLogin()) {
      return false
    }

    return app.shouldForceBindSelection({
      preferredMemberId: normalizeId(app.globalData.preferredMemberId),
      bindingStatus: app.globalData.bindingStatus || 'NONE'
    })
  },

  redirectToBinding() {
    wx.redirectTo({
      url: '/pages/member/select-self/select-self?force=1&from=index'
    })
  },

  loadStats() {
    const isGuest = wx.getStorageSync('guestMode')
    if (isGuest || !app.checkLogin()) {
      this.setData({
        'stats.memberCount': 0
      })
      return
    }

    api.getMemberList()
      .then((members) => {
        this.setData({
          'stats.memberCount': members.length
        })
      })
      .catch(() => {})
  },

  loadAdminStats() {
    if (!app.globalData.isAdmin) {
      this.setData({
        'stats.pendingAuditCount': 0,
        'stats.pendingGalleryCount': 0
      })
      return
    }

    api.getPendingAudits()
      .then((list) => {
        this.setData({
          'stats.pendingAuditCount': list.length
        })
      })
      .catch(() => {})

    api.getPendingGallery()
      .then((res) => {
        this.setData({
          'stats.pendingGalleryCount': res.count || 0
        })
      })
      .catch(() => {})
  },

  loadGallery() {
    this.setData({
      galleryLoading: true
    })

    api.getGalleryHome()
      .then((list) => {
        const normalized = Array.isArray(list)
          ? list.map((item, index) => this.normalizeGalleryItem(item, index))
          : []

        if (normalized.length === 0) {
          this.setData({
            galleryImages: [],
            galleryCurrent: 0,
            galleryAutoplay: false,
            galleryPaused: false,
            galleryLoading: false,
            galleryEmpty: true,
            galleryEmptyTitle: '首页影像还未发布',
            galleryEmptyText: this.data.isLoggedIn
              ? '导演位虚席以待，上传后将进入管理员审核。'
              : '登录后可参与投稿家族大片。',
            'stats.imageCount': 0
          })
          return
        }

        this.setData({
          galleryImages: normalized,
          galleryCurrent: 0,
          galleryAutoplay: normalized.length > 1,
          galleryPaused: false,
          galleryLoading: false,
          galleryEmpty: false,
          galleryEmptyTitle: '',
          galleryEmptyText: '',
          'stats.imageCount': normalized.length
        })
      })
      .catch(() => {
        this.setData({
          galleryImages: [],
          galleryCurrent: 0,
          galleryAutoplay: false,
          galleryPaused: false,
          galleryLoading: false,
          galleryEmpty: true,
          galleryEmptyTitle: '家族影像暂时不可用',
          galleryEmptyText: '片场信号有点抖，请稍后重试或重新上传。',
          'stats.imageCount': 0
        })
      })
  },

  normalizeGalleryItem(item, index) {
    return {
      id: item.id || `gallery-${index}`,
      imageUrl: item.imageUrl || item.thumbUrl || '',
      thumbUrl: item.thumbUrl || item.imageUrl || '',
      title: item.title || '家族影像',
      description: item.description || '记录家族故事与代际记忆。',
      status: item.status == null ? 1 : item.status,
      reviewRemark: item.reviewRemark || ''
    }
  },

  onGalleryChange(e) {
    const current = Number(e.detail.current || 0)
    this.setData({ galleryCurrent: current })
    if (this.data.galleryPaused) {
      this.startGalleryPauseTimer()
    }
  },

  handleGalleryTap() {
    if (!this.data.galleryImages.length) {
      return
    }

    if (this.data.galleryPaused) {
      this.resumeGalleryAutoplay()
      return
    }

    this.setData({
      galleryPaused: true,
      galleryAutoplay: false
    })
    this.startGalleryPauseTimer()
  },

  startGalleryPauseTimer() {
    this.clearGalleryPauseTimer()
    this.galleryPauseTimer = setTimeout(() => {
      this.resumeGalleryAutoplay()
    }, 12000)
  },

  clearGalleryPauseTimer() {
    if (this.galleryPauseTimer) {
      clearTimeout(this.galleryPauseTimer)
      this.galleryPauseTimer = null
    }
  },

  resumeGalleryAutoplay() {
    this.clearGalleryPauseTimer()
    this.setData({
      galleryPaused: false,
      galleryAutoplay: this.data.galleryImages.length > 1
    })
  },

  previewCurrentGallery() {
    const { galleryImages, galleryCurrent } = this.data
    if (!galleryImages.length) {
      return
    }

    const urls = galleryImages.map((item) => item.imageUrl)
    wx.previewImage({
      current: urls[galleryCurrent],
      urls
    })
  },

  openGalleryUpload() {
    if (!app.checkLogin()) {
      wx.showModal({
        title: '登录后可上传',
        content: '登录后可以提交家族影像，普通成员提交后将进入管理员审核。',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.reLaunch({ url: '/pages/login/login' })
          }
        }
      })
      return
    }

    if (app.globalData.readOnlyMode && !app.globalData.isAdmin) {
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
    if (!app.checkLogin()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (app.globalData.readOnlyMode && !app.globalData.isAdmin) {
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

  goAudit() {
    wx.navigateTo({
      url: '/pages/audit/list/list'
    })
  },

  goTo(e) {
    let url = e.currentTarget.dataset.url
    if (!url) {
      return
    }

    if (url === '/pages/member/add/add' && !app.globalData.isAdmin) {
      if (app.globalData.readOnlyMode) {
        wx.showToast({
          title: '认领审核通过前不可提交新增申请',
          icon: 'none'
        })
        return
      }
      url = '/pages/member/add/add?mode=apply'
    }

    wx.navigateTo({ url })
  },

  playEntranceOverlayIfNeeded() {
    if (!ENABLE_ENTRANCE_SHOWCASE || this.data.showEntranceOverlay) {
      return
    }

    if (!this.shouldPlayEntranceOverlayToday()) {
      return
    }

    this.markEntranceOverlayPlayedToday()
    this.startEntranceOverlay()
  },

  shouldPlayEntranceOverlayToday() {
    const storageKey = `${ENTRANCE_STORAGE_PREFIX}_${this.getLocalDateKey()}`
    return !wx.getStorageSync(storageKey)
  },

  markEntranceOverlayPlayedToday() {
    const storageKey = `${ENTRANCE_STORAGE_PREFIX}_${this.getLocalDateKey()}`
    wx.setStorageSync(storageKey, 1)
  },

  startEntranceOverlay() {
    const lineCount = (this.data.entranceLines || []).length
    if (!lineCount) {
      return
    }

    this.setData({
      showEntranceOverlay: true,
      entranceStep: 0
    })

    let elapsed = 0
    for (let step = 1; step < lineCount; step += 1) {
      elapsed += this.getEntranceStepDuration(step - 1)
      const timer = setTimeout(() => {
        this.setData({ entranceStep: step })
      }, elapsed)
      this.entranceTimers.push(timer)
    }

    elapsed += this.getEntranceStepDuration(lineCount - 1)
    const closeTimer = setTimeout(() => {
      this.resetEntranceOverlay()
      this.clearEntranceTimers()
    }, elapsed + ENTRANCE_FINISH_DELAY)
    this.entranceTimers.push(closeTimer)
  },

  getEntranceStepDuration(stepIndex) {
    if (stepIndex < ENTRANCE_STEP_DURATIONS.length) {
      return ENTRANCE_STEP_DURATIONS[stepIndex]
    }

    return ENTRANCE_STEP_DURATIONS[ENTRANCE_STEP_DURATIONS.length - 1]
  },

  resetEntranceOverlay() {
    if (!this.data.showEntranceOverlay && this.data.entranceStep === 0) {
      return
    }

    this.setData({
      showEntranceOverlay: false,
      entranceStep: 0
    })
  },

  clearEntranceTimers() {
    if (!this.entranceTimers || !this.entranceTimers.length) {
      this.entranceTimers = []
      return
    }

    this.entranceTimers.forEach((timer) => clearTimeout(timer))
    this.entranceTimers = []
  },

  normalizeFamilyEventSubscription(status) {
    return {
      ...createDefaultFamilyEventSubscription(),
      ...(status || {}),
      requestTemplateIds: Array.isArray(status && status.requestTemplateIds) ? status.requestTemplateIds : [],
      templates: Array.isArray(status && status.templates) ? status.templates : []
    }
  },

  loadFamilyEventSubscriptionStatus() {
    if (!app.checkLogin()) {
      this.setData({
        familyEventSubscription: createDefaultFamilyEventSubscription(),
        familyEventReminderLoading: false
      })
      return
    }

    this.setData({
      familyEventReminderLoading: true
    })

    api.getFamilyEventSubscriptionStatus()
      .then((status) => {
        const familyEventSubscription = this.normalizeFamilyEventSubscription(status)
        this.setData({
          familyEventSubscription,
          familyEventReminderLoading: false
        })
      })
      .catch(() => {
        this.setData({
          familyEventReminderLoading: false
        })
      })
  },

  loadLatestFamilyNotice() {
    if (!app.checkLogin()) {
      this.setData({
        latestFamilyNotice: null
      })
      return
    }

    api.getPublicFamilyEventNotifications({
      limit: 1
    })
      .then((list) => {
        this.setData({
          latestFamilyNotice: Array.isArray(list) && list.length > 0
            ? normalizeLatestFamilyNotice(list[0])
            : null
        })
      })
      .catch(() => {
        this.setData({
          latestFamilyNotice: null
        })
      })
  },

  handleFamilyEventSubscriptionFromHome() {
    if (!app.checkLogin()) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
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
          scene: 'home',
          result: normalizedResultMap
        })
          .then((latestStatus) => {
            const normalizedStatus = this.normalizeFamilyEventSubscription(latestStatus)

            this.setData({
              familyEventSubscription: normalizedStatus
            })

            wx.showToast({
              title: interrupted
                ? (acceptedCount > 0 ? `已保存 ${acceptedCount} 个授权` : '已保存本次授权结果')
                : (acceptedCount > 0 ? `已获得 ${acceptedCount} 个授权` : '未获取通知授权'),
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

  getLocalDateKey() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
