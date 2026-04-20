const api = require('../../../utils/api.js')
const app = getApp()

Page({
  data: {
    id: null,
    loading: true,
    member: null,
    baseRows: [],
    lifeRows: [],
    parents: [],
    motherText: '',
    children: [],
    canEdit: false,
    canDelete: false,
    canAddChild: false
  },

  onLoad(options) {
    this.setData({
      id: options.id ? Number(options.id) : null
    })
    this.loadDetail()
  },

  loadDetail() {
    const id = this.data.id
    if (!id) {
      this.setData({ loading: false, member: null })
      return
    }

    this.setData({ loading: true })

    Promise.all([
      api.getMemberDetail(id),
      api.getParents(id),
      api.getChildren(id)
    ])
      .then(([member, parents, children]) => {
        const isBoundSelf = !!member
          && !!app.globalData.preferredMemberId
          && Number(app.globalData.preferredMemberId) === Number(member.id)

        const canEdit = !app.globalData.readOnlyMode && (
          app.globalData.isAdmin || isBoundSelf
        )

        this.setData({
          loading: false,
          member: this.normalizeMember(member),
          baseRows: this.buildBaseRows(member),
          lifeRows: this.buildLifeRows(member),
          parents: this.normalizeRelations(parents),
          motherText: this.normalizeText(member.motherName || ''),
          children: this.normalizeRelations(children),
          canEdit,
          canDelete: app.globalData.isAdmin,
          canAddChild: app.globalData.isAdmin && Number(member.gender) === 1
        })
      })
      .catch(() => {
        this.setData({
          loading: false,
          member: null,
          baseRows: [],
          lifeRows: [],
          parents: [],
          motherText: '',
          children: [],
          canEdit: false,
          canDelete: false,
          canAddChild: false
        })
      })
  },

  normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
  },

  normalizeMember(member) {
    if (!member) {
      return null
    }

    return {
      ...member,
      isExternalSpouse: Number(member.isExternalSpouse || 0) === 1,
      initial: member.name && member.name.length > 0 ? member.name[0] : '族',
      genderText: member.gender === 1 ? '男' : member.gender === 2 ? '女' : '未录入',
      birthText: member.birthDate || '出生日期未填写',
      generationText: member.generation ? `第${member.generation}代` : '世代未填写',
      statusText: member.isAlive === 2 ? '已故' : '健在',
      statusClass: member.isAlive === 2 ? 'is-gone' : 'is-living',
      introText: member.introduction || '暂时还没有补充个人简介。',
      addressText: member.currentAddress || '现居地未填写'
    }
  },

  buildBaseRows(member) {
    const rows = [
      { label: '职业', value: member.occupation || '未填写' },
      { label: '工作单位', value: member.workplace || '未填写' },
      { label: '联系方式', value: member.phone || '未填写' }
    ]

    if (Number(member.isExternalSpouse || 0) === 1) {
      rows.unshift({
        label: '身份说明',
        value: member.spouseOwnerMemberName
          ? `配偶身份，树上挂靠 ${member.spouseOwnerMemberName}`
          : '配偶身份'
      })
    }

    if (Number(member.gender) === 1) {
      rows.push({
        label: '妻子姓名',
        value: member.spouseName || '未填写'
      })
    }

    return rows
  },

  buildLifeRows(member) {
    const rows = [
      { label: '出生日期', value: member.birthDate || '未填写' },
      { label: '现居地', value: member.currentAddress || '未填写' }
    ]

    if (member.isAlive === 2) {
      rows.push({
        label: '去世日期',
        value: member.deathDate || '未填写'
      })
    }

    return rows
  },

  normalizeRelations(list) {
    return (list || []).map((item, index) => ({
      ...item,
      initial: item.name && item.name.length > 0 ? item.name[0] : '族',
      genderText: item.gender === 1 ? '男' : item.gender === 2 ? '女' : '未录入',
      accent: index % 2 === 0 ? 'ruby' : 'gold'
    }))
  },

  previewAvatar() {
    if (!this.data.member || !this.data.member.avatarUrl) {
      return
    }

    wx.previewImage({
      current: this.data.member.avatarUrl,
      urls: [this.data.member.avatarUrl]
    })
  },

  goRelationDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return

    wx.navigateTo({
      url: `/pages/member/detail/detail?id=${id}`
    })
  },

  goEdit() {
    wx.navigateTo({
      url: `/pages/member/add/add?id=${this.data.id}`
    })
  },

  goAddChild() {
    const member = this.data.member
    if (!member || !member.id || Number(member.gender) !== 1) {
      wx.showToast({
        title: '女性成员不支持新增子女',
        icon: 'none'
      })
      return
    }

    const spouseName = member.spouseName ? `&sourceSpouseName=${encodeURIComponent(member.spouseName)}` : ''
    wx.navigateTo({
      url: `/pages/member/add/add?relation=child&sourceId=${member.id}&sourceGender=${member.gender}${spouseName}`
    })
  },

  deleteMember() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该成员信息吗？此操作不可撤销。',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#8F1F1F',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        api.deleteMember(this.data.id)
          .then(() => {
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 1500
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          })
          .catch((error) => {
            wx.showToast({
              title: `删除失败: ${error.message || '未知错误'}`,
              icon: 'none'
            })
          })
      }
    })
  }
})
