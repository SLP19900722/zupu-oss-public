const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    timelineData: [],
    isPrivacyAgreed: false
  },

  onLoad() {
    if (app.checkLogin()) {
      Promise.all([
        app.refreshCurrentUser({
          force: true
        }).catch(() => null),
        this.loadIdentityMeta()
      ]).then(([, meta]) => {
        this.redirectAfterIdentity(meta)
      })
      return
    }

    this.loadMigrationTimeline()
  },

  loadMigrationTimeline() {
    api.getMigrationTimeline()
      .then((data) => {
        this.setData({ timelineData: data || [] })
      })
      .catch((err) => {
        console.error('加载迁徙时间线失败', err)
      })
  },

  togglePrivacy() {
    this.setData({
      isPrivacyAgreed: !this.data.isPrivacyAgreed
    })
  },

  skipLogin() {
    wx.showModal({
      title: '游客浏览',
      content: '游客模式下可查看迁徙时间线和部分首页内容，如需参与族谱管理请先登录。',
      confirmText: '继续浏览',
      cancelText: '去登录',
      success: (res) => {
        if (res.confirm) {
          app.setMemberStatus(true)
          wx.setStorageSync('guestMode', true)
          wx.reLaunch({
            url: '/pages/index/index'
          })
          return
        }
        this.handleWxLogin()
      }
    })
  },

  showUserAgreement() {
    this.openLegalPage('agreement')
  },

  showPrivacyPolicy() {
    this.openLegalPage('privacy')
  },

  openLegalPage(type) {
    wx.navigateTo({
      url: `/pages/legal/detail/detail?type=${type}`
    })
  },

  ensurePrivacyAgreement() {
    if (this.data.isPrivacyAgreed) {
      return true
    }

    wx.showToast({
      title: '请先阅读并同意协议',
      icon: 'none'
    })
    return false
  },

  getIconEmoji(icon) {
    const iconMap = {
      flag: '迁',
      home: '宅',
      star: '谱',
      location: '址'
    }
    return iconMap[icon] || '迁'
  },

  showTimelineDetail(e) {
    const item = e.currentTarget.dataset.item
    let content = `${item.description || ''}\n\n`

    if (item.dynasty) {
      content += `朝代：${item.dynasty}\n`
    }
    if (item.generation) {
      content += `世代：第 ${item.generation} 代\n`
    }
    if (item.keyPerson) {
      content += `关键人物：${item.keyPerson}`
    }

    wx.showModal({
      title: `${item.year} 年 · ${item.title}`,
      content: content.trim(),
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  handleWxLogin() {
    if (!this.ensurePrivacyAgreement()) {
      return
    }

    if (!this.data.canIUseGetUserProfile) {
      wx.showToast({
        title: '当前微信版本过低，请升级后使用',
        icon: 'none'
      })
      return
    }

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const { nickName, avatarUrl, gender } = res.userInfo

        wx.login({
          success: (loginRes) => {
            if (!loginRes.code) {
              wx.showToast({
                title: '登录失败，请重试',
                icon: 'none'
              })
              return
            }
            this.doLogin(loginRes.code, nickName, avatarUrl, gender)
          }
        })
      },
      fail: () => {
        wx.showToast({
          title: '需要授权后才能使用',
          icon: 'none'
        })
      }
    })
  },

  doLogin(code, nickName, avatarUrl, gender) {
    api.wxLogin(code, nickName, avatarUrl, gender)
      .then((res) => {
        app.saveLoginInfo(res.token, res.user)

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1200
        })

        return this.loadIdentityMeta()
      })
      .then((meta) => {
        setTimeout(() => {
          this.redirectAfterIdentity(meta)
        }, 1200)
      })
      .catch((err) => {
        console.error('登录失败', err)
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
      })
  },

  goAdminLogin() {
    if (!this.ensurePrivacyAgreement()) {
      return
    }

    wx.showModal({
      title: '管理员登录',
      editable: true,
      placeholderText: '请输入管理员账号',
      success: (res) => {
        if (res.confirm && res.content) {
          this.showPasswordInput(res.content)
        }
      }
    })
  },

  showPasswordInput(username) {
    wx.showModal({
      title: '输入密码',
      editable: true,
      placeholderText: '请输入密码',
      success: (res) => {
        if (res.confirm && res.content) {
          this.doAdminLogin(username, res.content)
        }
      }
    })
  },

  doAdminLogin(username, password) {
    api.adminLogin(username, password)
      .then((res) => {
        app.saveLoginInfo(res.token, res.user)

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1200
        })

        return this.loadIdentityMeta()
      })
      .then((meta) => {
        setTimeout(() => {
          this.redirectAfterIdentity(meta)
        }, 1200)
      })
      .catch((err) => {
        console.error('管理员登录失败', err)
        wx.showToast({
          title: err && err.message ? err.message : '登录失败，请重试',
          icon: 'none'
        })
      })
  },

  loadIdentityMeta() {
    return app.refreshIdentityMeta({
      force: true
    })
      .catch((err) => {
        console.error('获取身份信息失败', err)
        return app.getIdentityMetaSnapshot()
      })
  },

  redirectAfterIdentity(meta) {
    wx.reLaunch({
      url: app.shouldForceBindSelection(meta || {})
        ? '/pages/member/select-self/select-self?force=1&from=login'
        : '/pages/index/index'
    })
  }
})
