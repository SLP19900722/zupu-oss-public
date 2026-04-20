const api = require('../../../utils/api.js')
const app = getApp()

function normalizeNotification(item) {
  return {
    ...(item || {}),
    statusText: (item && item.statusText) || '家族通知',
    remarkText: (item && item.remark) || '暂无补充说明'
  }
}

Page({
  data: {
    loading: false,
    detailLoading: false,
    notifications: [],
    selectedNotification: null,
    notificationId: null
  },

  onLoad(options) {
    const notificationId = Number((options && (options.notificationId || options.id)) || 0)
    this.setData({
      notificationId: notificationId > 0 ? notificationId : null
    })
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

    this.loadNotifications()
    if (this.data.notificationId) {
      this.loadNotificationDetail(this.data.notificationId)
    }
  },

  loadNotifications() {
    this.setData({
      loading: true
    })

    api.getPublicFamilyEventNotifications({
      limit: 30
    })
      .then((list) => {
        const notifications = (Array.isArray(list) ? list : []).map((item) => normalizeNotification(item))
        const fallbackNotification = notifications.length > 0 ? notifications[0] : null
        const selectedNotification = this.data.notificationId
          ? (this.data.selectedNotification && this.data.selectedNotification.id === this.data.notificationId
            ? this.data.selectedNotification
            : fallbackNotification)
          : fallbackNotification

        this.setData({
          notifications,
          selectedNotification,
          loading: false
        })
      })
      .catch(() => {
        this.setData({
          loading: false
        })
      })
  },

  loadNotificationDetail(id) {
    if (!id) {
      return
    }

    this.setData({
      detailLoading: true
    })

    api.getPublicFamilyEventNotification(id)
      .then((item) => {
        this.setData({
          selectedNotification: normalizeNotification(item),
          detailLoading: false,
          notificationId: id
        })
      })
      .catch(() => {
        if (!this.data.selectedNotification) {
          this.setData({
            selectedNotification: (this.data.notifications && this.data.notifications.length > 0)
              ? this.data.notifications[0]
              : null
          })
        }
        this.setData({
          detailLoading: false
        })
      })
  },

  selectNotification(e) {
    const id = Number(e.currentTarget.dataset.id || 0)
    if (!id) {
      return
    }

    this.loadNotificationDetail(id)
  }
})
