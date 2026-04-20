const api = require('../../../utils/api.js')

Page({
  data: {
    members: [],
    keyword: '',
    loading: false,
    resultText: '正在读取成员名录...',
    stats: {
      total: 0,
      living: 0,
      generations: 0
    }
  },

  onShow() {
    this.loadMembers()
  },

  loadMembers() {
    this.setData({
      loading: true,
      resultText: '正在读取成员名录...'
    })

    api.getMemberList()
      .then((list) => {
        const members = Array.isArray(list) ? list : []
        this.applyMembers(members, `当前展示 ${members.length} 位成员`)
      })
      .catch(() => {
        this.setData({
          members: [],
          loading: false,
          resultText: '成员列表加载失败，请稍后重试。',
          stats: {
            total: 0,
            living: 0,
            generations: 0
          }
        })
      })
  },

  applyMembers(list, resultText) {
    const members = (list || []).map((item, index) => this.normalizeMember(item, index))
    const living = members.filter((item) => item.isAlive !== 0).length
    const generations = members.reduce((max, item) => {
      const current = Number(item.generation || 0)
      return current > max ? current : max
    }, 0)

    this.setData({
      members,
      loading: false,
      resultText,
      stats: {
        total: members.length,
        living,
        generations
      }
    })
  },

  normalizeMember(item, index) {
    const genderText = item.gender === 1 ? '男' : item.gender === 2 ? '女' : '未录入'
    const birthText = item.birthDate || '生年未录入'
    const occupationText = item.occupation || '职业信息待补充'
    const locationText = item.currentAddress || item.workplace || '现居信息待补充'
    const generationText = item.generation ? `第${item.generation}代` : '世代未录入'
    const statusText = item.isAlive === 0 ? '已故' : '在世'
    const accent = index % 3 === 0 ? 'ruby' : index % 3 === 1 ? 'gold' : 'ink'

    return {
      ...item,
      initial: item.name && item.name.length > 0 ? item.name[0] : '孙',
      genderText,
      birthText,
      occupationText,
      locationText,
      generationText,
      statusText,
      statusClass: item.isAlive === 0 ? 'is-gone' : 'is-living',
      accent
    }
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })

    if (!keyword.trim()) {
      this.loadMembers()
    }
  },

  onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      this.loadMembers()
      return
    }

    this.setData({
      loading: true,
      resultText: `正在搜索“${keyword}”...`
    })

    api.searchMembers(keyword)
      .then((list) => {
        const members = Array.isArray(list) ? list : []
        this.applyMembers(members, `找到 ${members.length} 位相关成员`)
      })
      .catch(() => {
        this.setData({
          members: [],
          loading: false,
          resultText: `搜索“${keyword}”失败，请稍后重试。`,
          stats: {
            total: 0,
            living: 0,
            generations: 0
          }
        })
      })
  },

  clearSearch() {
    if (!this.data.keyword) {
      return
    }

    this.setData({
      keyword: ''
    }, () => {
      this.loadMembers()
    })
  },

  handleEmptyAction() {
    if (this.data.keyword) {
      this.clearSearch()
      return
    }

    this.goAdd()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/member/detail/detail?id=${id}`
    })
  },

  goAdd() {
    wx.navigateTo({
      url: '/pages/member/add/add'
    })
  }
})
