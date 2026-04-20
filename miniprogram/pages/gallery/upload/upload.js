const api = require('../../../utils/api.js')
const app = getApp()

Page({
  data: {
    isAdmin: false,
    previewUrl: '',
    form: {
      imageUrl: '',
      title: '',
      description: ''
    },
    uploading: false,
    submitting: false
  },

  onShow() {
    if (!app.checkLogin()) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }

    if (app.globalData.readOnlyMode && !app.globalData.isAdmin) {
      wx.showToast({
        title: '认领审核通过前不可提交内容',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack({ delta: 1 })
      }, 800)
      return
    }

    this.setData({
      isAdmin: app.globalData.isAdmin
    })
  },

  chooseImage() {
    const choose = wx.chooseMedia || wx.chooseImage
    if (!choose) {
      wx.showToast({
        title: '当前微信版本不支持上传',
        icon: 'none'
      })
      return
    }

    choose({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles && res.tempFiles[0]
          ? res.tempFiles[0].tempFilePath
          : res.tempFilePaths[0]

        if (!tempPath) {
          return
        }

        this.uploadImage(tempPath)
      }
    })
  },

  uploadImage(filePath) {
    this.setData({ uploading: true })
    wx.showLoading({
      title: '上传中...',
      mask: true
    })

    wx.compressImage({
      src: filePath,
      quality: 70,
      success: (res) => {
        this.doUpload(res.tempFilePath || filePath)
      },
      fail: () => {
        this.doUpload(filePath)
      }
    })
  },

  doUpload(filePath) {
    api.uploadGalleryImage(filePath)
      .then((url) => {
        wx.hideLoading()
        this.setData({
          uploading: false,
          previewUrl: url,
          'form.imageUrl': url
        })
        wx.showToast({
          title: '图片已上传',
          icon: 'success'
        })
      })
      .catch(() => {
        wx.hideLoading()
        this.setData({ uploading: false })
      })
  },

  onTitleInput(e) {
    this.setData({
      'form.title': e.detail.value
    })
  },

  onDescInput(e) {
    this.setData({
      'form.description': e.detail.value
    })
  },

  submitGallery() {
    const { form, submitting } = this.data
    if (submitting) {
      return
    }
    if (!form.imageUrl) {
      wx.showToast({
        title: '请先上传图片',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })
    api.submitGallery(form)
      .then((res) => {
        this.setData({ submitting: false })
        const isPublished = res && res.status === 1
        wx.showToast({
          title: isPublished ? '已发布到首页' : '已提交审核',
          icon: 'success'
        })
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/gallery/manage/manage'
          })
        }, 1200)
      })
      .catch(() => {
        this.setData({ submitting: false })
      })
  }
})
