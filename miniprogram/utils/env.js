const ENV_KEY = 'app_env'

const ENV_CONFIG = {
  dev: {
    baseUrl: 'http://127.0.0.1:8080/api'
  },
  prod: {
    baseUrl: 'https://example.com/api'
  }
}

function getEnv() {
  try {
    const stored = wx.getStorageSync(ENV_KEY)
    return stored || 'dev'
  } catch (e) {
    return 'dev'
  }
}

function setEnv(env) {
  if (!ENV_CONFIG[env]) {
    return false
  }
  try {
    wx.setStorageSync(ENV_KEY, env)
    return true
  } catch (e) {
    return false
  }
}

function getBaseUrl() {
  const env = getEnv()
  return ENV_CONFIG[env].baseUrl
}

module.exports = {
  ENV_CONFIG,
  getEnv,
  setEnv,
  getBaseUrl
}
