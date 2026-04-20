const api = require('../../utils/api.js')
const app = getApp()

const TREE_VIEW_PEDIGREE = 'pedigree_focus'
const TREE_VIEW_OVERVIEW = 'overview_tree'
const TREE_VIEW_CLASSIC = 'classic'
const PEDIGREE_ORIENT = 'TB'
const OVERVIEW_ORIENT = 'LR'
const SIBLING_GROUP_THRESHOLD = 6
const SIBLING_GROUP_VISIBLE_COUNT = 5
const LOCATE_FEEDBACK_DURATION = 1800
const OVERVIEW_TAP_SUPPRESS_DURATION = 180
const OVERVIEW_PINCH_SENSITIVITY = 0.60

const RELATIVE_LABELS = {
  '-5': '上五代',
  '-4': '上四代',
  '-3': '上三代',
  '-2': '祖辈层',
  '-1': '父母层',
  '0': '当前焦点',
  '1': '子女层',
  '2': '孙辈层',
  '3': '曾孙层',
  '4': '下四代',
  '5': '下五代'
}

Page({
  data: {
    loading: false,
    members: [],
    displayList: [],

    treeViewMode: TREE_VIEW_OVERVIEW,

    preferredMemberId: null,
    preferredMemberName: '',
    displayMemberId: null,
    displayMemberName: '',
    identityType: null,
    preferredMemberVisible: false,
    spouseOwnerMemberName: '',
    preferredMissing: false,
    authRequired: false,
    loadErrorText: '',

    centerMemberId: null,
    centerMemberName: '',
    focusMemberId: null,
    focusSummaryText: '',
    rangeSummaryText: '',
    identitySummaryText: '',
    toolbarSummaryText: '关系树 · 父子关系优先',
    currentRuleText: '默认展示 4/5 代，可展开子支或按代继续展开',

    visibleMinGen: 0,
    visibleMaxGen: 0,
    densityTier: 'comfortable',
    densityTierLabel: '舒展布局',

    pedigreeNodes: [],
    pedigreeEdges: [],
    pedigreeLabels: [],
    pedigreeCanvasStyle: '',
    pedigreeCanvasWidth: 0,
    pedigreeCanvasHeight: 0,
    pedigreeTargetId: '',
    pedigreeScrollLeft: 0,
    pedigreeScrollTop: 0,
    pedigreeViewportWidth: 0,
    pedigreeViewportHeight: 0,

    overviewNodes: [],
    overviewEdges: [],
    overviewLabels: [],
    overviewCanvasStyle: '',
    overviewTargetId: '',
    overviewCanvasWidth: 0,
    overviewCanvasHeight: 0,
    overviewRenderNodes: [],
    overviewRenderEdges: [],
    overviewRenderLabels: [],
    overviewScale: 0.6,
    overviewBaseScale: 0.6,
    overviewMinScale: 0.35,
    overviewMaxScale: 2.2,
    overviewScrollLeft: 0,
    overviewScrollTop: 0,
    overviewViewportWidth: 0,
    overviewViewportHeight: 0,
    overviewScaleShellStyle: '',
    overviewCanvasInnerStyle: '',
    transientOverviewTransform: '',

    sideGroupCards: [],

    showClassicFallback: false,
    selectMode: '',
    selectionSummaryText: '',
    selectionHintText: '',

    locatePulseNodeId: null,
    locateToastText: '',
    locatePulseUntil: 0,
    locateCalloutStyle: '',
    locateCalloutArrowStyle: '',
    locateCalloutDirection: '',
    overviewScrollEnabled: true,
    overviewSceneFxClass: ''
  },

  onLoad(options) {
    this.numMap = {}
    this.childrenMap = {}
    this.primaryChildrenMap = {}
    this.parentLinksMap = {}
    this.primaryParentMap = {}
    this.generationMap = {}
    this.flatList = []
    this.rootNodes = []
    this.spouseNameMap = {}
    this.maxDescGenCache = {}
    this.windowState = null
    this.expandedBranchMap = {}
    this.expandedSiblingGroupMap = {}
    this.classicExpandedMap = {}
    this.globalMinGen = 0
    this.globalMaxGen = 0
    this.pedigreeHasInitialized = false
    this.pendingPedigreeReset = true
    this.pedigreeViewportRect = null
    this.overviewHasInitialized = false
    this.pendingOverviewReset = true
    this.overviewScrollState = {
      left: 0,
      top: 0
    }
    this.overviewPinching = false
    this.overviewGestureSessionActive = false
    this.overviewTapSuppressUntil = 0
    this.pendingOverviewPinchSeed = null
    this.overviewPinchState = null
    this.overviewTapCandidate = null
    this.overviewViewportRect = null
    this.activePinchViewportRect = null
    this.overviewPinchThrottleMs = 16
    this.overviewLastDirectTapAt = 0
    this.overviewLayout = null
    this.overviewSceneFxTimer = null
    this.locatePulseTimer = null
    this.openerEventChannel = typeof this.getOpenerEventChannel === 'function'
      ? this.getOpenerEventChannel()
      : null

    const preferredMemberId = this.getPreferredMemberId()
    const displayMemberId = this.getDisplayMemberId()
    const selectMode = options && (options.selectMode === 'self' || options.selectMode === 'spouseOwner')
      ? options.selectMode
      : ''
    const initialView = options && options.initialView === TREE_VIEW_OVERVIEW
      ? TREE_VIEW_OVERVIEW
      : ''
    const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.rpxRatio = (windowInfo.windowWidth || 375) / 750
    this.initialTreeViewMode = this.resolveInitialTreeViewMode(selectMode, initialView)

    if (selectMode) {
      wx.setNavigationBarTitle({
        title: selectMode === 'self' ? '从家族树选择本人' : '从家族树选择丈夫'
      })
    }

    this.setData({
      preferredMemberId,
      displayMemberId,
      selectMode,
      treeViewMode: this.initialTreeViewMode,
      selectionSummaryText: this.getSelectionSummaryText(selectMode),
      selectionHintText: this.getSelectionHintText(selectMode)
    })
  },

  onShow() {
    this.reloadTreeWithIdentity({
      forceIdentityRefresh: true
    })
  },

  onPullDownRefresh() {
    this.reloadTreeWithIdentity({
      forceIdentityRefresh: true
    }).finally(() => wx.stopPullDownRefresh())
  },

  onUnload() {
    this.clearLocatePulse()
    if (this.overviewSceneFxTimer) {
      clearTimeout(this.overviewSceneFxTimer)
      this.overviewSceneFxTimer = null
    }
    this.clearOverviewGestureState()
  },

  getPreferredMemberId() {
    const raw = app.globalData.preferredMemberId || (app.globalData.userInfo && app.globalData.userInfo.preferredMemberId)
    if (raw === null || raw === undefined || raw === '') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  },

  getDisplayMemberId() {
    const raw = app.globalData.displayMemberId
      || (app.globalData.userInfo && app.globalData.userInfo.displayMemberId)
      || app.globalData.preferredMemberId
      || (app.globalData.userInfo && app.globalData.userInfo.preferredMemberId)
    if (raw === null || raw === undefined || raw === '') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  },

  resolveInitialTreeViewMode(selectMode, initialView) {
    if (initialView === TREE_VIEW_PEDIGREE) {
      return TREE_VIEW_PEDIGREE
    }
    return TREE_VIEW_OVERVIEW
  },

  reloadTreeWithIdentity(options = {}) {
    const refreshPromise = app.checkLogin()
      ? app.refreshIdentityMeta({
        force: !!options.forceIdentityRefresh
      })
      : Promise.resolve(null)

    return refreshPromise
      .catch(() => null)
      .finally(() => {
        this.syncIdentityMeta()
      })
      .then(() => {
        if (app.globalData.__authRedirecting) {
          return null
        }
        return this.loadTree()
      })
  },

  getIdentitySummaryText(preferredMemberName, displayMemberName, identityType) {
    if (!preferredMemberName) return ''
    if (identityType === 'EXTERNAL_SPOUSE') {
      return `当前身份：${preferredMemberName}（配偶身份，挂靠${displayMemberName || '关联成员'}）`
    }
    return `当前身份：${preferredMemberName}`
  },

  getSelectionSummaryText(selectMode) {
    if (selectMode === 'self') {
      return '选择本人：点成员节点返回绑定页，已故成员仅作关系参考。'
    }
    if (selectMode === 'spouseOwner') {
      return '选择丈夫：点男性成员节点返回绑定页，已故丈夫也可选择。'
    }
    return ''
  },

  getSelectionHintText(selectMode) {
    if (selectMode === 'self') {
      return '点节点选择本人，点“关系”只切换当前焦点。'
    }
    if (selectMode === 'spouseOwner') {
      return '点男性节点选择丈夫，点“关系”继续浏览这支家族树。'
    }
    return ''
  },

  syncIdentityMeta() {
    const preferredMemberId = this.getPreferredMemberId()
    const displayMemberId = this.getDisplayMemberId()
    const preferredMemberName = (app.globalData.userInfo && app.globalData.userInfo.preferredMemberName) || this.data.preferredMemberName || ''
    const displayMemberName = app.globalData.displayMemberName
      || (app.globalData.userInfo && app.globalData.userInfo.displayMemberName)
      || ''
    const identityType = app.globalData.identityType
      || (app.globalData.userInfo && app.globalData.userInfo.identityType)
      || null
    const preferredMemberVisible = !!(app.globalData.preferredMemberVisible
      || (app.globalData.userInfo && app.globalData.userInfo.preferredMemberVisible))
    const spouseOwnerMemberName = app.globalData.spouseOwnerMemberName
      || (app.globalData.userInfo && app.globalData.userInfo.spouseOwnerMemberName)
      || ''

    if (preferredMemberId === this.data.preferredMemberId
      && displayMemberId === this.data.displayMemberId
      && identityType === this.data.identityType
      && preferredMemberVisible === this.data.preferredMemberVisible
      && preferredMemberName === this.data.preferredMemberName
      && displayMemberName === this.data.displayMemberName
      && spouseOwnerMemberName === this.data.spouseOwnerMemberName) {
      return
    }

    this.setData({
      preferredMemberId,
      preferredMemberName,
      displayMemberId,
      displayMemberName,
      identityType,
      preferredMemberVisible,
      spouseOwnerMemberName,
      identitySummaryText: this.getIdentitySummaryText(preferredMemberName, displayMemberName, identityType),
      preferredMissing: false
    })
  },

  sanitizeText(value) {
    return String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  },

  toNumber(value) {
    if (value === null || value === undefined || value === '') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  },

  normalizeMember(member) {
    return {
      ...member,
      id: this.toNumber(member.id),
      fatherId: this.toNumber(member.fatherId),
      motherId: this.toNumber(member.motherId),
      spouseId: this.toNumber(member.spouseId),
      generation: this.toNumber(member.generation),
      gender: this.toNumber(member.gender),
      isAlive: this.toNumber(member.isAlive),
      name: this.sanitizeText(member.name)
    }
  },

  compareMembers(a, b) {
    const orderA = this.toNumber(a.sortOrder || a.orderNo)
    const orderB = this.toNumber(b.sortOrder || b.orderNo)
    if (a.generation !== b.generation) return a.generation - b.generation
    if (orderA !== orderB) return orderA - orderB
    if (a.name && b.name && a.name !== b.name) return a.name.localeCompare(b.name)
    return a.id - b.id
  },

  buildMaps(list) {
    const numMap = {}
    ;(Array.isArray(list) ? list : []).forEach((rawMember) => {
      if (!rawMember || !rawMember.id) return
      const member = this.normalizeMember(rawMember)
      if (!member.id) return
      numMap[member.id] = member
    })

    const childrenMap = {}
    const primaryChildrenMap = {}
    const parentLinksMap = {}
    const primaryParentMap = {}
    const generationMap = {}

    Object.values(numMap).forEach((member) => {
      if (!generationMap[member.generation]) generationMap[member.generation] = []
      generationMap[member.generation].push(member)

      const parents = [member.fatherId, member.motherId].filter((parentId) => parentId && numMap[parentId])
      parentLinksMap[member.id] = parents

      parents.forEach((parentId) => {
        if (!childrenMap[parentId]) childrenMap[parentId] = []
        childrenMap[parentId].push(member)
      })

      const primaryParentId = member.fatherId && numMap[member.fatherId]
        ? member.fatherId
        : (member.motherId && numMap[member.motherId] ? member.motherId : 0)

      primaryParentMap[member.id] = primaryParentId || 0
      if (primaryParentId) {
        if (!primaryChildrenMap[primaryParentId]) primaryChildrenMap[primaryParentId] = []
        primaryChildrenMap[primaryParentId].push(member)
      }
    })

    Object.values(childrenMap).forEach((items) => items.sort((a, b) => this.compareMembers(a, b)))
    Object.values(primaryChildrenMap).forEach((items) => items.sort((a, b) => this.compareMembers(a, b)))
    Object.values(generationMap).forEach((items) => items.sort((a, b) => this.compareMembers(a, b)))

    this.numMap = numMap
    this.childrenMap = childrenMap
    this.primaryChildrenMap = primaryChildrenMap
    this.parentLinksMap = parentLinksMap
    this.primaryParentMap = primaryParentMap
    this.generationMap = generationMap
    this.flatList = Object.values(numMap).sort((a, b) => this.compareMembers(a, b))
    this.rootNodes = this.flatList.filter((member) => !primaryParentMap[member.id])
    this.spouseNameMap = this.buildSpouseNameMap(numMap)
    this.maxDescGenCache = {}

    const generations = Object.keys(generationMap).map((item) => Number(item)).filter((item) => Number.isFinite(item))
    this.globalMinGen = generations.length ? Math.min(...generations) : 0
    this.globalMaxGen = generations.length ? Math.max(...generations) : 0

    this.classicExpandedMap = {}
    this.rootNodes.forEach((member) => {
      this.classicExpandedMap[member.id] = true
    })
  },

  buildSpouseNameMap(numMap) {
    const spouseNameMap = {}
    Object.values(numMap).forEach((member) => {
      if (member.spouseName) {
        spouseNameMap[member.id] = this.sanitizeText(member.spouseName)
      }
      if (member.spouseId && numMap[member.spouseId]) {
        spouseNameMap[member.id] = numMap[member.spouseId].name
        if (!spouseNameMap[member.spouseId]) spouseNameMap[member.spouseId] = member.name
      }
    })
    return spouseNameMap
  },

  resolveFallbackMemberId() {
    if (this.data.displayMemberId && this.numMap[this.data.displayMemberId]) return this.data.displayMemberId
    if (this.data.preferredMemberId && this.numMap[this.data.preferredMemberId]) return this.data.preferredMemberId
    if (!this.flatList.length) return null
    const middleIndex = Math.floor(this.flatList.length / 2)
    return this.flatList[middleIndex].id
  },

  loadTree() {
    this.setData({ loading: true })
    return api.getFamilyTree().then((list) => {
      this.buildMaps(list)

      const preferredMemberId = this.getPreferredMemberId()
      const displayMemberId = this.getDisplayMemberId()
      const preferredMemberName = (app.globalData.userInfo && app.globalData.userInfo.preferredMemberName) || ''
      const displayMemberName = app.globalData.displayMemberName || ''
      const identityType = app.globalData.identityType || null
      const preferredMemberVisible = !!app.globalData.preferredMemberVisible
      const displayMember = displayMemberId ? this.numMap[displayMemberId] : null
      const preferredMissing = !!(displayMemberId || preferredMemberId) && !displayMember
      const centerMemberId = displayMember ? displayMember.id : this.resolveFallbackMemberId()
      const activeTreeViewMode = [TREE_VIEW_PEDIGREE, TREE_VIEW_OVERVIEW, TREE_VIEW_CLASSIC].includes(this.data.treeViewMode)
        ? this.data.treeViewMode
        : (this.initialTreeViewMode || TREE_VIEW_PEDIGREE)

      this.expandedBranchMap = {}
      this.expandedSiblingGroupMap = {}
      this.windowState = centerMemberId ? this.resolveReadableWindow(centerMemberId) : null
      this.pendingPedigreeReset = true
      this.pedigreeHasInitialized = false
      this.pendingOverviewReset = true
      this.overviewHasInitialized = false

      this.setData({
        members: this.flatList,
        preferredMemberId,
        preferredMemberName,
        displayMemberId,
        displayMemberName,
        identityType,
        preferredMemberVisible,
        spouseOwnerMemberName: app.globalData.spouseOwnerMemberName || '',
        preferredMissing,
        authRequired: false,
        loadErrorText: '',
        centerMemberId,
        focusMemberId: centerMemberId,
        identitySummaryText: this.getIdentitySummaryText(preferredMemberName, displayMemberName, identityType),
        showClassicFallback: false,
        treeViewMode: activeTreeViewMode
      }, () => this.applyView())
    }).catch((error) => {
      console.error('load tree failed', error)
      const authRequired = Number(error && error.code) === 401
      this.overviewLayout = null
      this.setData({
        loading: false,
        members: [],
        displayList: [],
        pedigreeNodes: [],
        pedigreeEdges: [],
        overviewNodes: [],
        overviewEdges: [],
        overviewLabels: [],
        overviewRenderNodes: [],
        overviewRenderEdges: [],
        overviewRenderLabels: [],
        ...this.getEmptyLocateCallout(),
        authRequired,
        loadErrorText: authRequired ? '登录状态已失效，请重新登录后再查看家族树。' : '家族树数据暂时加载失败，请稍后重试。',
        toolbarSummaryText: authRequired ? '登录状态已失效' : '家族树加载失败',
        currentRuleText: authRequired ? '请重新登录后再查看' : '下拉页面可重新尝试加载'
      })
      if (!authRequired) {
        wx.showToast({ title: '家族树加载失败', icon: 'none' })
      }
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  resolveReadableWindow(centerId) {
    const center = this.numMap[centerId]
    if (!center) {
      return {
        visibleMinGen: 0,
        visibleMaxGen: 0,
        densityTier: 'comfortable',
        densityTierLabel: '舒展布局'
      }
    }

    const hasChildren = this.getMemberChildren(centerId).length > 0
    const preferredRange = hasChildren
      ? { min: center.generation - 2, max: center.generation + 2 }
      : { min: center.generation - 4, max: center.generation }
    const fallbackRange = hasChildren
      ? { min: center.generation - 2, max: center.generation + 1 }
      : { min: center.generation - 3, max: center.generation }

    const preferred = this.clampRange(preferredRange.min, preferredRange.max)
    const preferredMetrics = this.measureWindow(centerId, preferred.min, preferred.max)

    let chosen = preferred
    let metrics = preferredMetrics
    if (preferredMetrics.nodeCount > 32 || preferredMetrics.maxWidth > 8) {
      chosen = this.clampRange(fallbackRange.min, fallbackRange.max)
      metrics = this.measureWindow(centerId, chosen.min, chosen.max)
    }

    return {
      visibleMinGen: chosen.min,
      visibleMaxGen: chosen.max,
      densityTier: metrics.nodeCount > 24 || metrics.maxWidth > 6 ? 'compact' : 'comfortable',
      densityTierLabel: metrics.nodeCount > 24 || metrics.maxWidth > 6 ? '自动收敛到清晰布局' : '舒展布局'
    }
  },

  clampRange(minGen, maxGen) {
    return {
      min: Math.max(this.globalMinGen, minGen),
      max: Math.min(this.globalMaxGen, maxGen)
    }
  },

  measureWindow(centerId, minGen, maxGen) {
    const ids = new Set([centerId])
    this.collectAncestorIds(centerId, minGen, ids)
    this.collectDescendantIds(centerId, maxGen, ids)

    const counts = {}
    ids.forEach((memberId) => {
      const member = this.numMap[memberId]
      if (!member) return
      if (!counts[member.generation]) counts[member.generation] = 0
      counts[member.generation] += 1
    })

    const maxWidth = Object.keys(counts).length ? Math.max(...Object.values(counts)) : 1
    return {
      nodeCount: ids.size,
      maxWidth
    }
  },

  collectAncestorIds(memberId, minGen, resultSet) {
    const member = this.numMap[memberId]
    if (!member) return
    const parentIds = this.parentLinksMap[memberId] || []
    parentIds.forEach((parentId) => {
      const parent = this.numMap[parentId]
      if (!parent || parent.generation < minGen || resultSet.has(parentId)) return
      resultSet.add(parentId)
      this.collectAncestorIds(parentId, minGen, resultSet)
    })
  },

  collectDescendantIds(memberId, maxGen, resultSet) {
    const children = this.getMemberChildren(memberId)
    children.forEach((child) => {
      if (!child || child.generation > maxGen || resultSet.has(child.id)) return
      resultSet.add(child.id)
      this.collectDescendantIds(child.id, maxGen, resultSet)
    })
  },

  getMemberChildren(memberId) {
    return this.childrenMap[memberId] || []
  },

  getSiblings(memberId) {
    const parentIds = this.parentLinksMap[memberId] || []
    const siblingMap = {}
    parentIds.forEach((parentId) => {
      const siblings = this.childrenMap[parentId] || []
      siblings.forEach((member) => {
        if (member.id !== memberId) siblingMap[member.id] = member
      })
    })
    return Object.values(siblingMap).sort((a, b) => this.compareMembers(a, b))
  },

  getGenderText(member) {
    if (Number(member.gender) === 1) return '男'
    if (Number(member.gender) === 2) return '女'
    return '成员'
  },

  getAliveText(member) {
    if (Number(member.isAlive) === 1) return '健在'
    if (Number(member.isAlive) === 2) return '已故'
    return ''
  },

  getRelativeLabel(relative) {
    const key = String(relative)
    if (RELATIVE_LABELS[key]) return RELATIVE_LABELS[key]
    if (relative < 0) return `上${Math.abs(relative)}代`
    if (relative > 0) return `下${relative}代`
    return '当前焦点'
  },


  computeMaxDescendantGeneration(memberId) {
    if (this.maxDescGenCache[memberId]) return this.maxDescGenCache[memberId]
    const member = this.numMap[memberId]
    if (!member) return 0
    const children = this.getMemberChildren(memberId)
    if (!children.length) {
      this.maxDescGenCache[memberId] = member.generation
      return member.generation
    }
    const maxDescGen = Math.max(member.generation, ...children.map((child) => this.computeMaxDescendantGeneration(child.id)))
    this.maxDescGenCache[memberId] = maxDescGen
    return maxDescGen
  },

  computeMinAncestorGeneration(memberId) {
    const member = this.numMap[memberId]
    if (!member) return 0
    const parentIds = this.parentLinksMap[memberId] || []
    if (!parentIds.length) return member.generation
    return Math.min(member.generation, ...parentIds.map((parentId) => this.computeMinAncestorGeneration(parentId)))
  },

  canExpandBranch(memberId) {
    const member = this.numMap[memberId]
    if (!member) return false
    const maxDescGen = this.computeMaxDescendantGeneration(memberId)
    const visibleDepth = Math.max(this.windowState.visibleMaxGen - member.generation, 0)
    const branchDepth = Number(this.expandedBranchMap[memberId] || 0)
    return maxDescGen > member.generation + visibleDepth + branchDepth
  },


  getGenderTag(member) {
    if (Number(member && member.gender) === 1) return '\u7537'
    if (Number(member && member.gender) === 2) return '\u5973'
    return ''
  },

  getAliveStatus(member) {
    if (Number(member && member.isAlive) === 1) return 'alive'
    if (Number(member && member.isAlive) === 0 || Number(member && member.isAlive) === 2) return 'deceased'
    return 'unknown'
  },

  getDisplayName(member) {
    return member && member.name ? String(member.name) : 'Unknown'
  },

  getSpouseText(member) {
    const spouseName = this.spouseNameMap[member.id]
    if (!spouseName) return ''
    if (Number(member.gender) !== 1) return ''
    return `\uff08\u59bb\uff1a${spouseName}\uff09`
  },

  isSpouseAttachNode(memberId) {
    return this.data.identityType === 'EXTERNAL_SPOUSE'
      && Number(memberId) === Number(this.data.displayMemberId)
  },

  isLocatePulseActiveFor(memberId) {
    return Number(memberId) === Number(this.data.locatePulseNodeId)
      && Number(this.data.locatePulseUntil || 0) > Date.now()
  },

  getLocateHintText(memberId) {
    if (this.isSpouseAttachNode(memberId)) {
      return this.isLocatePulseActiveFor(memberId)
        ? '配偶本人在此挂靠 · 我在这里'
        : '配偶本人在此挂靠'
    }
    return ''
  },

  getLocateBadgeText(memberId) {
    if (!this.isLocatePulseActiveFor(memberId)) {
      return ''
    }

    if (this.isSpouseAttachNode(memberId)) {
      return '挂靠在此 · 我在这里'
    }

    if (Number(memberId) === Number(this.data.displayMemberId)
      || Number(memberId) === Number(this.data.preferredMemberId)) {
      return '我在这里'
    }

    return ''
  },

  getNodeBadgeText(memberId) {
    const isVisibleSelf = this.data.preferredMemberVisible && Number(memberId) === Number(this.data.preferredMemberId)
    if (this.isSpouseAttachNode(memberId)) {
      return this.isLocatePulseActiveFor(memberId) ? '我在这里' : '配偶挂靠'
    }
    if (isVisibleSelf) {
      return '本人'
    }
    if (this.data.identityType === 'EXTERNAL_SPOUSE' && Number(memberId) === Number(this.data.displayMemberId)) {
      return '配偶身份'
    }
    if (Number(memberId) === Number(this.data.centerMemberId)) {
      return '焦点'
    }
    return ''
  },

  mapMemberToNode(member, extra = {}) {
    const showExpandEntry = !!extra.allowExpand && this.canExpandBranch(member.id)
    return {
      id: member.id,
      anchorId: extra.anchorId || `node-${member.id}`,
      displayName: this.getDisplayName(member),
      genderTag: this.getGenderTag(member),
      secondaryText: extra.secondaryText !== undefined ? extra.secondaryText : this.getSpouseText(member),
      meta: extra.meta || '',
      aliveStatus: this.getAliveStatus(member),
      badgeText: extra.badgeText || '',
      relationText: extra.relationText || '',
      left: extra.left || 0,
      top: extra.top || 0,
      width: extra.width || 0,
      height: extra.height || 0,
      isSelf: this.data.preferredMemberVisible && Number(member.id) === Number(this.data.preferredMemberId),
      isFocus: Number(member.id) === Number(this.data.centerMemberId),
      isLocatePulse: this.isLocatePulseActiveFor(member.id),
      isSpouseAttach: this.isSpouseAttachNode(member.id),
      isRelated: !!extra.isRelated,
      isGroupNode: false,
      groupParentId: 0,
      tapAction: extra.tapAction || 'detail',
      focusAction: extra.focusAction || 'focus',
      focusEntryText: extra.focusEntryText || '\u5173\u7cfb',
      showFocusEntry: extra.showFocusEntry !== false,
      showExpandEntry,
      canExpandBranch: showExpandEntry,
      expandText: Number(this.expandedBranchMap[member.id] || 0) > 0 ? '\u518d\u5c55\u5f00' : '\u5c55\u5f00\u5b50\u652f',
      selectStateClass: extra.selectStateClass || '',
      selectionDisabled: !!extra.selectionDisabled,
      selectHintText: extra.selectHintText || '',
      locateHintText: extra.locateHintText !== undefined ? extra.locateHintText : this.getLocateHintText(member.id),
      locateBadgeText: extra.locateBadgeText !== undefined ? extra.locateBadgeText : this.getLocateBadgeText(member.id)
    }
  },

  getSelectionState(member) {
    if (!this.data.selectMode || !member || !member.id) {
      return {
        selectable: false,
        reason: '',
        hint: ''
      }
    }

    if (this.data.selectMode === 'self') {
      if (Number(member.isAlive) === 0) {
        return {
          selectable: false,
          reason: '已故成员不可作为本人身份绑定',
          hint: '已故成员 · 不可选'
        }
      }
      return {
        selectable: true,
        reason: '',
        hint: '点按即可选择本人'
      }
    }

    if (this.data.selectMode === 'spouseOwner') {
      if (Number(member.gender) !== 1) {
        return {
          selectable: false,
          reason: '只有男性成员可作为挂靠丈夫',
          hint: '仅男性成员可选'
        }
      }
      if (Number(member.isAlive) === 0) {
        return {
          selectable: true,
          reason: '',
          hint: '已故丈夫可选'
        }
      }
      return {
        selectable: true,
        reason: '',
        hint: '点按即可选择丈夫'
      }
    }

    return {
      selectable: false,
      reason: '',
      hint: ''
    }
  },

  collectFocusVisibleIds(centerId) {
    const resultSet = new Set([centerId])
    this.collectAncestorIds(centerId, this.windowState.visibleMinGen, resultSet)
    this.collectDescendantIdsWithExpansion(centerId, this.windowState.visibleMaxGen, resultSet, 0)
    if (Number(centerId) === Number(this.data.displayMemberId)) {
      this.getSiblings(centerId).forEach((member) => {
        if (member && member.id) resultSet.add(member.id)
      })
    }
    return resultSet
  },

  shouldFoldSpouseNode(memberId, visibleSet, centerId) {
    const member = this.numMap[memberId]
    if (!member) return false
    if (Number(member.id) === Number(centerId)) return false
    if (Number(member.id) === Number(this.data.displayMemberId)) return false
    if (Number(member.gender) !== 2) return false

    const spouseId = Number(member.spouseId || 0)
    if (!spouseId || !visibleSet.has(spouseId)) return false

    const spouse = this.numMap[spouseId]
    if (!spouse || Number(spouse.gender) !== 1) return false
    if (Number(spouse.spouseId || 0) !== Number(member.id)) return false

    const visibleChildren = (this.childrenMap[member.id] || []).filter((child) => visibleSet.has(child.id))
    const isRequiredAsPrimaryParent = visibleChildren.some((child) => Number(this.primaryParentMap[child.id] || 0) === Number(member.id))
    if (isRequiredAsPrimaryParent) return false

    return true
  },

  filterPedigreeVisibleIds(visibleSet, centerId) {
    if (this.data.selectMode) {
      return new Set(visibleSet)
    }
    const filteredSet = new Set(visibleSet)
    Array.from(visibleSet).forEach((memberId) => {
      if (this.shouldFoldSpouseNode(memberId, visibleSet, centerId)) {
        filteredSet.delete(memberId)
      }
    })
    return filteredSet
  },

  collectDescendantIdsWithExpansion(memberId, maxGen, resultSet, extraDepth) {
    const children = this.getMemberChildren(memberId)
    children.forEach((child) => {
      const branchDepth = Number(this.expandedBranchMap[memberId] || 0)
      const allowance = Math.max(extraDepth, branchDepth)
      const inBaseRange = child.generation <= maxGen
      if (!inBaseRange && allowance <= 0) return
      if (!resultSet.has(child.id)) resultSet.add(child.id)
      const nextDepth = inBaseRange ? allowance : Math.max(allowance - 1, 0)
      this.collectDescendantIdsWithExpansion(child.id, maxGen, resultSet, nextDepth)
    })
  },

  buildRelatedSet(centerId, visibleSet) {
    const related = new Set()
    const visitUp = (memberId) => {
      related.add(memberId)
      ;(this.parentLinksMap[memberId] || []).forEach((parentId) => {
        if (visibleSet.has(parentId) && !related.has(parentId)) visitUp(parentId)
      })
    }
    const visitDown = (memberId) => {
      related.add(memberId)
      this.getMemberChildren(memberId).forEach((child) => {
        if (visibleSet.has(child.id) && !related.has(child.id)) visitDown(child.id)
      })
    }
    if (visibleSet.has(centerId)) {
      visitUp(centerId)
      visitDown(centerId)
    }
    return related
  },

  makeEdge(axis, left, top, width, height, highlight) {
    return {
      axis,
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
      highlight: !!highlight
    }
  },

  buildTreeState(visibleIds, options = {}) {
    const visibleSet = new Set(Array.from(visibleIds).filter((id) => this.numMap[id]))
    if (!visibleSet.size) {
      return {
        nodes: [],
        edges: [],
        labels: [],
        canvasStyle: 'width: 960rpx; height: 800rpx;',
        targetId: ''
      }
    }

    const orient = options.orient || 'TB'
    const cardWidth = options.cardWidth || 220
    const cardHeight = options.cardHeight || 180
    const siblingGap = options.siblingGap || 24
    const rootGap = options.rootGap || 40
    const layerGap = options.layerGap || 110
    const labelPad = options.labelPad || 120
    const sidePad = options.sidePad || 56
    const topPad = options.topPad || 80
    const groupThreshold = options.groupThreshold || SIBLING_GROUP_THRESHOLD
    const groupVisibleCount = options.groupVisibleCount || SIBLING_GROUP_VISIBLE_COUNT
    const generationCounts = {}
    const visibleChildrenMap = {}
    const nodeRecordMap = {}
    const virtualNodeMap = {}
    const protectedNodeSet = new Set()

    const markProtectedPath = (memberId) => {
      let currentId = Number(memberId || 0)
      while (currentId && visibleSet.has(currentId) && !protectedNodeSet.has(currentId)) {
        protectedNodeSet.add(currentId)
        currentId = Number(this.primaryParentMap[currentId] || 0)
      }
    }

    visibleSet.forEach((memberId) => {
      const member = this.numMap[memberId]
      nodeRecordMap[String(memberId)] = member
      generationCounts[member.generation] = (generationCounts[member.generation] || 0) + 1
    })
    markProtectedPath(this.data.displayMemberId || this.data.preferredMemberId)
    markProtectedPath(this.data.centerMemberId)
    if (Number(this.data.centerMemberId) === Number(this.data.displayMemberId || this.data.preferredMemberId)) {
      this.getSiblings(this.data.displayMemberId || this.data.preferredMemberId).forEach((member) => {
        if (member && member.id && visibleSet.has(member.id)) protectedNodeSet.add(member.id)
      })
    }

    const generations = Object.keys(generationCounts)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item))
      .sort((a, b) => a - b)

    const generationIndexMap = {}
    generations.forEach((generation, index) => {
      generationIndexMap[generation] = index
    })

    visibleSet.forEach((memberId) => {
      const children = (this.primaryChildrenMap[memberId] || []).filter((child) => visibleSet.has(child.id))
      const childKeys = []
      const shouldGroup = !!options.enableSiblingGrouping &&
        children.length > groupThreshold &&
        !this.expandedSiblingGroupMap[memberId]

      if (shouldGroup) {
        const visibleChildren = children.slice(0, groupVisibleCount)
        children.forEach((child) => {
          if (protectedNodeSet.has(child.id) && !visibleChildren.find((item) => item.id === child.id)) {
            visibleChildren.push(child)
          }
        })
        visibleChildren.sort((a, b) => this.compareMembers(a, b))
        visibleChildren.forEach((child) => childKeys.push(String(child.id)))
        const hiddenCount = children.length - visibleChildren.length
        if (hiddenCount > 0) {
          const groupKey = `group-${memberId}`
          virtualNodeMap[groupKey] = {
            id: groupKey,
            parentId: memberId,
            generation: children[0] ? children[0].generation : this.numMap[memberId].generation + 1,
            hiddenCount
          }
          nodeRecordMap[groupKey] = virtualNodeMap[groupKey]
          childKeys.push(groupKey)
        }
      } else {
        children.forEach((child) => childKeys.push(String(child.id)))
      }

      visibleChildrenMap[String(memberId)] = childKeys
    })

    const roots = Array.from(visibleSet)
      .filter((memberId) => !visibleSet.has(this.primaryParentMap[memberId]))
      .map((memberId) => String(memberId))
      .map((memberKey) => nodeRecordMap[memberKey])
      .sort((a, b) => this.compareMembers(a, b))

    const subtreeMeasure = {}
    const measure = (nodeKey) => {
      if (subtreeMeasure[nodeKey]) return subtreeMeasure[nodeKey]
      const children = visibleChildrenMap[nodeKey] || []
      if (!children.length) {
        subtreeMeasure[nodeKey] = orient === 'TB' ? cardWidth : cardHeight
        return subtreeMeasure[nodeKey]
      }
      const total = children.reduce((sum, childKey, index) => sum + measure(childKey) + (index > 0 ? siblingGap : 0), 0)
      subtreeMeasure[nodeKey] = Math.max(orient === 'TB' ? cardWidth : cardHeight, total)
      return subtreeMeasure[nodeKey]
    }
    roots.forEach((root) => measure(String(root.id)))

    const positions = {}
    const placeTB = (nodeKey, startX) => {
      const nodeRecord = nodeRecordMap[nodeKey]
      const span = subtreeMeasure[nodeKey]
      const nodeLeft = startX + Math.max((span - cardWidth) / 2, 0)
      const nodeTop = topPad + generationIndexMap[nodeRecord.generation] * (cardHeight + layerGap)
      positions[nodeKey] = { left: nodeLeft, top: nodeTop, width: cardWidth, height: cardHeight }

      const children = visibleChildrenMap[nodeKey] || []
      if (!children.length) return
      const totalChildrenWidth = children.reduce((sum, childKey, index) => sum + subtreeMeasure[childKey] + (index > 0 ? siblingGap : 0), 0)
      let childStart = startX + Math.max((span - totalChildrenWidth) / 2, 0)
      children.forEach((childKey) => {
        placeTB(childKey, childStart)
        childStart += subtreeMeasure[childKey] + siblingGap
      })
    }

    const placeLR = (nodeKey, startY) => {
      const nodeRecord = nodeRecordMap[nodeKey]
      const span = subtreeMeasure[nodeKey]
      const nodeTop = startY + Math.max((span - cardHeight) / 2, 0)
      const nodeLeft = labelPad + generationIndexMap[nodeRecord.generation] * (cardWidth + layerGap)
      positions[nodeKey] = { left: nodeLeft, top: nodeTop, width: cardWidth, height: cardHeight }

      const children = visibleChildrenMap[nodeKey] || []
      if (!children.length) return
      const totalChildrenHeight = children.reduce((sum, childKey, index) => sum + subtreeMeasure[childKey] + (index > 0 ? siblingGap : 0), 0)
      let childStart = startY + Math.max((span - totalChildrenHeight) / 2, 0)
      children.forEach((childKey) => {
        placeLR(childKey, childStart)
        childStart += subtreeMeasure[childKey] + siblingGap
      })
    }

    let cursor = sidePad + labelPad
    roots.forEach((root) => {
      if (orient === 'TB') {
        placeTB(String(root.id), cursor)
      } else {
        placeLR(String(root.id), cursor)
      }
      cursor += subtreeMeasure[String(root.id)] + rootGap
    })

    const relatedSet = this.buildRelatedSet(this.data.centerMemberId, visibleSet)

    const makeGroupNode = (groupKey, pos) => {
      const groupNode = virtualNodeMap[groupKey]
      return {
        id: groupKey,
        anchorId: `${options.anchorPrefix || 'tree-node'}-${groupKey}`,
        displayName: `+${groupNode.hiddenCount}`,
        secondaryText: `点击展开${groupNode.hiddenCount}人`,
        aliveStatus: 'unknown',
        badgeText: '',
        left: pos.left,
        top: pos.top,
        width: cardWidth,
        height: cardHeight,
        isSelf: false,
        isFocus: false,
        isRelated: false,
        isGroupNode: true,
        groupParentId: groupNode.parentId,
        tapAction: 'expand-siblings',
        focusAction: '',
        focusEntryText: '',
        showFocusEntry: false,
        showExpandEntry: false,
        canExpandBranch: false,
        expandText: ''
      }
    }

    const allNodeKeys = Object.keys(positions).sort((a, b) => {
      const nodeA = nodeRecordMap[a]
      const nodeB = nodeRecordMap[b]
      if (nodeA.generation !== nodeB.generation) return nodeA.generation - nodeB.generation
      const isVirtualA = !!virtualNodeMap[a]
      const isVirtualB = !!virtualNodeMap[b]
      if (isVirtualA !== isVirtualB) return isVirtualA ? 1 : -1
      return orient === 'TB'
        ? positions[a].left - positions[b].left
        : positions[a].top - positions[b].top
    })

    const nodes = allNodeKeys.map((nodeKey) => {
      const pos = positions[nodeKey]
      if (virtualNodeMap[nodeKey]) return makeGroupNode(nodeKey, pos)
      const member = nodeRecordMap[nodeKey]
      const selectionState = this.getSelectionState(member)
      const inSelectionMode = !!this.data.selectMode
      return this.mapMemberToNode(member, {
        anchorId: `${options.anchorPrefix || 'tree-node'}-${member.id}`,
        left: pos.left,
        top: pos.top,
        width: cardWidth,
        height: cardHeight,
        badgeText: this.getNodeBadgeText(member.id),
        allowExpand: !!options.allowExpand,
        isRelated: relatedSet.has(member.id),
        tapAction: inSelectionMode ? 'select' : 'detail',
        focusAction: options.focusAction || 'focus',
        focusEntryText: '关系',
        showFocusEntry: options.showFocusEntry !== false,
        meta: '',
        selectStateClass: inSelectionMode ? (selectionState.selectable ? 'selection-ready' : 'selection-disabled') : '',
        selectionDisabled: inSelectionMode && !selectionState.selectable,
        selectHintText: inSelectionMode ? selectionState.hint : ''
      })
    })

    const edges = []
    const isHighlightedEdge = (parentId, childKey) => {
      const childId = Number(childKey)
      return Number.isFinite(childId) && relatedSet.has(parentId) && relatedSet.has(childId)
    }

    Array.from(visibleSet).forEach((parentId) => {
      const parentKey = String(parentId)
      const childKeys = visibleChildrenMap[parentKey] || []
      if (!childKeys.length || !positions[parentKey]) return

      const parentPos = positions[parentKey]
      const childPositions = childKeys.map((childKey) => ({
        key: childKey,
        pos: positions[childKey]
      })).filter((item) => item.pos)

      if (!childPositions.length) return

      if (orient === 'TB') {
        const startX = parentPos.left + cardWidth / 2
        const startY = parentPos.top + cardHeight

        if (childPositions.length === 1) {
          const onlyChild = childPositions[0]
          const endX = onlyChild.pos.left + cardWidth / 2
          const endY = onlyChild.pos.top
          const branchY = Math.round(startY + Math.max((endY - startY) * 0.45, 16))
          const highlight = isHighlightedEdge(parentId, onlyChild.key)
          edges.push(this.makeEdge('v', startX - 2, startY, 4, Math.max(branchY - startY, 4), highlight))
          edges.push(this.makeEdge('h', Math.min(startX, endX), branchY - 2, Math.max(Math.abs(endX - startX), 4), 4, highlight))
          edges.push(this.makeEdge('v', endX - 2, branchY, 4, Math.max(endY - branchY, 4), highlight))
          return
        }

        const childCenters = childPositions.map((item) => item.pos.left + cardWidth / 2)
        const minX = Math.min(...childCenters)
        const maxX = Math.max(...childCenters)
        const childTop = Math.min(...childPositions.map((item) => item.pos.top))
        const branchY = Math.round(startY + Math.max(Math.min((childTop - startY) * 0.45, 28), 18))
        const trunkHighlight = childPositions.some((item) => isHighlightedEdge(parentId, item.key))
        edges.push(this.makeEdge('v', startX - 2, startY, 4, Math.max(branchY - startY, 4), trunkHighlight))
        edges.push(this.makeEdge('h', minX, branchY - 2, Math.max(maxX - minX, 4), 4, trunkHighlight))
        childPositions.forEach((item) => {
          const centerX = item.pos.left + cardWidth / 2
          const highlight = isHighlightedEdge(parentId, item.key)
          edges.push(this.makeEdge('v', centerX - 2, branchY, 4, Math.max(item.pos.top - branchY, 4), highlight))
        })
        return
      }

      const startX = parentPos.left + cardWidth
      const startY = parentPos.top + cardHeight / 2

      if (childPositions.length === 1) {
        const onlyChild = childPositions[0]
        const endX = onlyChild.pos.left
        const endY = onlyChild.pos.top + cardHeight / 2
        const branchX = Math.round(startX + Math.max((endX - startX) * 0.45, 16))
        const highlight = isHighlightedEdge(parentId, onlyChild.key)
        edges.push(this.makeEdge('h', startX, startY - 2, Math.max(branchX - startX, 4), 4, highlight))
        edges.push(this.makeEdge('v', branchX - 2, Math.min(startY, endY), 4, Math.max(Math.abs(endY - startY), 4), highlight))
        edges.push(this.makeEdge('h', branchX, endY - 2, Math.max(endX - branchX, 4), 4, highlight))
        return
      }

      const childCenters = childPositions.map((item) => item.pos.top + cardHeight / 2)
      const minY = Math.min(...childCenters)
      const maxY = Math.max(...childCenters)
      const childLeft = Math.min(...childPositions.map((item) => item.pos.left))
      const branchX = Math.round(startX + Math.max(Math.min((childLeft - startX) * 0.45, 28), 18))
      const trunkHighlight = childPositions.some((item) => isHighlightedEdge(parentId, item.key))
      edges.push(this.makeEdge('h', startX, startY - 2, Math.max(branchX - startX, 4), 4, trunkHighlight))
      edges.push(this.makeEdge('v', branchX - 2, minY, 4, Math.max(maxY - minY, 4), trunkHighlight))
      childPositions.forEach((item) => {
        const centerY = item.pos.top + cardHeight / 2
        const highlight = isHighlightedEdge(parentId, item.key)
        edges.push(this.makeEdge('h', branchX, centerY - 2, Math.max(item.pos.left - branchX, 4), 4, highlight))
      })
    })

    const labels = generations.map((generation) => {
      const idx = generationIndexMap[generation]
      const title = `第${generation}代 ${generationCounts[generation] || 0}人`
      if (orient === 'TB') {
        return {
          key: `label-${generation}`,
          title,
          left: 14,
          top: Math.round(topPad + idx * (cardHeight + layerGap) + 12),
          width: labelPad - 18,
          height: 34
        }
      }
      return {
        key: `label-${generation}`,
        title,
        left: Math.round(labelPad + idx * (cardWidth + layerGap)),
        top: 12,
        width: Math.max(cardWidth, 154),
        height: 34
      }
    })

    let maxRight = 0
    let maxBottom = 0
    nodes.forEach((node) => {
      maxRight = Math.max(maxRight, node.left + node.width)
      maxBottom = Math.max(maxBottom, node.top + node.height)
    })
    labels.forEach((label) => {
      maxRight = Math.max(maxRight, label.left + label.width)
      maxBottom = Math.max(maxBottom, label.top + label.height)
    })

    const canvasWidth = Math.max(Math.round(maxRight + sidePad), 960)
    const canvasHeight = Math.max(Math.round(maxBottom + sidePad), 820)

    return {
      nodes,
      edges: edges.map((edge, index) => ({ ...edge, key: `edge-${index}` })),
      labels,
      canvasStyle: `width: ${canvasWidth}rpx; height: ${canvasHeight}rpx;`,
      canvasWidth,
      canvasHeight,
      targetId: `${options.anchorPrefix || 'tree-node'}-${this.data.centerMemberId}`
    }
  },

  buildSideGroupCards(centerId) {
    return this.getSiblings(centerId).map((member) => ({
      id: member.id,
      name: this.getDisplayName(member),
      spouseText: this.getSpouseText(member)
    }))
  },

  measurePedigreeViewport() {
    return new Promise((resolve) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#pedigree-scroll-y').boundingClientRect()
      query.exec((res) => {
        const rect = res && res[0] ? res[0] : null
        if (rect) {
          this.pedigreeViewportRect = rect
          this.setData({
            pedigreeViewportWidth: rect.width || 0,
            pedigreeViewportHeight: rect.height || 0
          }, () => resolve(rect))
          return
        }
        resolve(null)
      })
    })
  },

  clampPedigreeScroll(left, top) {
    const viewportWidth = Number(this.data.pedigreeViewportWidth || 0)
    const viewportHeight = Number(this.data.pedigreeViewportHeight || 0)
    const canvasWidth = this.rpxToPx(this.data.pedigreeCanvasWidth || 0)
    const canvasHeight = this.rpxToPx(this.data.pedigreeCanvasHeight || 0)
    const maxLeft = Math.max(0, canvasWidth - viewportWidth)
    const maxTop = Math.max(0, canvasHeight - viewportHeight)
    return {
      left: Math.min(maxLeft, Math.max(0, Number(left || 0))),
      top: Math.min(maxTop, Math.max(0, Number(top || 0)))
    }
  },

  getPedigreeAnchorNodes() {
    const preferredId = Number(this.data.displayMemberId || this.data.preferredMemberId || 0)
    const focusId = Number(this.data.centerMemberId || preferredId || 0)
    if (!focusId) return []

    const anchorIds = new Set([focusId])
    const walkAncestors = (memberId) => {
      ;(this.parentLinksMap[memberId] || []).forEach((parentId) => {
        if (!anchorIds.has(parentId)) {
          anchorIds.add(parentId)
          walkAncestors(parentId)
        }
      })
    }
    walkAncestors(focusId)

    if (focusId && focusId === preferredId) {
      this.getSiblings(preferredId).forEach((member) => {
        if (member && member.id) anchorIds.add(member.id)
      })
    }

    return this.data.pedigreeNodes.filter((node) => !node.isGroupNode && anchorIds.has(Number(node.id)))
  },

  syncPedigreeViewport(options = {}) {
    if (this.data.treeViewMode !== TREE_VIEW_PEDIGREE) return
    wx.nextTick(() => {
      this.measurePedigreeViewport().then(() => {
        if (options.reset) {
          const anchorNodes = this.getPedigreeAnchorNodes()
          let nextLeft = 0
          let nextTop = 0
          if (anchorNodes.length) {
            const padX = 56
            const padY = 36
            const minLeft = Math.max(0, Math.min(...anchorNodes.map((node) => node.left)) - padX)
            const maxRight = Math.max(...anchorNodes.map((node) => node.left + node.width)) + padX
            const minTop = Math.max(0, Math.min(...anchorNodes.map((node) => node.top)) - padY)
            const maxBottom = Math.max(...anchorNodes.map((node) => node.top + node.height)) + padY
            const viewportWidth = Number(this.data.pedigreeViewportWidth || 0)
            const viewportHeight = Number(this.data.pedigreeViewportHeight || 0)
            const boundsWidth = this.rpxToPx(maxRight - minLeft)
            const boundsHeight = this.rpxToPx(maxBottom - minTop)

            nextLeft = this.rpxToPx(Math.max(0, minLeft - 18))
            nextTop = boundsHeight <= viewportHeight
              ? this.rpxToPx((minTop + maxBottom) / 2) - viewportHeight / 2
              : this.rpxToPx(minTop)
          }
          const clampedReset = this.clampPedigreeScroll(nextLeft, nextTop)
          this.setData({
            pedigreeScrollLeft: clampedReset.left,
            pedigreeScrollTop: clampedReset.top
          })
          this.pendingPedigreeReset = false
          this.pedigreeHasInitialized = true
          return
        }

        const clamped = this.clampPedigreeScroll(this.data.pedigreeScrollLeft, this.data.pedigreeScrollTop)
        this.setData({
          pedigreeScrollLeft: clamped.left,
          pedigreeScrollTop: clamped.top
        })
        this.pendingPedigreeReset = false
        this.pedigreeHasInitialized = true
      })
    })
  },

  rpxToPx(value) {
    return Number(value || 0) * (this.rpxRatio || 1)
  },

  pxToRpx(value) {
    return Number(value || 0) / (this.rpxRatio || 1)
  },

  normalizeTouchPoint(touch) {
    if (!touch) {
      return {
        x: 0,
        y: 0
      }
    }

    const rawX = touch.clientX !== undefined
      ? touch.clientX
      : (touch.pageX !== undefined ? touch.pageX : touch.x)
    const rawY = touch.clientY !== undefined
      ? touch.clientY
      : (touch.pageY !== undefined ? touch.pageY : touch.y)

    return {
      x: Number(rawX !== undefined ? rawX : 0),
      y: Number(rawY !== undefined ? rawY : 0)
    }
  },

  getEmptyLocateCallout() {
    return {
      locateCalloutStyle: '',
      locateCalloutArrowStyle: '',
      locateCalloutDirection: ''
    }
  },

  buildLocateCalloutPayload(nodes, canvasWidth, canvasHeight, options = {}) {
    const activeId = Number(this.data.locatePulseNodeId || 0)
    const locateActive = !!activeId
      && !!this.data.locateToastText
      && Number(this.data.locatePulseUntil || 0) > Date.now()
    if (!locateActive) {
      return this.getEmptyLocateCallout()
    }

    const list = Array.isArray(nodes) ? nodes : []
    const target = list.find((node) => Number(node.id) === activeId)
    if (!target) {
      return this.getEmptyLocateCallout()
    }

    const width = Number(options.width || 320)
    const minHeight = Number(options.minHeight || 120)
    const gap = Number(options.gap || 22)
    const padding = Number(options.padding || 18)
    const arrowSize = Number(options.arrowSize || 22)
    const canvasW = Math.max(Number(canvasWidth || 0), width + padding * 2)
    const canvasH = Math.max(Number(canvasHeight || 0), minHeight + padding * 2)
    const nodeLeft = Number(target.left || 0)
    const nodeTop = Number(target.top || 0)
    const nodeWidth = Number(target.width || 0)
    const nodeHeight = Number(target.height || 0)
    const nodeCenterX = nodeLeft + nodeWidth / 2
    const preferAbove = nodeTop > (minHeight + gap + padding)
    const maxLeft = Math.max(padding, canvasW - width - padding)
    const bubbleLeft = Math.min(maxLeft, Math.max(padding, nodeCenterX - width / 2))
    const bubbleTop = preferAbove
      ? Math.max(padding, nodeTop - minHeight - gap)
      : Math.min(Math.max(padding, canvasH - minHeight - padding), nodeTop + nodeHeight + gap)
    const arrowLeft = Math.min(width - arrowSize - 28, Math.max(28, nodeCenterX - bubbleLeft - arrowSize / 2))
    const arrowVerticalStyle = preferAbove
      ? `bottom: ${(-arrowSize / 2).toFixed(2)}rpx;`
      : `top: ${(-arrowSize / 2).toFixed(2)}rpx;`

    return {
      locateCalloutStyle: `left: ${bubbleLeft.toFixed(2)}rpx; top: ${bubbleTop.toFixed(2)}rpx; width: ${width.toFixed(2)}rpx; min-height: ${minHeight.toFixed(2)}rpx;`,
      locateCalloutArrowStyle: `left: ${arrowLeft.toFixed(2)}rpx; width: ${arrowSize.toFixed(2)}rpx; height: ${arrowSize.toFixed(2)}rpx; ${arrowVerticalStyle}`,
      locateCalloutDirection: preferAbove ? 'above' : 'below'
    }
  },

  getLocateCalloutPayloadForMode(mode, options = {}) {
    if (mode === TREE_VIEW_OVERVIEW) {
      const nodes = options.nodes || this.data.overviewNodes
      const width = options.canvasWidth !== undefined
        ? options.canvasWidth
        : Number(this.data.overviewCanvasWidth || 0)
      const height = options.canvasHeight !== undefined
        ? options.canvasHeight
        : Number(this.data.overviewCanvasHeight || 0)
      return this.buildLocateCalloutPayload(nodes, width, height, {
        width: 344,
        minHeight: 136,
        gap: 24,
        arrowSize: 24
      })
    }

    return this.buildLocateCalloutPayload(
      options.nodes || this.data.pedigreeNodes,
      options.canvasWidth !== undefined ? options.canvasWidth : this.data.pedigreeCanvasWidth,
      options.canvasHeight !== undefined ? options.canvasHeight : this.data.pedigreeCanvasHeight,
      {
        width: 336,
        minHeight: 124,
        gap: 24,
        arrowSize: 22
      }
    )
  },

  refreshLocateCallout(mode = this.data.treeViewMode) {
    this.setData(this.getLocateCalloutPayloadForMode(mode))
  },

  triggerOverviewSceneFx(effect = 'enter') {
    const fxClass = effect === 'focus' ? 'overview-scene-focus' : 'overview-scene-enter'
    if (this.overviewSceneFxTimer) {
      clearTimeout(this.overviewSceneFxTimer)
      this.overviewSceneFxTimer = null
    }

    const applyFx = () => {
      this.setData({
        overviewSceneFxClass: fxClass
      })
      this.overviewSceneFxTimer = setTimeout(() => {
        this.overviewSceneFxTimer = null
        if (this.data.overviewSceneFxClass) {
          this.setData({
            overviewSceneFxClass: ''
          })
        }
      }, 340)
    }

    if (this.data.overviewSceneFxClass) {
      this.setData({
        overviewSceneFxClass: ''
      }, () => {
        wx.nextTick(() => applyFx())
      })
      return
    }

    applyFx()
  },

  getOverviewLayout() {
    return this.overviewLayout || {
      nodes: this.data.overviewNodes || [],
      edges: this.data.overviewEdges || [],
      labels: this.data.overviewLabels || [],
      canvasWidth: Number(this.data.overviewCanvasWidth || 0),
      canvasHeight: Number(this.data.overviewCanvasHeight || 0),
      targetId: this.data.overviewTargetId || ''
    }
  },

  scaleOverviewRect(item, scale) {
    if (!item) return item
    const nextScale = Number(scale || 1)
    const scaled = {
      ...item
    }
    ;['left', 'top', 'width', 'height'].forEach((key) => {
      if (scaled[key] === undefined) return
      scaled[key] = Number((Number(scaled[key] || 0) * nextScale).toFixed(2))
    })
    return scaled
  },

  buildOverviewRenderPayload(scale) {
    const layout = this.getOverviewLayout()
    const nextScale = this.clampOverviewScale(scale)
    const scaledWidth = Number((Number(layout.canvasWidth || 0) * nextScale).toFixed(2))
    const scaledHeight = Number((Number(layout.canvasHeight || 0) * nextScale).toFixed(2))

    return {
      overviewRenderNodes: (layout.nodes || []).map((node) => this.scaleOverviewRect(node, nextScale)),
      overviewRenderEdges: (layout.edges || []).map((edge) => this.scaleOverviewRect(edge, nextScale)),
      overviewRenderLabels: (layout.labels || []).map((label) => this.scaleOverviewRect(label, nextScale)),
      overviewScaleShellStyle: `width: ${scaledWidth}rpx; height: ${scaledHeight}rpx;`,
      overviewCanvasInnerStyle: `width: ${scaledWidth}rpx; height: ${scaledHeight}rpx;`
    }
  },

  clampOverviewScale(scale) {
    const min = this.data.overviewMinScale || 0.35
    const max = this.data.overviewMaxScale || 2.2
    return Math.min(max, Math.max(min, Number(scale || this.data.overviewBaseScale || 0.6)))
  },

  buildOverviewScaleStyles(canvasWidth, canvasHeight, scale) {
    const width = Number(canvasWidth || 0)
    const height = Number(canvasHeight || 0)
    const nextScale = this.clampOverviewScale(scale)
    return {
      shellStyle: `width: ${(width * nextScale).toFixed(2)}rpx; height: ${(height * nextScale).toFixed(2)}rpx;`,
      innerStyle: `width: ${width}rpx; height: ${height}rpx; transform: scale(${nextScale}); transform-origin: top left;`
    }
  },

  composeOverviewViewportRect(horizontalRect, verticalRect) {
    if (!horizontalRect && !verticalRect) {
      return null
    }
    if (horizontalRect && verticalRect) {
      return {
        left: Number(horizontalRect.left !== undefined ? horizontalRect.left : (verticalRect.left || 0)),
        top: Number(verticalRect.top !== undefined ? verticalRect.top : (horizontalRect.top || 0)),
        width: Number(horizontalRect.width !== undefined ? horizontalRect.width : (verticalRect.width || 0)),
        height: Number(verticalRect.height !== undefined ? verticalRect.height : (horizontalRect.height || 0))
      }
    }
    const rect = horizontalRect || verticalRect || {}
    return {
      left: Number(rect.left || 0),
      top: Number(rect.top || 0),
      width: Number(rect.width || 0),
      height: Number(rect.height || 0)
    }
  },

  measureOverviewPinchViewportRect() {
    return new Promise((resolve) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#overview-pinch-surface').boundingClientRect()
      query.select('#overview-scroll-x').boundingClientRect()
      query.select('#overview-scroll-y').boundingClientRect()
      query.exec((res) => {
        const pinchRect = res && res[0] ? res[0] : null
        const horizontalRect = res && res[1] ? res[1] : null
        const verticalRect = res && res[2] ? res[2] : null
        const fallbackRect = this.composeOverviewViewportRect(horizontalRect, verticalRect)
        if (!pinchRect && !fallbackRect) {
          resolve(null)
          return
        }

        resolve({
          left: Number(pinchRect && pinchRect.left !== undefined ? pinchRect.left : (fallbackRect && fallbackRect.left || 0)),
          top: Number(pinchRect && pinchRect.top !== undefined ? pinchRect.top : (fallbackRect && fallbackRect.top || 0)),
          width: Number(fallbackRect && fallbackRect.width !== undefined ? fallbackRect.width : (pinchRect && pinchRect.width || 0)),
          height: Number(fallbackRect && fallbackRect.height !== undefined ? fallbackRect.height : (pinchRect && pinchRect.height || 0))
        })
      })
    })
  },

  resolveOverviewPinchViewportRect() {
    return this.activePinchViewportRect || this.overviewViewportRect || null
  },

  measureOverviewViewport() {
    return new Promise((resolve) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#overview-scroll-x').boundingClientRect()
      query.select('#overview-scroll-y').boundingClientRect()
      query.exec((res) => {
        const horizontalRect = res && res[0] ? res[0] : null
        const verticalRect = res && res[1] ? res[1] : null
        const rect = this.composeOverviewViewportRect(horizontalRect, verticalRect)
        if (!rect) {
          resolve(null)
          return
        }
        this.overviewViewportRect = rect
        this.setData({
          overviewViewportWidth: rect.width || 0,
          overviewViewportHeight: rect.height || 0
        }, () => resolve(rect))
      })
    })
  },

  clampOverviewScroll(left, top, scale) {
    const viewportWidth = Number(this.data.overviewViewportWidth || 0)
    const viewportHeight = Number(this.data.overviewViewportHeight || 0)
    const scaledWidth = this.rpxToPx(this.data.overviewCanvasWidth || 0) * scale
    const scaledHeight = this.rpxToPx(this.data.overviewCanvasHeight || 0) * scale
    const maxLeft = Math.max(0, scaledWidth - viewportWidth)
    const maxTop = Math.max(0, scaledHeight - viewportHeight)
    return {
      left: Math.min(maxLeft, Math.max(0, Number(left || 0))),
      top: Math.min(maxTop, Math.max(0, Number(top || 0)))
    }
  },

  getOverviewScrollState() {
    const state = this.overviewScrollState || {}
    return {
      left: Number.isFinite(Number(state.left)) ? Number(state.left) : Number(this.data.overviewScrollLeft || 0),
      top: Number.isFinite(Number(state.top)) ? Number(state.top) : Number(this.data.overviewScrollTop || 0)
    }
  },

  setOverviewScrollState(left, top, options = {}) {
    const nextState = {
      left: Number(left || 0),
      top: Number(top || 0)
    }
    this.overviewScrollState = nextState

    if (!options.commitData) {
      return
    }

    this.setData({
      overviewScrollLeft: nextState.left,
      overviewScrollTop: nextState.top
    })
  },

  syncOverviewScrollData(scrollState, callback) {
    const nextState = {
      left: Number(scrollState && scrollState.left || 0),
      top: Number(scrollState && scrollState.top || 0)
    }
    this.setOverviewScrollState(nextState.left, nextState.top)

    if (Math.abs(nextState.left - Number(this.data.overviewScrollLeft || 0)) <= 0.5
      && Math.abs(nextState.top - Number(this.data.overviewScrollTop || 0)) <= 0.5) {
      if (typeof callback === 'function') callback()
      return
    }

    this.setData({
      overviewScrollLeft: nextState.left,
      overviewScrollTop: nextState.top
    }, () => {
      if (typeof callback === 'function') callback()
    })
  },

  measureOverviewScrollOffsets() {
    return new Promise((resolve) => {
      const fallback = this.getOverviewScrollState()
      const query = wx.createSelectorQuery().in(this)
      query.select('#overview-scroll-x').scrollOffset()
      query.select('#overview-scroll-y').scrollOffset()
      query.exec((res) => {
        const horizontal = res && res[0] ? res[0] : {}
        const vertical = res && res[1] ? res[1] : {}
        resolve({
          left: Number(horizontal.scrollLeft !== undefined ? horizontal.scrollLeft : fallback.left || 0),
          top: Number(vertical.scrollTop !== undefined ? vertical.scrollTop : fallback.top || 0)
        })
      })
    }).catch(() => this.getOverviewScrollState())
  },

  cloneTouchPair(touches) {
    if (!touches || touches.length < 2) return null
    return [0, 1].map((index) => this.normalizeTouchPoint(touches[index]))
  },

  initOverviewPinchState(touches, scrollState) {
    const activeViewportRect = this.resolveOverviewPinchViewportRect()
    if (!touches || touches.length < 2 || !activeViewportRect) {
      this.overviewPinchState = null
      return false
    }

    const distance = this.getTouchDistance(touches)
    const center = this.getTouchCenter(touches)
    if (!distance || !center) {
      this.overviewPinchState = null
      return false
    }

    const midpointX = center.x - activeViewportRect.left
    const midpointY = center.y - activeViewportRect.top
    const scale = this.data.overviewScale || this.data.overviewBaseScale || 0.6
    const liveScroll = {
      left: Number(scrollState && scrollState.left || 0),
      top: Number(scrollState && scrollState.top || 0)
    }

    this.overviewPinchState = {
      startDistance: distance,
      startScale: scale,
      startScrollLeft: liveScroll.left,
      startScrollTop: liveScroll.top,
      anchorCanvasX: (liveScroll.left + midpointX) / scale,
      anchorCanvasY: (liveScroll.top + midpointY) / scale,
      latestPayload: null,
      lastRenderAt: 0
    }
    return true
  },

  primeOverviewPinch(seed) {
    if (!seed) return

    Promise.all([
      this.measureOverviewScrollOffsets(),
      this.measureOverviewPinchViewportRect().catch(() => null)
    ]).then(([scrollState, activeRect]) => {
      if (this.pendingOverviewPinchSeed !== seed || this.data.treeViewMode !== TREE_VIEW_OVERVIEW) {
        return
      }

      this.activePinchViewportRect = activeRect || this.overviewViewportRect || null
      this.syncOverviewScrollData(scrollState, () => {
        if (this.pendingOverviewPinchSeed !== seed || this.data.treeViewMode !== TREE_VIEW_OVERVIEW) {
          return
        }

        const initialized = this.initOverviewPinchState(seed.touches, scrollState)
        if (initialized && this.pendingOverviewPinchSeed === seed) {
          this.pendingOverviewPinchSeed = null
          return
        }

        this.clearOverviewGestureState({
          preserveTapSuppressUntil: true
        })
      })
    })
  },

  clearOverviewGestureState(options = {}) {
    this.overviewPinching = false
    this.pendingOverviewPinchSeed = null
    this.overviewPinchState = null
    this.activePinchViewportRect = null
    this.overviewTapCandidate = null
    this.overviewGestureSessionActive = false
    if (!this.data.overviewScrollEnabled) {
      this.setData({
        overviewScrollEnabled: true
      })
    }
    if (!options.preserveTapSuppressUntil) {
      this.overviewTapSuppressUntil = 0
    }
  },

  shouldSuppressOverviewTap() {
    if (this.data.treeViewMode !== TREE_VIEW_OVERVIEW) return false
    return this.overviewGestureSessionActive
      || !!this.pendingOverviewPinchSeed
      || this.overviewPinching
      || Date.now() < Number(this.overviewTapSuppressUntil || 0)
  },

  getOverviewAnchorNode() {
    const preferredId = this.data.displayMemberId || this.data.preferredMemberId
    const centerId = this.data.centerMemberId
    const nodes = this.getOverviewLayout().nodes || []
    return nodes.find((node) => Number(node.id) === Number(preferredId)) ||
      nodes.find((node) => Number(node.id) === Number(centerId)) ||
      null
  },

  syncOverviewViewport(options = {}) {
    if (this.data.treeViewMode !== TREE_VIEW_OVERVIEW) return
    wx.nextTick(() => {
      this.measureOverviewViewport().then(() => {
        const scale = this.clampOverviewScale(this.data.overviewScale || this.data.overviewBaseScale)
        const styles = this.buildOverviewScaleStyles(this.data.overviewCanvasWidth, this.data.overviewCanvasHeight, scale)
        const locateCalloutPayload = this.getLocateCalloutPayloadForMode(TREE_VIEW_OVERVIEW, {
          nodes: this.data.overviewNodes,
          canvasWidth: this.data.overviewCanvasWidth,
          canvasHeight: this.data.overviewCanvasHeight
        })
        if (options.reset) {
          const anchorNode = this.getOverviewAnchorNode()
          const viewportWidth = Number(this.data.overviewViewportWidth || 0)
          const viewportHeight = Number(this.data.overviewViewportHeight || 0)
          let nextLeft = 0
          let nextTop = 0
          if (anchorNode) {
            const centerX = this.rpxToPx(anchorNode.left + anchorNode.width / 2) * scale
            const centerY = this.rpxToPx(anchorNode.top + anchorNode.height / 2) * scale
            nextLeft = centerX - viewportWidth / 2
            nextTop = centerY - viewportHeight / 2
          }
          const clampedReset = this.clampOverviewScroll(nextLeft, nextTop, scale)
          this.setOverviewScrollState(clampedReset.left, clampedReset.top)
          this.setData({
            overviewScale: scale,
            overviewScaleShellStyle: styles.shellStyle,
            overviewCanvasInnerStyle: styles.innerStyle,
            ...locateCalloutPayload,
            transientOverviewTransform: '',
            overviewScrollLeft: clampedReset.left,
            overviewScrollTop: clampedReset.top
          })
          this.pendingOverviewReset = false
          this.overviewHasInitialized = true
          return
        }

        const liveScroll = this.getOverviewScrollState()
        const clamped = this.clampOverviewScroll(liveScroll.left, liveScroll.top, scale)
        this.setOverviewScrollState(clamped.left, clamped.top)
        this.setData({
          overviewScale: scale,
          overviewScaleShellStyle: styles.shellStyle,
          overviewCanvasInnerStyle: styles.innerStyle,
          ...locateCalloutPayload,
          transientOverviewTransform: '',
          overviewScrollLeft: clamped.left,
          overviewScrollTop: clamped.top
        })
        this.pendingOverviewReset = false
        this.overviewHasInitialized = true
      })
    })
  },

  resetOverviewViewport() {
    this.pendingOverviewReset = true
    this.clearOverviewGestureState()
    this.setData({
      overviewScale: this.data.overviewBaseScale || 0.6,
      transientOverviewTransform: ''
    }, () => this.syncOverviewViewport({ reset: true }))
  },

  applyView() {
    const centerMemberId = this.data.centerMemberId || this.resolveFallbackMemberId()
    const center = centerMemberId ? this.numMap[centerMemberId] : null
    if (!center) {
      this.overviewLayout = null
      this.setData({
        pedigreeNodes: [],
        overviewNodes: [],
        overviewEdges: [],
        overviewLabels: [],
        overviewRenderNodes: [],
        overviewRenderEdges: [],
        overviewRenderLabels: [],
        ...this.getEmptyLocateCallout(),
        displayList: []
      })
      return
    }

    if (!this.windowState) {
      this.windowState = this.resolveReadableWindow(centerMemberId)
    }

    try {
      const pedigreeOrient = PEDIGREE_ORIENT
      const overviewOrient = OVERVIEW_ORIENT
      const focusIds = this.collectFocusVisibleIds(centerMemberId)
      const filteredPedigreeIds = this.filterPedigreeVisibleIds(focusIds, centerMemberId)
      const pedigreeTree = this.buildTreeState(filteredPedigreeIds, {
        orient: pedigreeOrient,
        cardWidth: 198,
        cardHeight: 112,
        siblingGap: 16,
        rootGap: 28,
        layerGap: 42,
        labelPad: 96,
        sidePad: 48,
        topPad: 56,
        anchorPrefix: 'pedigree-node',
        allowExpand: true,
        focusAction: 'focus',
        enableSiblingGrouping: true
      })
      const overviewTree = this.buildTreeState(new Set(this.flatList.map((member) => member.id)), {
        orient: overviewOrient,
        cardWidth: 178,
        cardHeight: 112,
        siblingGap: 14,
        rootGap: 22,
        layerGap: 66,
        labelPad: 96,
        anchorPrefix: 'overview-node',
        allowExpand: false,
        focusAction: 'openPedigree',
        showFocusEntry: false,
        enableSiblingGrouping: true
      })
      const overviewScale = this.clampOverviewScale(this.data.overviewScale || this.data.overviewBaseScale)
      this.overviewLayout = overviewTree
      const overviewScaleStyles = this.buildOverviewScaleStyles(overviewTree.canvasWidth, overviewTree.canvasHeight, overviewScale)
      const locateCalloutPayload = this.data.treeViewMode === TREE_VIEW_OVERVIEW
        ? this.getLocateCalloutPayloadForMode(TREE_VIEW_OVERVIEW, {
          nodes: overviewTree.nodes,
          canvasWidth: overviewTree.canvasWidth,
          canvasHeight: overviewTree.canvasHeight
        })
        : this.getLocateCalloutPayloadForMode(TREE_VIEW_PEDIGREE, {
          nodes: pedigreeTree.nodes,
          canvasWidth: pedigreeTree.canvasWidth,
          canvasHeight: pedigreeTree.canvasHeight
        })
      const displayList = this.buildClassicDisplayList()
      const visibleMinGen = this.windowState.visibleMinGen
      const visibleMaxGen = this.windowState.visibleMaxGen
      const visibleWindow = visibleMaxGen >= visibleMinGen ? visibleMaxGen - visibleMinGen + 1 : 0

      this.setData({
        centerMemberId,
        centerMemberName: center.name || '',
        focusMemberId: centerMemberId,
        focusSummaryText: `${center.name || '当前成员'} · 第${center.generation}代`,
        rangeSummaryText: this.data.treeViewMode === TREE_VIEW_OVERVIEW
          ? `全代总览 · 第${this.globalMinGen}代 - 第${this.globalMaxGen}代`
          : `第${visibleMinGen}代 - 第${visibleMaxGen}代`,
        toolbarSummaryText: this.data.treeViewMode === TREE_VIEW_OVERVIEW ? `${center.name || '当前成员'} · 总代总览` : `${center.name || '当前成员'} · 关系树`,
        currentRuleText: this.data.treeViewMode === TREE_VIEW_OVERVIEW
          ? '总代总览保持树形结构，支持双指缩放与上下左右拖动；点击节点查看详情，点“关系”回到关系树。'
          : `关系树固定纵向；当前窗口第 ${visibleMinGen} 代到第 ${visibleMaxGen} 代，共 ${visibleWindow} 代。`,
        visibleMinGen,
        visibleMaxGen,
        densityTier: this.windowState.densityTier,
        densityTierLabel: this.windowState.densityTierLabel,
        pedigreeNodes: pedigreeTree.nodes,
        pedigreeEdges: pedigreeTree.edges,
        pedigreeLabels: pedigreeTree.labels,
        pedigreeCanvasStyle: pedigreeTree.canvasStyle,
        pedigreeCanvasWidth: pedigreeTree.canvasWidth,
        pedigreeCanvasHeight: pedigreeTree.canvasHeight,
        pedigreeTargetId: pedigreeTree.targetId,
        pedigreeScrollLeft: this.data.pedigreeScrollLeft,
        pedigreeScrollTop: this.data.pedigreeScrollTop,
        overviewNodes: overviewTree.nodes,
        overviewEdges: overviewTree.edges,
        overviewLabels: overviewTree.labels,
        overviewCanvasStyle: overviewTree.canvasStyle,
        overviewCanvasWidth: overviewTree.canvasWidth,
        overviewCanvasHeight: overviewTree.canvasHeight,
        overviewTargetId: overviewTree.targetId,
        overviewScale,
        overviewScaleShellStyle: overviewScaleStyles.shellStyle,
        overviewCanvasInnerStyle: overviewScaleStyles.innerStyle,
        ...locateCalloutPayload,
        transientOverviewTransform: '',
        sideGroupCards: [],
        displayList,
        showClassicFallback: !pedigreeTree.nodes.length
      }, () => {
        if (this.data.treeViewMode === TREE_VIEW_PEDIGREE) {
          const shouldReset = this.pendingPedigreeReset || !this.pedigreeHasInitialized
          this.syncPedigreeViewport({ reset: shouldReset })
        } else if (this.data.treeViewMode === TREE_VIEW_OVERVIEW) {
          const shouldReset = this.pendingOverviewReset || !this.overviewHasInitialized
          this.syncOverviewViewport({ reset: shouldReset })
          if (shouldReset) {
            this.triggerOverviewSceneFx('enter')
          }
        }
      })
    } catch (error) {
      console.error('tree layout failed', error)
      this.overviewLayout = null
      this.setData({
        treeViewMode: TREE_VIEW_CLASSIC,
        overviewRenderNodes: [],
        overviewRenderEdges: [],
        overviewRenderLabels: [],
        ...this.getEmptyLocateCallout(),
        displayList: this.buildClassicDisplayList(),
        toolbarSummaryText: `${center.name || '当前成员'} · 兼容视图`,
        currentRuleText: '当前树形布局异常，已自动切换到兼容经典树。'
      })
    }
  },

  buildClassicDisplayList() {
    const list = []
    this.rootNodes.forEach((member) => {
      this.appendClassicBranch(list, member, 0)
    })
    return list
  },

  appendClassicBranch(list, member, level) {
    const children = this.primaryChildrenMap[member.id] || []
    const expanded = level === 0 || !!this.classicExpandedMap[member.id]
    const selectionState = this.getSelectionState(member)
    list.push({
      id: member.id,
      name: member.name || '未命名成员',
      generation: member.generation,
      gender: member.gender,
      spouseName: this.spouseNameMap[member.id] || '',
      level,
      indentWidth: level * 42,
      hasChildren: children.length > 0,
      expanded,
      selectStateClass: this.data.selectMode ? (selectionState.selectable ? 'selection-ready' : 'selection-disabled') : '',
      selectionDisabled: !!this.data.selectMode && !selectionState.selectable,
      selectHintText: this.data.selectMode ? selectionState.hint : ''
    })
    if (children.length && expanded) {
      children.forEach((child) => this.appendClassicBranch(list, child, level + 1))
    }
  },

  setCenterMember(memberId, options = {}) {
    const nextId = Number(memberId)
    if (!nextId || !this.numMap[nextId]) return

    this.expandedBranchMap = {}
    this.expandedSiblingGroupMap = {}
    this.windowState = this.resolveReadableWindow(nextId)
    const nextViewMode = options.nextViewMode || this.data.treeViewMode || TREE_VIEW_PEDIGREE
    if (nextViewMode === TREE_VIEW_PEDIGREE) this.pendingPedigreeReset = true
    if (nextViewMode === TREE_VIEW_OVERVIEW) this.pendingOverviewReset = true

    this.setData({
      centerMemberId: nextId,
      focusMemberId: nextId,
      treeViewMode: nextViewMode
    }, () => this.applyView())
  },

  switchTreeView(e) {
    const mode = e.currentTarget.dataset.mode
    if (![TREE_VIEW_PEDIGREE, TREE_VIEW_OVERVIEW, TREE_VIEW_CLASSIC].includes(mode)) return
    if (mode !== TREE_VIEW_OVERVIEW) {
      this.clearOverviewGestureState()
    }
    if (mode === TREE_VIEW_PEDIGREE) {
      this.pendingPedigreeReset = true
    }
    if (mode === TREE_VIEW_OVERVIEW && !this.overviewHasInitialized) {
      this.pendingOverviewReset = true
    }
    const nextPayload = { treeViewMode: mode }
    if (mode !== TREE_VIEW_OVERVIEW && this.data.overviewSceneFxClass) {
      nextPayload.overviewSceneFxClass = ''
    }
    this.setData(nextPayload, () => {
      this.applyView()
      if (mode === TREE_VIEW_OVERVIEW) {
        this.triggerOverviewSceneFx('enter')
      }
    })
  },

  handlePedigreeScrollY(e) {
    this.setData({ pedigreeScrollTop: Number(e.detail.scrollTop || 0) })
  },

  handlePedigreeScrollX(e) {
    this.setData({ pedigreeScrollLeft: Number(e.detail.scrollLeft || 0) })
  },

  handleOverviewScrollY(e) {
    if (this.overviewPinching) {
      return
    }
    const liveScroll = this.getOverviewScrollState()
    this.setOverviewScrollState(liveScroll.left, Number(e.detail.scrollTop || 0))
  },

  handleOverviewScrollX(e) {
    if (this.overviewPinching) {
      return
    }
    const liveScroll = this.getOverviewScrollState()
    this.setOverviewScrollState(Number(e.detail.scrollLeft || 0), liveScroll.top)
  },

  getTouchDistance(touches) {
    if (!touches || touches.length < 2) return 0
    const first = this.normalizeTouchPoint(touches[0])
    const second = this.normalizeTouchPoint(touches[1])
    const dx = first.x - second.x
    const dy = first.y - second.y
    return Math.sqrt(dx * dx + dy * dy)
  },

  getTouchCenter(touches) {
    if (!touches || touches.length < 2) return null
    const first = this.normalizeTouchPoint(touches[0])
    const second = this.normalizeTouchPoint(touches[1])
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    }
  },

  resolveEventPoint(e) {
    if (!e) return null

    const touch = (e.changedTouches && e.changedTouches[0])
      || (e.touches && e.touches[0])
      || null
    if (touch) {
      return this.normalizeTouchPoint(touch)
    }

    const detail = e.detail || {}
    if (detail.x !== undefined || detail.y !== undefined) {
      return {
        x: Number(detail.x || 0),
        y: Number(detail.y || 0)
      }
    }

    return null
  },

  findOverviewNodeAtPoint(point) {
    if (!point || !this.overviewViewportRect) return null

    const localX = Number(point.x || 0) - Number(this.overviewViewportRect.left || 0)
    const localY = Number(point.y || 0) - Number(this.overviewViewportRect.top || 0)
    const viewportWidth = Number(this.data.overviewViewportWidth || this.overviewViewportRect.width || 0)
    const viewportHeight = Number(this.data.overviewViewportHeight || this.overviewViewportRect.height || 0)

    if (localX < 0 || localY < 0 || localX > viewportWidth || localY > viewportHeight) {
      return null
    }

    const scrollState = this.getOverviewScrollState()
    const scale = this.clampOverviewScale(this.data.overviewScale || this.data.overviewBaseScale)
    const canvasX = this.pxToRpx((scrollState.left + localX) / scale)
    const canvasY = this.pxToRpx((scrollState.top + localY) / scale)
    const nodes = this.getOverviewLayout().nodes || []

    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      if (!node) continue
      const left = Number(node.left || 0)
      const top = Number(node.top || 0)
      const right = left + Number(node.width || 0)
      const bottom = top + Number(node.height || 0)
      if (canvasX >= left && canvasX <= right && canvasY >= top && canvasY <= bottom) {
        return node
      }
    }

    return null
  },

  dispatchTreeNodeAction(dataset = {}) {
    const action = dataset.action
    const eventLike = {
      currentTarget: {
        dataset
      }
    }

    if (action === 'expand-siblings') {
      this.expandSiblingGroup(eventLike)
      return
    }
    if (this.data.selectMode) {
      this.selectTreeMember(eventLike)
      return
    }
    this.goDetail(eventLike)
  },

  buildTransientOverviewTransform(pinchPayload) {
    if (!this.overviewPinchState || !pinchPayload) {
      return ''
    }

    const startScale = Number(this.overviewPinchState.startScale || 1)
    const scaleRatio = startScale > 0 ? pinchPayload.nextScale / startScale : 1
    const translateX = Number(this.overviewPinchState.startScrollLeft || 0) - Number(pinchPayload.nextLeft || 0)
    const translateY = Number(this.overviewPinchState.startScrollTop || 0) - Number(pinchPayload.nextTop || 0)

    return `transform: translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${scaleRatio.toFixed(4)}); transform-origin: 0 0;`
  },

  applyOverviewPinchPreview(pinchPayload) {
    const nextData = {
      transientOverviewTransform: this.buildTransientOverviewTransform(pinchPayload)
    }

    if (this.overviewPinchState) {
      const startLeft = Number(this.overviewPinchState.startScrollLeft || 0)
      const startTop = Number(this.overviewPinchState.startScrollTop || 0)
      if (Math.abs(startLeft - Number(this.data.overviewScrollLeft || 0)) > 0.5) {
        nextData.overviewScrollLeft = startLeft
      }
      if (Math.abs(startTop - Number(this.data.overviewScrollTop || 0)) > 0.5) {
        nextData.overviewScrollTop = startTop
      }
    }

    this.setData(nextData)
  },

  commitOverviewPinch(pinchPayload) {
    const finishWithoutPayload = () => new Promise((resolve) => {
      this.setData({
        transientOverviewTransform: ''
      }, () => resolve())
    })

    if (!pinchPayload) {
      return finishWithoutPayload()
    }

    const targetLeft = Number(pinchPayload.nextLeft || 0)
    const targetTop = Number(pinchPayload.nextTop || 0)
    const currentScroll = this.getOverviewScrollState()
    const bridgeTranslateX = Number(currentScroll.left || 0) - targetLeft
    const bridgeTranslateY = Number(currentScroll.top || 0) - targetTop
    const bridgeTransform = `transform: translate3d(${bridgeTranslateX.toFixed(2)}px, ${bridgeTranslateY.toFixed(2)}px, 0) scale(1); transform-origin: 0 0;`
    const styles = this.buildOverviewScaleStyles(this.data.overviewCanvasWidth, this.data.overviewCanvasHeight, pinchPayload.nextScale)
    const locateCalloutPayload = this.getLocateCalloutPayloadForMode(TREE_VIEW_OVERVIEW, {
      nodes: this.data.overviewNodes,
      canvasWidth: this.data.overviewCanvasWidth,
      canvasHeight: this.data.overviewCanvasHeight
    })

    return new Promise((resolve) => {
      this.setData({
        overviewScale: pinchPayload.nextScale,
        overviewScaleShellStyle: styles.shellStyle,
        overviewCanvasInnerStyle: styles.innerStyle,
        ...locateCalloutPayload,
        transientOverviewTransform: bridgeTransform
      }, () => {
        wx.nextTick(() => {
          this.setOverviewScrollState(targetLeft, targetTop)
          this.setData({
            overviewScrollLeft: targetLeft,
            overviewScrollTop: targetTop
          }, () => {
            wx.nextTick(() => {
              this.measureOverviewScrollOffsets().then((liveScroll) => {
                const deltaLeft = Math.abs(Number(liveScroll.left || 0) - targetLeft)
                const deltaTop = Math.abs(Number(liveScroll.top || 0) - targetTop)
                if (deltaLeft > 1 || deltaTop > 1) {
                  this.setOverviewScrollState(targetLeft, targetTop)
                  this.setData({
                    overviewScrollLeft: targetLeft,
                    overviewScrollTop: targetTop,
                    transientOverviewTransform: ''
                  }, () => resolve())
                  return
                }
                this.setData({
                  transientOverviewTransform: ''
                }, () => resolve())
              }).catch(() => {
                this.setData({
                  transientOverviewTransform: ''
                }, () => resolve())
              })
            })
          })
        })
      })
    })
  },

  handleOverviewPinchStart(e) {
    if (this.data.treeViewMode !== TREE_VIEW_OVERVIEW || !e.touches || !this.overviewViewportRect) return
    if (e.touches.length < 2) {
      const point = this.normalizeTouchPoint(e.touches[0])
      const scrollState = this.getOverviewScrollState()
      this.overviewTapCandidate = {
        startPoint: point,
        moved: false,
        startScrollLeft: scrollState.left,
        startScrollTop: scrollState.top
      }
      return
    }
    const touches = this.cloneTouchPair(e.touches)
    if (!touches) return
    this.overviewTapCandidate = null
    this.overviewPinching = true
    this.overviewGestureSessionActive = true
    this.overviewPinchState = null
    this.activePinchViewportRect = this.resolveOverviewPinchViewportRect()
    const seed = { touches }
    this.pendingOverviewPinchSeed = seed
    this.primeOverviewPinch(seed)
  },

  handleOverviewPinchMove(e) {
    if (this.data.treeViewMode !== TREE_VIEW_OVERVIEW || !e.touches || !this.overviewViewportRect) return
    if (e.touches.length < 2) {
      if (this.overviewTapCandidate && e.touches[0]) {
        const point = this.normalizeTouchPoint(e.touches[0])
        const startPoint = this.overviewTapCandidate.startPoint || point
        const dx = point.x - startPoint.x
        const dy = point.y - startPoint.y
        if (Math.sqrt(dx * dx + dy * dy) > 12) {
          this.overviewTapCandidate.moved = true
        }
      }
      return
    }
    if (!this.overviewPinchState) {
      if (this.pendingOverviewPinchSeed) {
        const touches = this.cloneTouchPair(e.touches)
        if (touches) {
          this.pendingOverviewPinchSeed.touches = touches
        }
      }
      return
    }
    const distance = this.getTouchDistance(e.touches)
    const center = this.getTouchCenter(e.touches)
    if (!distance || !center) return

    const activeViewportRect = this.resolveOverviewPinchViewportRect()
    if (!activeViewportRect) return

    const midpointX = center.x - activeViewportRect.left
    const midpointY = center.y - activeViewportRect.top
    const rawScaleRatio = distance / this.overviewPinchState.startDistance
    const scaleRatio = 1 + (rawScaleRatio - 1) * OVERVIEW_PINCH_SENSITIVITY
    const nextScale = this.clampOverviewScale(this.overviewPinchState.startScale * scaleRatio)
    const nextLeft = this.overviewPinchState.anchorCanvasX * nextScale - midpointX
    const nextTop = this.overviewPinchState.anchorCanvasY * nextScale - midpointY
    const clamped = this.clampOverviewScroll(nextLeft, nextTop, nextScale)
    const pinchPayload = {
      nextScale,
      nextLeft: clamped.left,
      nextTop: clamped.top
    }

    this.overviewPinchState.latestPayload = pinchPayload
    const now = Date.now()
    if (now - Number(this.overviewPinchState.lastRenderAt || 0) < this.overviewPinchThrottleMs) {
      return
    }

    this.overviewPinchState.lastRenderAt = now
    this.applyOverviewPinchPreview(pinchPayload)
  },

  handleOverviewPinchEnd(e) {
    if (this.data.treeViewMode !== TREE_VIEW_OVERVIEW) {
      return
    }

    if (e && e.type === 'touchcancel') {
      this.overviewTapCandidate = null
      if (this.overviewPinching || this.overviewPinchState || this.pendingOverviewPinchSeed) {
        const latestPayload = this.overviewPinchState && this.overviewPinchState.latestPayload
        this.commitOverviewPinch(latestPayload).finally(() => {
          this.clearOverviewGestureState({
            preserveTapSuppressUntil: true
          })
        })
      }
      return
    }

    if (e.touches && e.touches.length >= 2 && this.overviewViewportRect) {
      const latestPayload = this.overviewPinchState && this.overviewPinchState.latestPayload
      this.commitOverviewPinch(latestPayload).finally(() => {
        this.overviewPinchState = null
        const seedTouches = this.cloneTouchPair(e.touches)
        if (!seedTouches) {
          this.clearOverviewGestureState({
            preserveTapSuppressUntil: true
          })
          return
        }
        const seed = { touches: seedTouches }
        this.pendingOverviewPinchSeed = seed
        this.primeOverviewPinch(seed)
      })
      return
    }

    const hadPinchGesture = this.overviewPinching
      || !!this.overviewPinchState
      || !!this.pendingOverviewPinchSeed

    if (!hadPinchGesture) {
      const tapCandidate = this.overviewTapCandidate
      this.overviewTapCandidate = null
      if (!tapCandidate || tapCandidate.moved || this.shouldSuppressOverviewTap()) {
        return
      }
      const scrollState = this.getOverviewScrollState()
      if (Math.abs(Number(scrollState.left || 0) - Number(tapCandidate.startScrollLeft || 0)) > 6
        || Math.abs(Number(scrollState.top || 0) - Number(tapCandidate.startScrollTop || 0)) > 6) {
        return
      }
      const point = this.resolveEventPoint(e) || tapCandidate.startPoint
      const node = this.findOverviewNodeAtPoint(point)
      if (!node) {
        return
      }
      this.dispatchTreeNodeAction({
        id: node.id,
        action: node.tapAction,
        parentId: node.groupParentId
      })
      return
    }

    const latestPayload = this.overviewPinchState && this.overviewPinchState.latestPayload
    this.overviewTapSuppressUntil = Date.now() + OVERVIEW_TAP_SUPPRESS_DURATION
    this.commitOverviewPinch(latestPayload).finally(() => {
      this.clearOverviewGestureState({
        preserveTapSuppressUntil: true
      })
    })
  },

  handleTreeNodeTap(e) {
    if (this.shouldSuppressOverviewTap()) {
      return
    }
    if (this.data.treeViewMode === TREE_VIEW_OVERVIEW) {
      this.overviewLastDirectTapAt = Date.now()
    }
    this.dispatchTreeNodeAction(e.currentTarget.dataset || {})
  },

  handleOverviewSurfaceTap(e) {
    if (this.data.treeViewMode !== TREE_VIEW_OVERVIEW) {
      return
    }
    if (this.shouldSuppressOverviewTap()) {
      return
    }
    if (Date.now() - Number(this.overviewLastDirectTapAt || 0) < 80) {
      return
    }

    const point = this.resolveEventPoint(e)
    const node = this.findOverviewNodeAtPoint(point)
    if (!node) {
      return
    }

    this.dispatchTreeNodeAction({
      id: node.id,
      action: node.tapAction,
      parentId: node.groupParentId
    })
  },

  handleFocusEntryTap(e) {
    if (this.shouldSuppressOverviewTap()) {
      return
    }
    const action = e.currentTarget.dataset.action
    if (action === 'openPedigree') {
      this.openPedigree(e)
      return
    }
    this.setFocusMember(e)
  },

  setFocusMember(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    if (!memberId || !this.numMap[memberId]) return
    this.setCenterMember(memberId, { nextViewMode: TREE_VIEW_PEDIGREE })
  },

  openPedigree(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    if (!memberId || !this.numMap[memberId]) return
    this.setCenterMember(memberId, { nextViewMode: TREE_VIEW_PEDIGREE })
  },

  clearLocatePulse() {
    if (this.locatePulseTimer) {
      clearTimeout(this.locatePulseTimer)
      this.locatePulseTimer = null
    }

    if (!this.data.locatePulseNodeId && !this.data.locateToastText && !this.data.locatePulseUntil) {
      return
    }

    this.setData({
      locatePulseNodeId: null,
      locateToastText: '',
      locatePulseUntil: 0,
      ...this.getEmptyLocateCallout()
    })
  },

  resolveLocateViewMode() {
    if (this.data.identityType === 'EXTERNAL_SPOUSE' || !this.data.preferredMemberVisible) {
      return TREE_VIEW_OVERVIEW
    }

    return this.data.treeViewMode === TREE_VIEW_OVERVIEW
      ? TREE_VIEW_OVERVIEW
      : TREE_VIEW_PEDIGREE
  },

  triggerLocateFeedback(memberId) {
    const locateToastText = this.data.identityType === 'EXTERNAL_SPOUSE'
      ? '找到你啦，先挂靠在这位先生旁边'
      : '找到你啦，族谱 C 位已就绪'
    const locatePulseUntil = Date.now() + LOCATE_FEEDBACK_DURATION

    if (this.locatePulseTimer) {
      clearTimeout(this.locatePulseTimer)
    }

    this.setData({
      locatePulseNodeId: memberId,
      locateToastText,
      locatePulseUntil
    }, () => this.refreshLocateCallout())

    this.locatePulseTimer = setTimeout(() => {
      this.clearLocatePulse()
    }, LOCATE_FEEDBACK_DURATION)
  },

  locateSelfNode() {
    const memberId = this.data.displayMemberId || this.data.preferredMemberId
    if (!memberId || !this.numMap[memberId]) {
      wx.showToast({ title: '还未绑定本人', icon: 'none' })
      return
    }

    const nextViewMode = this.resolveLocateViewMode()
    this.triggerLocateFeedback(memberId)

    if (nextViewMode === TREE_VIEW_OVERVIEW) {
      this.triggerOverviewSceneFx('focus')
      if (Number(this.data.centerMemberId) === Number(memberId) && this.data.treeViewMode === TREE_VIEW_OVERVIEW) {
        this.resetOverviewViewport()
        return
      }
      this.pendingOverviewReset = true
      this.setCenterMember(memberId, { nextViewMode: TREE_VIEW_OVERVIEW })
      return
    }

    if (Number(this.data.centerMemberId) === Number(memberId) && this.data.treeViewMode === TREE_VIEW_PEDIGREE) {
      this.pendingPedigreeReset = true
      this.syncPedigreeViewport({ reset: true })
      return
    }

    this.setCenterMember(memberId, { nextViewMode: TREE_VIEW_PEDIGREE })
  },

  expandBranch(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    if (!memberId || !this.numMap[memberId]) return
    this.expandedBranchMap[memberId] = Number(this.expandedBranchMap[memberId] || 0) + 1
    this.applyView()
  },

  expandSiblingGroup(e) {
    const parentId = Number(e.currentTarget.dataset.parentId)
    if (!parentId || !this.numMap[parentId]) return
    this.expandedSiblingGroupMap[parentId] = true
    this.applyView()
  },

  expandOlderGenerations() {
    if (!this.windowState) return
    const centerId = this.data.centerMemberId
    const minAncestorGen = centerId ? this.computeMinAncestorGeneration(centerId) : this.globalMinGen
    if (this.windowState.visibleMinGen <= minAncestorGen) {
      wx.showToast({ title: '这支已无更早祖先', icon: 'none' })
      return
    }
    const nextMin = Math.max(this.globalMinGen, this.windowState.visibleMinGen - 3)
    if (nextMin === this.windowState.visibleMinGen) {
      wx.showToast({ title: '已经到最早可展示代际', icon: 'none' })
      return
    }
    this.windowState.visibleMinGen = nextMin
    this.applyView()
  },

  expandLaterGenerations() {
    if (!this.windowState) return
    const centerId = this.data.centerMemberId
    const maxDescGen = centerId ? this.computeMaxDescendantGeneration(centerId) : this.globalMaxGen
    if (this.windowState.visibleMaxGen >= maxDescGen) {
      wx.showToast({ title: '这支已无更晚后代', icon: 'none' })
      return
    }
    const nextMax = Math.min(this.globalMaxGen, this.windowState.visibleMaxGen + 3)
    if (nextMax === this.windowState.visibleMaxGen) {
      wx.showToast({ title: '已经到最晚可展示代际', icon: 'none' })
      return
    }
    this.windowState.visibleMaxGen = nextMax
    this.applyView()
  },

  expandAll() {
    Object.keys(this.primaryChildrenMap).forEach((memberId) => {
      this.classicExpandedMap[memberId] = true
    })
    this.setData({ displayList: this.buildClassicDisplayList() })
  },

  collapseAll() {
    this.classicExpandedMap = {}
    this.rootNodes.forEach((member) => {
      this.classicExpandedMap[member.id] = true
    })
    this.setData({ displayList: this.buildClassicDisplayList() })
  },

  toggleNode(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    if (!memberId) return
    this.classicExpandedMap[memberId] = !this.classicExpandedMap[memberId]
    this.setData({ displayList: this.buildClassicDisplayList() })
  },

  goSelectSelf() {
    wx.navigateTo({ url: '/pages/member/select-self/select-self?from=tree' })
  },

  goBackSelection() {
    wx.navigateBack()
  },

  selectTreeMember(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    if (!memberId || !this.numMap[memberId]) return

    const member = this.numMap[memberId]
    const selectionState = this.getSelectionState(member)
    if (!selectionState.selectable) {
      wx.showToast({
        title: selectionState.reason || '当前节点不可选择',
        icon: 'none'
      })
      return
    }
    if (!this.openerEventChannel || typeof this.openerEventChannel.emit !== 'function') {
      wx.showToast({
        title: '当前页面无法回传所选成员',
        icon: 'none'
      })
      return
    }

    this.openerEventChannel.emit('memberSelected', {
      mode: this.data.selectMode,
      memberId: member.id,
      memberName: member.name || '',
      gender: Number(member.gender || 0)
    })
    wx.navigateBack()
  },

  goLoginPage() {
    wx.reLaunch({ url: '/pages/login/login' })
  },

  goDetail(e) {
    const memberId = Number(e.currentTarget.dataset.id)
    if (!memberId) return
    if (this.data.selectMode) {
      this.selectTreeMember(e)
      return
    }
    wx.navigateTo({ url: `/pages/member/detail/detail?id=${memberId}` })
  }
})
