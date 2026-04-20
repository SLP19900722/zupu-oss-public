const api = require('../../../utils/api.js')
const app = getApp()

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim().replace(/\s+/g, ' ')
}

Page({
  data: {
    userId: null,
    userName: '',
    userRealName: '',
    userPhone: '',
    loading: false,
    saving: false,
    keyword: '',
    bindingDetail: null,
    bindingText: '\u6B63\u5728\u52A0\u8F7D\u5F53\u524D\u7ED1\u5B9A...',
    candidates: [],
    filteredCandidates: []
  },

  onLoad(options) {
    const userId = normalizeId(options && options.userId)
    const userName = options && options.userName ? decodeURIComponent(options.userName) : ''

    if (!userId) {
      wx.showToast({
        title: '\u7F3A\u5C11\u7528\u6237\u4FE1\u606F',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
      return
    }

    this.setData({
      userId,
      userName
    })

    this.loadPageData()
  },

  onPullDownRefresh() {
    this.loadPageData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadPageData() {
    if (!app.checkLogin()) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return Promise.resolve()
    }

    this.setData({
      loading: true
    })

    return Promise.all([
      this.loadBindingDetail(),
      this.loadCandidates()
    ]).finally(() => {
      this.setData({
        loading: false
      })
    })
  },

  loadBindingDetail() {
    return api.getAdminUserBindingDetail(this.data.userId)
      .then((detail) => {
        this.applyBindingDetail(detail || {})
      })
      .catch((error) => {
        wx.showToast({
          title: (error && error.message) ? error.message : '\u52A0\u8F7D\u5931\u8D25',
          icon: 'none'
        })
      })
  },

  loadCandidates() {
    return api.getAdminUserBindableMembers(this.data.userId)
      .then((list) => {
        const candidates = Array.isArray(list)
          ? list.map((item) => this.normalizeCandidate(item))
          : []

        this.setData({
          candidates,
          filteredCandidates: this.filterCandidates(candidates, this.data.keyword)
        })
      })
      .catch((error) => {
        wx.showToast({
          title: (error && error.message) ? error.message : '\u52A0\u8F7D\u5931\u8D25',
          icon: 'none'
        })
      })
  },

  applyBindingDetail(detail = {}) {
    this.setData({
      bindingDetail: detail,
      userName: detail.userName || this.data.userName,
      userRealName: detail.userRealName || '',
      userPhone: detail.userPhone || '',
      bindingText: this.buildBindingText(detail)
    })
  },

  normalizeCandidate(item = {}) {
    const id = normalizeId(item.id)
    const isExternalSpouse = item.identityType === 'EXTERNAL_SPOUSE' || Number(item.isExternalSpouse || 0) === 1
    const ownerName = item.spouseOwnerMemberName || item.displayMemberName || ''
    const displayTitle = isExternalSpouse && ownerName
      ? `${item.name || `\u6210\u5458 ${id || ''}`}\uFF08\u6302\u9760 ${ownerName}\uFF09`
      : (item.name || `\u6210\u5458 ${id || ''}`)

    const metaParts = []
    if (isExternalSpouse) {
      metaParts.push('\u914D\u5076\u8EAB\u4EFD')
      if (ownerName) {
        metaParts.push(`\u6302\u9760 ${ownerName}`)
      }
    } else {
      const gender = Number(item.gender || 0)
      if (gender === 1) {
        metaParts.push('\u7537')
      } else if (gender === 2) {
        metaParts.push('\u5973')
      }
      if (item.generation) {
        metaParts.push(`\u7B2C ${item.generation} \u4EE3`)
      }
    }

    const boundUserNames = Array.isArray(item.boundUserNames)
      ? item.boundUserNames.filter(Boolean)
      : []

    let boundText = ''
    if (item.boundByOtherUser) {
      const targetName = item.boundUserName || boundUserNames[0] || '\u5176\u4ED6\u8D26\u53F7'
      boundText = `\u5F53\u524D\u5DF2\u7ED1\u5B9A\u7ED9 ${targetName}`
    } else if (normalizeId(item.boundUserId) === this.data.userId) {
      boundText = '\u5F53\u524D\u7528\u6237\u5DF2\u7ED1\u5B9A\u6B64\u6210\u5458'
    }

    return {
      ...item,
      id,
      isExternalSpouse,
      displayTitle,
      metaText: metaParts.join(' \u00B7 '),
      boundText,
      searchText: `${displayTitle} ${item.name || ''} ${ownerName} ${boundUserNames.join(' ')}`.trim()
    }
  },

  buildBindingText(detail = {}) {
    const preferredMemberId = normalizeId(detail.preferredMemberId)
    const preferredMemberName = detail.preferredMemberName || detail.displayMemberName || ''
    const identityType = detail.identityType || ''
    const ownerName = detail.spouseOwnerMemberName || detail.displayMemberName || ''

    if (preferredMemberId) {
      if (identityType === 'EXTERNAL_SPOUSE') {
        return ownerName
          ? `\u5F53\u524D\u7ED1\u5B9A\uFF1A${preferredMemberName || '\u672A\u547D\u540D\u914D\u5076'}\uFF08\u6302\u9760 ${ownerName}\uFF09`
          : `\u5F53\u524D\u7ED1\u5B9A\uFF1A${preferredMemberName || '\u672A\u547D\u540D\u914D\u5076'}`
      }
      return `\u5F53\u524D\u7ED1\u5B9A\uFF1A${preferredMemberName || `\u6210\u5458 ${preferredMemberId}`}`
    }

    if (detail.bindingStatus === 'PENDING') {
      return `\u5F85\u5BA1\u6838\uFF1A${detail.pendingMemberName || detail.pendingDisplayMemberName || '\u8EAB\u4EFD\u8BA4\u9886'}`
    }

    if (detail.bindingStatus === 'REJECTED') {
      return detail.bindingRemark
        ? `\u5F53\u524D\u672A\u7ED1\u5B9A\uFF0C\u6700\u8FD1\u9A73\u56DE\uFF1A${detail.bindingRemark}`
        : '\u5F53\u524D\u672A\u7ED1\u5B9A\uFF0C\u5B58\u5728\u5DF2\u9A73\u56DE\u7684\u8BA4\u9886\u8BB0\u5F55'
    }

    return '\u5F53\u524D\u672A\u7ED1\u5B9A'
  },

  filterCandidates(candidates, keyword) {
    const normalizedKeyword = normalizeText(keyword)
    if (!normalizedKeyword) {
      return candidates
    }

    return candidates.filter((item) => {
      return (item.searchText || '').includes(normalizedKeyword)
    })
  },

  onSearchInput(e) {
    const keyword = normalizeText(e.detail.value)
    this.setData({
      keyword,
      filteredCandidates: this.filterCandidates(this.data.candidates, keyword)
    })
  },

  clearSearch() {
    this.setData({
      keyword: '',
      filteredCandidates: this.data.candidates
    })
  },

  selectCandidate(e) {
    const memberId = normalizeId(e.currentTarget.dataset.id)
    const candidate = this.data.candidates.find((item) => item.id === memberId)
    const currentMemberId = normalizeId(this.data.bindingDetail && this.data.bindingDetail.preferredMemberId)

    if (!memberId || !candidate) {
      return
    }

    if (currentMemberId === memberId) {
      wx.showToast({
        title: '\u5F53\u524D\u5DF2\u9009\u6B64\u6210\u5458',
        icon: 'none'
      })
      return
    }

    const userName = this.data.userName || '\u8BE5\u7528\u6237'
    let content = `\u786E\u8BA4\u5C06${userName}\u6539\u7ED1\u4E3A\u201C${candidate.displayTitle}\u201D\u5417\uFF1F`
    if (candidate.boundByOtherUser) {
      content += `\n\n\u8BE5\u6210\u5458\u5F53\u524D\u5DF2\u7ED1\u5B9A\u7ED9${candidate.boundUserName || '\u5176\u4ED6\u8D26\u53F7'}\uFF0C\u786E\u8BA4\u540E\u5C06\u81EA\u52A8\u6E05\u9664\u539F\u7ED1\u5B9A\u3002`
    }

    wx.showModal({
      title: '\u786E\u8BA4\u6539\u7ED1',
      content,
      confirmText: candidate.boundByOtherUser ? '\u786E\u8BA4\u63A5\u7BA1' : '\u786E\u8BA4\u6539\u7ED1',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        this.savePreferredMember(memberId)
      }
    })
  },

  clearBinding() {
    const currentMemberId = normalizeId(this.data.bindingDetail && this.data.bindingDetail.preferredMemberId)
    if (!currentMemberId) {
      wx.showToast({
        title: '\u5F53\u524D\u6CA1\u6709\u53EF\u89E3\u7ED1\u7684\u8EAB\u4EFD',
        icon: 'none'
      })
      return
    }

    const userName = this.data.userName || '\u8BE5\u7528\u6237'
    wx.showModal({
      title: '\u786E\u8BA4\u89E3\u7ED1',
      content: `\u786E\u8BA4\u6E05\u9664${userName}\u5F53\u524D\u7ED1\u5B9A\u7684\u8EAB\u4EFD\u5417\uFF1F`,
      confirmText: '\u786E\u8BA4\u89E3\u7ED1',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        this.savePreferredMember(null)
      }
    })
  },

  savePreferredMember(memberId) {
    if (this.data.saving) {
      return
    }

    this.setData({
      saving: true
    })

    api.updateAdminUserPreferredMember(this.data.userId, memberId)
      .then((detail) => {
        this.applyBindingDetail(detail || {})
        return this.loadCandidates()
      })
      .then(() => {
        wx.showToast({
          title: memberId ? '\u6539\u7ED1\u6210\u529F' : '\u89E3\u7ED1\u6210\u529F',
          icon: 'success'
        })
      })
      .catch((error) => {
        wx.showToast({
          title: (error && error.message) ? error.message : '\u64CD\u4F5C\u5931\u8D25',
          icon: 'none'
        })
      })
      .finally(() => {
        this.setData({
          saving: false
        })
      })
  }
})
