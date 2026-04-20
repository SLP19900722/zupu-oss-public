const api = require('../../../utils/api.js')
const app = getApp()

function createEmptyForm() {
  return {
    eventType: '',
    memberName: '',
    eventDate: '',
    eventClock: '',
    eventTime: '',
    location: '',
    remark: ''
  }
}

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildReachSummary(estimatedCount) {
  if (estimatedCount > 0) {
    return `发布后，站内所有登录成员都能看到；微信会提醒 ${estimatedCount} 位已开启提醒的成员。`
  }
  return '发布后，站内所有登录成员都能看到；当前没有可发送微信提醒的人。'
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim().replace(/\s+/g, ' ')
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatEventDateTime(eventDate, eventClock) {
  if (!eventDate) {
    return ''
  }

  const parts = eventDate.split('-')
  if (parts.length !== 3) {
    return normalizeText(eventDate)
  }

  const year = parts[0]
  const month = padNumber(parts[1])
  const day = padNumber(parts[2])
  const clock = normalizeText(eventClock)

  return clock
    ? `${year}年${month}月${day}日 ${clock}`
    : `${year}年${month}月${day}日`
}

function parseEventDateTime(eventTime) {
  const text = normalizeText(eventTime)
  if (!text) {
    return {
      eventDate: '',
      eventClock: '',
      eventTime: ''
    }
  }

  const patterns = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/,
    /^(\d{4})[年\/.-](\d{1,2})[月\/.-](\d{1,2})日?\s+(\d{1,2}):(\d{2})$/
  ]

  for (let index = 0; index < patterns.length; index += 1) {
    const match = text.match(patterns[index])
    if (match) {
      const eventDate = `${match[1]}-${padNumber(match[2])}-${padNumber(match[3])}`
      const eventClock = `${padNumber(match[4])}:${padNumber(match[5])}`
      return {
        eventDate,
        eventClock,
        eventTime: formatEventDateTime(eventDate, eventClock)
      }
    }
  }

  return {
    eventDate: '',
    eventClock: '',
    eventTime: text
  }
}

function buildSubmitPayload(form) {
  return {
    eventType: form.eventType,
    memberName: form.memberName,
    eventTime: form.eventTime,
    location: form.location,
    remark: form.remark
  }
}

function mapDraftToForm(item) {
  const parsedTime = parseEventDateTime(item && item.eventTime)
  return {
    eventType: (item && item.eventType) || '',
    memberName: (item && item.memberName) || '',
    eventDate: parsedTime.eventDate,
    eventClock: parsedTime.eventClock,
    eventTime: parsedTime.eventTime,
    location: (item && item.location) || '',
    remark: (item && item.remark) || ''
  }
}

Page({
  data: {
    isAdmin: false,
    isSuperAdmin: false,
    submitting: false,
    sendingId: null,
    deletingId: null,
    editingDraftId: null,
    currentDraft: null,
    historyLoading: false,
    history: [],
    form: createEmptyForm(),
    eventTypeOptions: ['婚礼通知', '白事通知', '满月酒', '寿宴通知', '祭祖活动', '节日祝福', '家族聚会', '其他']
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
          wx.showToast({
            title: '当前账号没有管理员权限',
            icon: 'none'
          })
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/profile/profile'
            })
          }, 300)
          return
        }

        this.setData({
          isAdmin: true,
          isSuperAdmin: !!app.globalData.isSuperAdmin
        })
        this.loadHistory()
      })
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) {
      return
    }

    this.setData({
      [`form.${field}`]: e.detail.value || ''
    })
  },

  onEventDateChange(e) {
    const eventDate = e.detail.value || ''
    this.updateEventDateTime(eventDate, this.data.form.eventClock)
  },

  onEventClockChange(e) {
    const eventClock = e.detail.value || ''
    this.updateEventDateTime(this.data.form.eventDate, eventClock)
  },

  updateEventDateTime(eventDate, eventClock) {
    this.setData({
      'form.eventDate': eventDate,
      'form.eventClock': eventClock,
      'form.eventTime': formatEventDateTime(eventDate, eventClock)
    })
  },

  selectEventType(e) {
    const value = e.currentTarget.dataset.value || ''
    this.setData({
      'form.eventType': value
    })
  },

  submitDraft() {
    if (this.data.submitting) {
      return
    }

    const form = this.data.form || createEmptyForm()
    const editingDraftId = Number(this.data.editingDraftId || 0)
    if (!form.eventType || !form.memberName || !form.eventDate || !form.eventClock || !form.location) {
      wx.showToast({
        title: '请先补全必填信息',
        icon: 'none'
      })
      return
    }

    this.setData({
      submitting: true
    })

    const submitAction = editingDraftId > 0
      ? api.updateFamilyEventNotification(editingDraftId, buildSubmitPayload(form))
      : api.createFamilyEventNotification(buildSubmitPayload(form))

    submitAction
      .then((draft) => {
        const currentDraft = this.normalizeHistoryItem(draft)
        this.setData({
          currentDraft,
          submitting: false,
          editingDraftId: currentDraft && currentDraft.canSend ? currentDraft.id : null,
          form: mapDraftToForm(currentDraft)
        })
        this.loadHistory()

        wx.showModal({
          title: editingDraftId > 0 ? '草稿已更新' : '草稿已保存',
          content: `${buildReachSummary(normalizeNumber(currentDraft.estimatedRecipientCount || 0))}\n\n是否现在发布？`,
          confirmText: '立即发送',
          cancelText: '稍后发送',
          success: (res) => {
            if (res.confirm) {
              this.confirmSendNotification(currentDraft)
            }
          }
        })
      })
      .catch(() => {
        this.setData({
          submitting: false
        })
      })
  },

  editCurrentDraft() {
    if (!this.data.currentDraft || !this.data.currentDraft.canSend) {
      return
    }
    this.startEditingDraft(this.data.currentDraft)
  },

  editHistoryNotification(e) {
    const id = Number(e.currentTarget.dataset.id || 0)
    if (!id) {
      return
    }
    const target = (this.data.history || []).find((item) => Number(item.id) === id)
    if (!target || !target.canSend) {
      return
    }
    this.startEditingDraft(target)
  },

  startEditingDraft(draft) {
    const normalizedDraft = this.normalizeHistoryItem(draft)
    this.setData({
      currentDraft: normalizedDraft,
      editingDraftId: normalizedDraft.id || null,
      form: mapDraftToForm(normalizedDraft)
    })
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 200
    })
  },

  cancelEditingDraft() {
    this.setData({
      editingDraftId: null,
      form: createEmptyForm()
    })
  },

  sendDraft() {
    const currentDraft = this.data.currentDraft
    if (!currentDraft || !currentDraft.id) {
      return
    }
    this.confirmSendNotification(currentDraft)
  },

  sendHistoryNotification(e) {
    const id = Number(e.currentTarget.dataset.id || 0)
    if (!id) {
      return
    }
    const target = (this.data.history || []).find((item) => Number(item.id) === id)
    if (!target) {
      return
    }
    this.confirmSendNotification(target)
  },

  deleteCurrentDraft() {
    const currentDraft = this.data.currentDraft
    if (!currentDraft || !currentDraft.id) {
      return
    }
    this.confirmDeleteNotification(currentDraft)
  },

  deleteHistoryNotification(e) {
    const id = Number(e.currentTarget.dataset.id || 0)
    if (!id) {
      return
    }
    const target = (this.data.history || []).find((item) => Number(item.id) === id)
    if (!target) {
      return
    }
    this.confirmDeleteNotification(target)
  },

  confirmSendNotification(item) {
    if (!item || !item.id || this.data.sendingId) {
      return
    }

    const estimatedCount = normalizeNumber(item.estimatedRecipientCount || item.recipientCount)
    wx.showModal({
      title: '确认发布',
      content: `${buildReachSummary(estimatedCount)}\n\n第一版暂不支持手动勾选个人。`,
      confirmText: '确认发送',
      cancelText: '先检查',
      success: (res) => {
        if (res.confirm) {
          this.sendNotificationById(item.id)
        }
      }
    })
  },

  confirmDeleteNotification(item) {
    if (!this.data.isSuperAdmin || !item || !item.id || this.data.deletingId) {
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `删除后，这条通知会从管理端和成员端历史中隐藏。\n\n${item.eventType || '家族通知'}${item.memberName ? ` · ${item.memberName}` : ''}`,
      confirmText: '确认删除',
      confirmColor: '#bc5640',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.deleteNotificationById(item.id)
        }
      }
    })
  },

  sendNotificationById(id) {
    if (this.data.sendingId) {
      return
    }

    this.setData({
      sendingId: id
    })

    api.sendFamilyEventNotification(id)
      .then((result) => {
        const normalized = this.normalizeHistoryItem(result)
        const currentDraft = this.data.currentDraft && this.data.currentDraft.id === id
          ? normalized
          : this.data.currentDraft

        this.setData({
          currentDraft,
          sendingId: null,
          editingDraftId: this.data.editingDraftId === id ? null : this.data.editingDraftId,
          form: this.data.editingDraftId === id ? createEmptyForm() : this.data.form
        })
        this.loadHistory()

        wx.showModal({
          title: '发布完成',
          content: `站内通知已发布。\n微信提醒成功 ${normalized.successCount || 0} 人，失败 ${normalized.failureCount || 0} 人。`,
          showCancel: false
        })
      })
      .catch(() => {
        this.setData({
          sendingId: null
        })
      })
  },

  deleteNotificationById(id) {
    if (this.data.deletingId) {
      return
    }

    this.setData({
      deletingId: id
    })

    api.deleteFamilyEventNotification(id)
      .then(() => {
        const currentDraft = this.data.currentDraft && this.data.currentDraft.id === id
          ? null
          : this.data.currentDraft

        this.setData({
          currentDraft,
          deletingId: null,
          editingDraftId: this.data.editingDraftId === id ? null : this.data.editingDraftId,
          form: this.data.editingDraftId === id ? createEmptyForm() : this.data.form
        })

        this.loadHistory()

        wx.showToast({
          title: '已删除',
          icon: 'success'
        })
      })
      .catch(() => {
        this.setData({
          deletingId: null
        })
      })
  },

  loadHistory() {
    this.setData({
      historyLoading: true
    })

    api.getFamilyEventNotificationHistory()
      .then((list) => {
        const history = (Array.isArray(list) ? list : []).map((item) => this.normalizeHistoryItem(item))
        const currentDraftId = this.data.currentDraft && this.data.currentDraft.id
        const latestCurrentDraft = currentDraftId
          ? (history.find((item) => item.id === currentDraftId) || this.data.currentDraft)
          : this.data.currentDraft
        this.setData({
          history,
          currentDraft: latestCurrentDraft && history.some((item) => item.id === latestCurrentDraft.id) ? latestCurrentDraft : null,
          historyLoading: false
        })
      })
      .catch(() => {
        this.setData({
          historyLoading: false
        })
      })
  },

  goPublicHistory() {
    wx.navigateTo({
      url: '/pages/notification/history/history'
    })
  },

  normalizeHistoryItem(item) {
    return {
      ...(item || {}),
      estimatedRecipientCount: normalizeNumber(item && item.estimatedRecipientCount),
      recipientCount: normalizeNumber(item && item.recipientCount),
      successCount: normalizeNumber(item && item.successCount),
      failureCount: normalizeNumber(item && item.failureCount),
      failureReasons: Array.isArray(item && item.failureReasons) ? item.failureReasons : [],
      canSend: !!(item && item.canSend),
      canDelete: !!(item && item.canDelete),
      statusText: (item && item.statusText) || '待发送'
    }
  }
})
