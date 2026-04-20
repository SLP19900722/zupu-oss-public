const { getLegalDocument } = require('../../../utils/legal.js')

Page({
  data: {
    type: 'privacy',
    document: null
  },

  onLoad(options) {
    const type = options && options.type === 'agreement' ? 'agreement' : 'privacy'
    const document = getLegalDocument(type)

    this.setData({
      type,
      document
    })

    wx.setNavigationBarTitle({
      title: document.title
    })
  }
})
