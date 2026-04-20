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
    members: [],
    filteredMembers: [],
    keyword: '',
    loading: false,
    force: false,
    from: '',
    bindEntryType: '',

    currentIdentityType: null,
    currentPreferredMemberId: null,
    currentPreferredMemberName: '',
    currentDisplayMemberName: '',
    currentBindText: '',
    canChange: true,
    bindingStatus: 'NONE',
    readOnlyMode: false,
    readOnlyReason: '',
    bindingRemark: '',

    spouseOwnerOptions: [],
    spouseOwnerLabels: [],
    externalOwnerIndex: -1,
    externalOwnerMemberId: null,
    externalOwnerDisplayName: '',
    externalSpouseName: '',
    submittingExternalSpouse: false
  },

  onLoad(options) {
    const force = options && options.force === '1'
    const from = options && options.from ? options.from : ''

    this.setData({
      force,
      from,
      currentPreferredMemberId: app.globalData.preferredMemberId || null
    })

    if (force) {
      wx.setNavigationBarTitle({ title: '首次登录，请先选择本人' })
    }

    this._pageReady = true
    this.loadPageData()
  },

  onShow() {
    if (!this._pageReady || !app.checkLogin() || app.globalData.__authRedirecting) {
      return
    }

    this.loadPreferredMeta({
      minInterval: 1200,
      preserveBindEntryType: true
    })
  },

  loadPageData() {
    if (!app.checkLogin() || app.globalData.__authRedirecting) {
      return Promise.resolve()
    }

    this.setData({ loading: true })

    return Promise.all([
      this.loadPreferredMeta({
        force: true,
        preserveBindEntryType: false
      }),
      this.loadMembers()
    ]).finally(() => {
      this.setData({ loading: false })
    })
  },

  loadPreferredMeta(options = {}) {
    return app.refreshIdentityMeta({
      force: !!options.force,
      minInterval: options.minInterval || 0
    })
      .then((meta) => {
        this.applyIdentityMeta(meta, options)
        return meta
      })
      .catch(() => {
        const fallbackMeta = app.getIdentityMetaSnapshot()
        this.applyIdentityMeta(fallbackMeta, options)
        return fallbackMeta
      })
  },

  applyIdentityMeta(meta = {}, options = {}) {
    const preferredMemberId = normalizeId(meta.preferredMemberId)
    const identityType = meta.identityType || null
    const nextBindEntryType = (!options.preserveBindEntryType || !this.data.bindEntryType)
      ? this.resolveBindEntryType(meta)
      : this.data.bindEntryType

    this.setData({
      currentIdentityType: identityType,
      currentPreferredMemberId: preferredMemberId,
      currentPreferredMemberName: meta.preferredMemberName || meta.pendingMemberName || '',
      currentDisplayMemberName: meta.displayMemberName || meta.pendingDisplayMemberName || '',
      currentBindText: this.buildCurrentBindText(meta),
      canChange: typeof meta.canChange === 'boolean' ? meta.canChange : this.data.canChange,
      bindingStatus: meta.bindingStatus || this.data.bindingStatus || 'NONE',
      readOnlyMode: typeof meta.readOnlyMode === 'boolean' ? meta.readOnlyMode : !!this.data.readOnlyMode,
      readOnlyReason: meta.readOnlyReason || '',
      bindingRemark: meta.bindingRemark || '',
      bindEntryType: nextBindEntryType
    })
  },

  resolveBindEntryType(meta = {}) {
    const preferredMemberId = normalizeId(meta.preferredMemberId)
    const identityType = meta.identityType || null

    if (this.data.force && !preferredMemberId) {
      return ''
    }

    if (identityType === 'EXTERNAL_SPOUSE') {
      return 'spouse'
    }

    return 'direct'
  },

  loadMembers() {
    return api.getBindableMembers()
      .then((list) => {
        const members = Array.isArray(list) ? list.map((item) => this.normalizeMember(item)) : []
        const spouseOwnerOptions = members
          .filter((item) => !item.hidden && Number(item.gender) === 1)
          .map((item) => ({
            id: item.id,
            label: item.name || `成员 ${item.id}`
          }))

        const state = {
          members,
          filteredMembers: this.filterMembers(members, this.data.keyword),
          spouseOwnerOptions,
          spouseOwnerLabels: spouseOwnerOptions.map((item) => item.label)
        }

        const selectedOwnerStillExists = spouseOwnerOptions.some((item) => item.id === this.data.externalOwnerMemberId)
        if (!selectedOwnerStillExists) {
          state.externalOwnerIndex = -1
          state.externalOwnerMemberId = null
          state.externalOwnerDisplayName = ''
        }

        this.setData(state)
      })
      .catch((error) => {
        console.error('加载可绑定成员失败:', error)
      })
  },

  normalizeMember(member) {
    const id = normalizeId(member.id)
    const gender = Number(member.gender || 0)
    const hidden = member.identityType === 'EXTERNAL_SPOUSE' || Number(member.isExternalSpouse || 0) === 1
    const ownerName = member.spouseOwnerMemberName || member.displayMemberName || ''
    const generationText = member.generation ? `第 ${member.generation} 代` : '世代未录入'
    const genderText = gender === 1 ? '男' : gender === 2 ? '女' : '未知'
    const metaText = hidden
      ? (ownerName ? `配偶身份 · 挂靠 ${ownerName}` : '配偶身份')
      : `${genderText} · ${generationText}`

    return {
      ...member,
      id,
      gender,
      hidden,
      ownerName,
      displayTitle: hidden && ownerName
        ? `${member.name || '未命名成员'}（挂靠 ${ownerName}）`
        : (member.name || '未命名成员'),
      metaText,
      searchText: `${member.name || ''} ${ownerName}`.trim()
    }
  },

  filterMembers(members, keyword) {
    if (!keyword) {
      return members
    }

    return members.filter((member) => {
      return (member.searchText || '').includes(keyword)
        || (member.displayTitle || '').includes(keyword)
    })
  },

  getLockedToastText() {
    return this.data.bindingStatus === 'PENDING'
      ? '当前认领申请正在审核中'
      : '当前账号暂不可修改身份'
  },

  chooseBindEntry(e) {
    const type = e.currentTarget.dataset.type
    if (type !== 'direct' && type !== 'spouse') {
      return
    }

    this.setData({
      bindEntryType: type
    })
  },

  onSearchInput(e) {
    const keyword = normalizeText(e.detail.value)
    this.setData({
      keyword,
      filteredMembers: this.filterMembers(this.data.members, keyword)
    })
  },

  clearSearch() {
    this.setData({
      keyword: '',
      filteredMembers: this.data.members
    })
  },

  selectMember(e) {
    const memberId = normalizeId(e.currentTarget.dataset.id)
    const member = this.data.members.find((item) => item.id === memberId)
    const label = e.currentTarget.dataset.label || (member && member.displayTitle) || ''
    const hidden = Number(e.currentTarget.dataset.hidden) === 1 || !!(member && member.hidden)
    const gender = Number(e.currentTarget.dataset.gender || (member && member.gender) || 0)

    if (!memberId) {
      return
    }

    this.handleSelfMemberSelection({
      memberId,
      label,
      hidden,
      gender
    })
  },

  handleSelfMemberSelection({ memberId, label, hidden, gender }) {
    if (!this.data.canChange) {
      wx.showToast({
        title: this.getLockedToastText(),
        icon: 'none'
      })
      return
    }

    if (!memberId) {
      return
    }

    if (!app.globalData.isAdmin && !hidden && gender === 1) {
      this.requestMaleClaim(memberId, label)
      return
    }

    this.confirmImmediateBind(memberId, label)
  },

  openSelfTreeSelector() {
    this.setData({
      bindEntryType: 'direct'
    })
    this.openTreeSelector('self')
  },

  openSpouseOwnerTreeSelector() {
    if (!this.data.canChange) {
      wx.showToast({
        title: this.getLockedToastText(),
        icon: 'none'
      })
      return
    }

    this.setData({
      bindEntryType: 'spouse'
    })
    this.openTreeSelector('spouseOwner')
  },

  openTreeSelector(mode) {
    if (!this.data.canChange) {
      wx.showToast({
        title: this.getLockedToastText(),
        icon: 'none'
      })
      return
    }

    if (mode !== 'self' && mode !== 'spouseOwner') {
      return
    }

    const initialView = mode === 'self' ? '&initialView=overview_tree' : ''

    wx.navigateTo({
      url: `/pages/tree/tree?selectMode=${mode}&from=select-self${initialView}`,
      success: (res) => {
        if (!res || !res.eventChannel) {
          return
        }
        res.eventChannel.on('memberSelected', (payload) => {
          this.handleTreeSelection(payload)
        })
      }
    })
  },

  handleTreeSelection(payload) {
    const mode = payload && payload.mode
    const memberId = normalizeId(payload && payload.memberId)
    const memberName = normalizeText(payload && payload.memberName)

    if (!memberId || !mode) {
      return
    }

    if (mode === 'self') {
      const member = this.data.members.find((item) => item.id === memberId)
      if (!member && !memberName) {
        wx.showToast({
          title: '所选成员暂不可绑定，请返回重试',
          icon: 'none'
        })
        return
      }

      this.setData({
        bindEntryType: 'direct'
      })

      this.handleSelfMemberSelection({
        memberId,
        label: (member && member.displayTitle) || memberName || `成员 ${memberId}`,
        hidden: !!(member && member.hidden),
        gender: Number((member && member.gender) || (payload && payload.gender) || 0)
      })
      return
    }

    if (mode === 'spouseOwner') {
      this.setData({
        bindEntryType: 'spouse',
        externalOwnerIndex: -1,
        externalOwnerMemberId: memberId,
        externalOwnerDisplayName: memberName || `成员 ${memberId}`
      })
      wx.showToast({
        title: '已选择挂靠丈夫',
        icon: 'success'
      })
    }
  },

  confirmImmediateBind(memberId, label) {
    wx.showModal({
      title: '确认身份',
      content: `确认将“${label}”设为当前账号的身份吗？`,
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        this.bindPreferredMember(memberId)
      }
    })
  },

  requestMaleClaim(memberId, label) {
    wx.showModal({
      title: '提交认领申请',
      content: `确认申请认领“${label}”吗？提交后需要管理员审核，审核前账号将保持只读。`,
      confirmText: '提交申请',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        api.requestPreferredMemberBinding(memberId)
          .then((data) => {
            this.handlePendingSuccess(data || {}, label)
          })
          .catch((error) => {
            console.error('提交认领申请失败:', error)
            wx.showToast({
              title: (error && error.message) ? error.message : '提交失败，请重试',
              icon: 'none'
            })
          })
      }
    })
  },

  bindPreferredMember(memberId) {
    api.setPreferredMember(memberId)
      .then((data) => {
        this.handleBindSuccess(data || { preferredMemberId: memberId }, '身份绑定成功')
      })
      .catch((error) => {
        console.error('绑定成员失败:', error)
        wx.showToast({
          title: (error && error.message) ? error.message : '绑定失败，请重试',
          icon: 'none'
        })
      })
  },

  handleBindSuccess(meta, toastTitle) {
    app.setIdentityMeta(meta)
    this.applyIdentityMeta(meta, {
      preserveBindEntryType: false
    })
    this.setData({
      externalOwnerIndex: -1,
      externalOwnerMemberId: null,
      externalOwnerDisplayName: '',
      externalSpouseName: '',
      submittingExternalSpouse: false
    })

    wx.showToast({
      title: toastTitle,
      icon: 'success'
    })

    setTimeout(() => {
      if (this.data.from === 'profile' || this.data.from === 'tree') {
        wx.navigateBack()
        return
      }
      wx.reLaunch({
        url: '/pages/index/index'
      })
    }, 1000)
  },

  handlePendingSuccess(meta, label) {
    app.setIdentityMeta(meta)
    this.applyIdentityMeta({
      ...meta,
      pendingMemberName: meta.pendingMemberName || label || ''
    }, {
      preserveBindEntryType: false
    })
    this.setData({
      externalOwnerIndex: -1,
      externalOwnerMemberId: null,
      externalOwnerDisplayName: '',
      externalSpouseName: '',
      submittingExternalSpouse: false
    })

    wx.showToast({
      title: '已提交审核',
      icon: 'success'
    })

    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/index/index'
      })
    }, 1000)
  },

  onExternalOwnerChange(e) {
    const index = Number(e.detail.value)
    const selected = this.data.spouseOwnerOptions[index]
    this.setData({
      externalOwnerIndex: Number.isFinite(index) ? index : -1,
      externalOwnerMemberId: selected ? selected.id : null,
      externalOwnerDisplayName: selected ? selected.label : ''
    })
  },

  onExternalSpouseNameInput(e) {
    this.setData({
      externalSpouseName: e.detail.value || ''
    })
  },

  submitExternalSpouseBinding() {
    if (!this.data.canChange) {
      wx.showToast({
        title: this.getLockedToastText(),
        icon: 'none'
      })
      return
    }

    const ownerMemberId = normalizeId(this.data.externalOwnerMemberId)
    const spouseName = normalizeText(this.data.externalSpouseName)

    if (!ownerMemberId) {
      wx.showToast({
        title: '请先选择挂靠丈夫',
        icon: 'none'
      })
      return
    }

    if (!spouseName) {
      wx.showToast({
        title: '请填写你的姓名',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认配偶身份',
      content: `确认以“${spouseName}”的身份挂靠到“${this.data.externalOwnerDisplayName}”并完成绑定吗？`,
      confirmText: '确认绑定',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        this.setData({ submittingExternalSpouse: true })
        api.bindExternalSpousePreferredMember(ownerMemberId, spouseName)
          .then((data) => {
            this.handleBindSuccess(data || {}, '身份绑定成功')
          })
          .catch((error) => {
            console.error('配偶身份绑定失败:', error)
            this.setData({ submittingExternalSpouse: false })
            wx.showToast({
              title: (error && error.message) ? error.message : '绑定失败，请重试',
              icon: 'none'
            })
          })
      }
    })
  },

  goApply() {
    if (app.globalData.readOnlyMode) {
      wx.showToast({
        title: '认领审核通过前仅可浏览公开内容',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/member/add/add?mode=apply'
    })
  },

  buildCurrentBindText(meta = {}) {
    const bindingStatus = meta.bindingStatus || 'NONE'
    const preferredName = meta.preferredMemberName || ''
    const preferredId = normalizeId(meta.preferredMemberId)
    const pendingName = meta.pendingMemberName || meta.pendingDisplayMemberName || ''

    if (bindingStatus === 'PENDING') {
      return `当前待审身份：${pendingName || '未命名成员'}`
    }

    if (preferredId) {
      return `当前已绑定：${preferredName || `成员ID ${preferredId}`}`
    }

    return ''
  }
})
