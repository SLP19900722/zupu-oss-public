const api = require('../../../utils/api.js')
const app = getApp()

Page({
  data: {
    id: null,
    isEdit: false,
    isApply: false,
    isSelfLimitedEdit: false,
    isExternalSpouseEdit: false,
    spouseOwnerMemberName: '',
    pageTitle: '新增成员',
    submitText: '提交审核',
    heroDesc: '补充家族成员资料后，将进入管理员审核流程。',
    avatarPreview: '',
    uploadingAvatar: false,
    submitting: false,
    form: {
      name: '',
      gender: 1,
      birthDate: '',
      occupation: '',
      introduction: '',
      fatherId: null,
      motherName: '',
      spouseName: '',
      phone: '',
      workplace: '',
      currentAddress: '',
      isAlive: 1,
      deathDate: '',
      avatarUrl: ''
    },
    genderOptions: ['男', '女'],
    aliveOptions: ['健在', '已故'],
    fatherOptions: ['无'],
    fatherIds: [null],
    fatherIndex: 0,
    parentModeHint: ''
  },

  onLoad(options) {
    let mode = options && options.mode ? options.mode : ''
    const id = options && options.id ? Number(options.id) : null

    if (!app.globalData.isAdmin && app.globalData.readOnlyMode) {
      wx.showToast({
        title: '认领审核通过前不可提交或编辑资料',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack({ delta: 1 })
      }, 800)
      return
    }

    this.prefillOptions = this.parsePrefillOptions(options)
    this.relationMembers = []
    this.relationMemberMap = {}

    if (!app.globalData.isAdmin && !id && mode !== 'apply') {
      mode = 'apply'
    }

    if (this.prefillOptions && this.prefillOptions.relation === 'child' && this.prefillOptions.sourceGender === 2) {
      wx.showToast({
        title: '女性成员不支持新增子女',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack({ delta: 1 })
      }, 800)
      return
    }

    if (mode === 'apply') {
      this.setData({
        isApply: true,
        pageTitle: '申请加入家族',
        submitText: '提交申请',
        heroDesc: '填写资料后将进入管理员审核，审核通过后即可使用完整族谱功能。'
      })
    }

    if (id) {
      const isSelfLimitedEdit = !app.globalData.isAdmin
        && Number(app.globalData.preferredMemberId || 0) === Number(id)

      if (!app.globalData.isAdmin && !isSelfLimitedEdit) {
        wx.showToast({
          title: '普通成员只能编辑自己的资料',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack({ delta: 1 })
        }, 800)
        return
      }

      this.setData({
        id,
        isEdit: true,
        isSelfLimitedEdit,
        pageTitle: isSelfLimitedEdit ? '编辑我的资料' : '编辑成员',
        submitText: isSelfLimitedEdit ? '保存资料' : '提交修改',
        heroDesc: isSelfLimitedEdit
          ? '当前仅可修改自己的头像和生日，其他字段保持只读。'
          : '修改后的信息会再次进入审核，请确认无误后再提交。'
      })
      this.loadDetail(id)
    }

    wx.setNavigationBarTitle({
      title: this.data.pageTitle
    })

    this.loadRelations()
  },

  parsePrefillOptions(options) {
    if (!options || !options.relation) return null
    const sourceId = options.sourceId ? Number(options.sourceId) : null
    const sourceGender = options.sourceGender ? Number(options.sourceGender) : null
    const sourceSpouseName = options.sourceSpouseName ? decodeURIComponent(options.sourceSpouseName) : ''
    return {
      relation: options.relation,
      sourceId: Number.isFinite(sourceId) && sourceId > 0 ? sourceId : null,
      sourceGender: Number.isFinite(sourceGender) ? sourceGender : null,
      sourceSpouseName: this.normalizeText(sourceSpouseName)
    }
  },

  normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
  },

  loadRelations() {
    api.getMemberList()
      .then((list) => {
        const members = (list || []).filter((member) => {
          if (!this.data.id) return true
          return Number(member.id) !== Number(this.data.id)
        })

        this.relationMembers = members
        this.relationMemberMap = members.reduce((acc, member) => {
          acc[member.id] = member
          return acc
        }, {})

        this.applyPrefillOptions()
        this.refreshRelationOptions()
      })
      .catch(() => {
        this.relationMembers = []
        this.relationMemberMap = {}
        this.refreshRelationOptions()
      })
  },

  loadDetail(id) {
    api.getMemberDetail(id)
      .then((member) => {
        this.setData({
          isExternalSpouseEdit: Number(member.isExternalSpouse || 0) === 1,
          spouseOwnerMemberName: member.spouseOwnerMemberName || '',
          heroDesc: this.data.isSelfLimitedEdit
            ? '当前仅可修改自己的头像和生日，其他字段保持只读。'
            : (Number(member.isExternalSpouse || 0) === 1
              ? `当前为配偶身份档案${member.spouseOwnerMemberName ? `，树上将挂靠 ${member.spouseOwnerMemberName} 展示。` : '。'}`
              : this.data.heroDesc),
          form: {
            name: member.name || '',
            gender: member.gender || 1,
            birthDate: member.birthDate || '',
            occupation: member.occupation || '',
            introduction: member.introduction || '',
            fatherId: member.fatherId || null,
            motherName: member.motherName || '',
            spouseName: member.spouseName || '',
            phone: member.phone || '',
            workplace: member.workplace || '',
            currentAddress: member.currentAddress || '',
            isAlive: member.isAlive == null ? 1 : Number(member.isAlive),
            deathDate: member.deathDate || '',
            avatarUrl: member.avatarUrl || ''
          },
          avatarPreview: member.avatarUrl || ''
        }, () => {
          this.refreshRelationOptions()
        })
      })
  },

  applyPrefillOptions() {
    if (this.data.isEdit || !this.prefillOptions || this.prefillOptions.relation !== 'child') return

    const nextForm = { ...this.data.form }
    const { sourceId, sourceGender, sourceSpouseName } = this.prefillOptions

    if (!sourceId || sourceGender !== 1) return

    nextForm.fatherId = sourceId
    nextForm.motherName = sourceSpouseName || ''
    this.setData({
      form: nextForm,
      parentModeHint: sourceSpouseName ? '已从当前男性成员预填母亲姓名。' : '当前男性成员尚未填写妻子姓名，可直接补录母亲姓名。'
    })
  },

  refreshRelationOptions() {
    const fatherMembers = (this.relationMembers || []).filter((member) => Number(member.gender) === 1)
    const options = ['无']
    const ids = [null]
    fatherMembers.forEach((member) => {
      options.push(member.name)
      ids.push(member.id)
    })

    this.setData({
      fatherOptions: options,
      fatherIds: ids,
      fatherIndex: this.findRelationIndex(ids, this.data.form.fatherId)
    })
  },

  findRelationIndex(ids, targetId) {
    if (!ids || ids.length === 0) return 0
    const index = ids.findIndex((id) => Number(id) === Number(targetId))
    return index >= 0 ? index : 0
  },

  onNameChange(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  onGenderChange(e) {
    if (this.data.isExternalSpouseEdit) {
      return
    }
    const gender = Number(e.detail.value) + 1
    this.setData({ 'form.gender': gender })
    if (gender !== 1 && this.data.form.spouseName) {
      this.setData({ 'form.spouseName': '' })
    }
  },

  onBirthChange(e) {
    this.setData({ 'form.birthDate': e.detail.value })
  },

  onOccupationChange(e) {
    this.setData({ 'form.occupation': e.detail.value })
  },

  onIntroChange(e) {
    this.setData({ 'form.introduction': e.detail.value })
  },

  onFatherChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      fatherIndex: index,
      'form.fatherId': this.data.fatherIds[index]
    })
  },

  onMotherNameChange(e) {
    this.setData({ 'form.motherName': e.detail.value })
  },

  onSpouseNameChange(e) {
    this.setData({ 'form.spouseName': e.detail.value })
  },

  onPhoneChange(e) {
    this.setData({ 'form.phone': e.detail.value })
  },

  onWorkplaceChange(e) {
    this.setData({ 'form.workplace': e.detail.value })
  },

  onAddressChange(e) {
    this.setData({ 'form.currentAddress': e.detail.value })
  },

  onAliveChange(e) {
    const isAlive = Number(e.detail.value) === 0 ? 1 : 2
    this.setData({ 'form.isAlive': isAlive })
    if (isAlive === 1) {
      this.setData({ 'form.deathDate': '' })
    }
  },

  onDeathChange(e) {
    this.setData({ 'form.deathDate': e.detail.value })
  },

  onChooseAvatar() {
    if (this.data.uploadingAvatar) return

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

        if (!tempPath) return

        this.setData({ uploadingAvatar: true })
        wx.showLoading({ title: '上传中...', mask: true })

        wx.compressImage({
          src: tempPath,
          quality: 60,
          success: (compressRes) => {
            this.uploadAvatarToServer(compressRes.tempFilePath || tempPath)
          },
          fail: () => {
            this.uploadAvatarToServer(tempPath)
          }
        })
      }
    })
  },

  uploadAvatarToServer(filePath) {
    api.uploadAvatar(filePath)
      .then((url) => {
        wx.hideLoading()
        this.setData({
          uploadingAvatar: false,
          avatarPreview: url,
          'form.avatarUrl': url
        })
        wx.showToast({ title: '头像上传成功', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ uploadingAvatar: false })
        console.error('上传头像失败', err)
        wx.showToast({ title: '上传失败，请稍后重试', icon: 'none' })
      })
  },

  submit() {
    const { form, isEdit, id, isApply, isSelfLimitedEdit, submitting, uploadingAvatar } = this.data
    if (submitting || uploadingAvatar) return

    const name = this.normalizeText(form.name)
    if (!isSelfLimitedEdit && !name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    const payload = isSelfLimitedEdit
      ? {
          birthDate: form.birthDate,
          avatarUrl: form.avatarUrl
        }
      : (this.data.isExternalSpouseEdit
      ? {
          name,
          gender: 2,
          birthDate: form.birthDate,
          occupation: form.occupation,
          introduction: form.introduction,
          phone: form.phone,
          workplace: form.workplace,
          currentAddress: form.currentAddress,
          isAlive: form.isAlive,
          deathDate: form.deathDate,
          avatarUrl: form.avatarUrl
        }
      : {
          ...form,
          name,
          spouseName: form.gender === 1 ? this.normalizeText(form.spouseName) : '',
          motherName: this.normalizeText(form.motherName)
        })

    if (payload.isAlive === 1) {
      payload.deathDate = ''
    }

    this.setData({ submitting: true })

    const action = isApply
      ? api.submitAudit(payload)
      : (isEdit ? api.updateMember(id, payload) : api.createMember(payload))

    action
      .then(() => {
        const toastTitle = isApply ? '已提交申请' : (isEdit ? '已提交修改' : '已提交审核')
        wx.showToast({ title: toastTitle, icon: 'success' })

        setTimeout(() => {
          if (isApply) {
            app.clearLoginInfo()
            wx.reLaunch({ url: '/pages/login/login' })
            return
          }
          wx.navigateBack()
        }, 1500)
      })
      .catch(() => {})
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
