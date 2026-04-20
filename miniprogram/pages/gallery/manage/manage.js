const api = require('../../../utils/api.js')
const app = getApp()

Page({
  data: {
    isAdmin: false,
    tabs: [],
    currentTab: '',
    pendingList: [],
    publishedList: [],
    mineList: [],
    displayList: [],
    emptyText: ''
  },

  onShow() {
    if (!app.checkLogin()) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }

    const isAdmin = app.globalData.isAdmin
    const tabs = isAdmin
      ? [
          { key: 'pending', label: '待审核' },
          { key: 'published', label: '已发布' },
          { key: 'mine', label: '我的上传' }
        ]
      : [
          { key: 'mine', label: '我的上传' }
        ]

    this.setData({
      isAdmin,
      tabs,
      currentTab: tabs[0].key
    }, () => {
      this.loadData()
    })
  },

  loadData() {
    const tasks = [api.getMyGallery()]
    if (this.data.isAdmin) {
      tasks.unshift(api.getGalleryHome())
      tasks.unshift(api.getPendingGallery())
    }

    Promise.all(tasks)
      .then((results) => {
        let pendingList = []
        let publishedList = []
        let mineList = []

        if (this.data.isAdmin) {
          pendingList = this.normalizeList(results[0].items || [])
          publishedList = this.normalizeList(results[1] || [])
          mineList = this.normalizeList(results[2] || [])
        } else {
          mineList = this.normalizeList(results[0] || [])
        }

        this.setData({
          pendingList,
          publishedList,
          mineList
        }, () => {
          this.refreshDisplayList()
        })
      })
      .catch(() => {})
  },

  normalizeList(list) {
    return (list || []).map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl || item.thumbUrl,
      title: item.title || '家族影像',
      description: item.description || '未填写说明',
      status: item.status,
      sortOrder: item.sortOrder == null ? 0 : item.sortOrder,
      statusText: this.getStatusText(item.status),
      statusClass: this.getStatusClass(item.status),
      reviewRemark: item.reviewRemark || '',
      createdAtText: this.formatDate(item.createdAt)
    }))
  },

  getStatusText(status) {
    if (status === 1) return '已发布'
    if (status === 2) return '已拒绝'
    return '待审核'
  },

  getStatusClass(status) {
    if (status === 1) return 'published'
    if (status === 2) return 'rejected'
    return 'pending'
  },

  formatDate(dateText) {
    if (!dateText) {
      return '刚刚'
    }
    return String(dateText).replace('T', ' ').slice(0, 16)
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.currentTab) {
      return
    }
    this.setData({
      currentTab: key
    }, () => {
      this.refreshDisplayList()
    })
  },

  refreshDisplayList() {
    const { currentTab, pendingList, publishedList, mineList, isAdmin } = this.data
    let sourceList = []
    let emptyText = ''

    if (currentTab === 'pending') {
      sourceList = pendingList
      emptyText = '暂时没有待审核投稿。'
    } else if (currentTab === 'published') {
      sourceList = publishedList
      emptyText = '首页还没有已发布影像。'
    } else {
      sourceList = mineList
      emptyText = '你还没有上传过家族影像。'
    }

    const displayList = sourceList.map((item) => {
      let showApprove = false
      let showReject = false
      let showDelete = false
      let showPin = false

      if (currentTab === 'pending' && isAdmin) {
        showApprove = true
        showReject = true
        showDelete = true
      } else if (currentTab === 'published' && isAdmin) {
        showPin = true
        showDelete = true
      } else if (currentTab === 'mine') {
        showDelete = isAdmin || item.status !== 1
      }

      return {
        ...item,
        showApprove,
        showReject,
        showDelete,
        showPin,
        pinText: item.sortOrder < 0 ? '重新置顶' : '置顶首页'
      }
    })

    this.setData({
      displayList,
      emptyText
    })
  },

  previewItem(e) {
    const url = e.currentTarget.dataset.url
    if (!url) {
      return
    }

    const urls = this.data.displayList.map((item) => item.imageUrl)
    wx.previewImage({
      current: url,
      urls
    })
  },

  pinToTop(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      return
    }

    const currentMin = this.data.publishedList.reduce((min, item) => {
      const value = Number(item.sortOrder || 0)
      return value < min ? value : min
    }, 0)
    const nextSortOrder = currentMin - 1

    api.updateGallerySort(id, nextSortOrder)
      .then(() => {
        wx.showToast({
          title: '已置顶到首页',
          icon: 'success'
        })
        this.loadData()
      })
  },

  approve(e) {
    const id = e.currentTarget.dataset.id
    api.reviewGallery(id, 1, '审核通过')
      .then(() => {
        wx.showToast({
          title: '已发布',
          icon: 'success'
        })
        this.loadData()
      })
  },

  reject(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '填写拒绝原因',
      editable: true,
      placeholderText: '例如：图片内容不清晰或不适合首页展示',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        const remark = res.content || '未通过审核'
        api.reviewGallery(id, 2, remark)
          .then(() => {
            wx.showToast({
              title: '已拒绝',
              icon: 'none'
            })
            this.loadData()
          })
      }
    })
  },

  removeItem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除确认',
      content: '删除后将无法恢复，确定继续吗？',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        api.deleteGallery(id)
          .then(() => {
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
            this.loadData()
          })
      }
    })
  },

  goUpload() {
    wx.navigateTo({
      url: '/pages/gallery/upload/upload'
    })
  }
})
