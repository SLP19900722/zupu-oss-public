// utils/request.js
const app = getApp()
const { getBaseUrl } = require('./env.js')

function redirectToLogin(message = '登录已过期，请重新登录') {
  if (app.globalData.__authRedirecting) return
  app.globalData.__authRedirecting = true
  wx.showToast({
    title: message,
    icon: 'none'
  })
  setTimeout(() => {
    app.clearLoginInfo()
    wx.reLaunch({
      url: '/pages/login/login'
    })
    app.globalData.__authRedirecting = false
  }, 300)
}

function request(url, method = 'GET', data = {}, needAuth = true) {
  const BASE_URL = getBaseUrl()
  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json'
    }

    if (needAuth && app.globalData.token) {
      header.Authorization = `Bearer ${app.globalData.token}`
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header,
      success: (res) => {
        wx.hideLoading()

        const businessCode = Number(res.data && res.data.code)
        const businessMessage = (res.data && res.data.message) || ''

        if (res.statusCode === 200) {
          if (businessCode === 200) {
            resolve(res.data.data)
            return
          }

          if (businessCode === 401) {
            redirectToLogin(businessMessage || '登录已过期，请重新登录')
            reject(res.data)
            return
          }

          wx.showToast({
            title: businessMessage || '请求失败',
            icon: 'none',
            duration: 2000
          })
          reject(res.data)
          return
        }

        if (res.statusCode === 401) {
          redirectToLogin('登录已过期，请重新登录')
          reject(res.data)
          return
        }

        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(res)
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('Request failed:', err)
        console.error('Request URL:', BASE_URL + url)
        wx.showModal({
          title: '网络连接失败',
          content: `请检查网络或域名配置\n${err.errMsg || ''}`,
          showCancel: false
        })
        reject(err)
      }
    })
  })
}

function get(url, data = {}, needAuth = true) {
  return request(url, 'GET', data, needAuth)
}

function post(url, data = {}, needAuth = true) {
  return request(url, 'POST', data, needAuth)
}

function put(url, data = {}, needAuth = true) {
  return request(url, 'PUT', data, needAuth)
}

function del(url, data = {}, needAuth = true) {
  return request(url, 'DELETE', data, needAuth)
}

module.exports = {
  request,
  get,
  post,
  put,
  del
}
