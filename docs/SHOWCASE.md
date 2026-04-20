# 展示素材说明

这份文档用于整理仓库首页截图、演示视频和对外传播素材。目标不是把所有功能都讲全，而是让别人快速看懂：

- 这个项目已经做出来了
- 这个项目适合族谱/家族场景
- 这个项目可以继续做商业化交付

## 1. 截图建议顺序

建议优先展示这 5 张核心截图：

1. `docs/showcase/01-login-timeline.png`
2. `docs/showcase/02-home-gallery.png`
3. `docs/showcase/03-family-tree.png`
4. `docs/showcase/04-member-detail.png`
5. `docs/showcase/05-notification-history.png`

补充截图可放：

- `docs/showcase/06-select-self.png`
- `docs/showcase/07-member-directory-overview.png`
- `docs/showcase/08-member-directory-list.png`

截图建议：

- 使用微信开发者工具手机模拟器竖屏截图
- 保持页面上有真实演示数据，不要截到调试面板
- 风格统一，不要混入不同主题或不同品牌状态

## 2. 每张图建议表达什么

- 登录页与迁徙脉络：先讲家族来处，再进入系统
- 首页影像展示：不只是成员管理，也能承接家族影像与活动记忆
- 家族树：直观体现世代关系与谱系结构
- 成员详情：适合承接职业、地址、简介等长期资料
- 通知历史：适合展示家族公告、祭祀安排、活动提醒
- 首次登录选本人：体现认领/绑定流程
- 成员名录总览：体现名录规模和搜索能力
- 成员名录列表：体现浏览体验和信息密度

## 3. 演示视频建议脚本

建议时长：

- `60 ~ 90 秒`

建议顺序：

1. `0s - 8s`：打开登录页，慢慢滑一下迁徙脉络
2. `8s - 18s`：进入首页，停在影像展示窗
3. `18s - 35s`：进入家族树，做一次慢速拖动或缩放
4. `35s - 50s`：打开成员详情页，停在资料区域
5. `50s - 65s`：打开通知历史页
6. `65s - 80s`：回到首页或家族树作为结束画面

录屏建议：

- 前 3 秒一定要有视觉亮点
- 手势或鼠标动作放慢一些
- 每切一次页面，停 1 秒给观众看清楚

如果你想用自己的远程演示库录屏，但又不想改公开仓库默认配置，可以在本地创建 `application-remote.yml`，再执行：

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=remote
```

## 4. 视频放在哪里

如果你希望视频也放在 GitHub 上，最适合的是放到当前仓库的 Release 附件里。

建议文件名：

- `family-tree-community-demo.mp4`

建议流程：

1. 创建一个 Release，例如 `v0.1.0`
2. 把视频作为 Release 附件上传
3. 复制视频附件地址，通常格式如下：

```text
https://github.com/<你的用户名>/<你的仓库>/releases/download/v0.1.0/family-tree-community-demo.mp4
```

4. 回到 `README.md`，替换掉占位视频链接

这么做的好处：

- 不会把大视频塞进 Git 历史
- README 可以直接点击封面图跳转到视频
- 后面更新视频也更方便

## 5. README 可直接复用的展示片段

你可以把下面这段直接放进 `README.md` 的“演示展示”部分：

```md
[![观看演示视频](docs/showcase/demo-cover.png)](https://github.com/<你的用户名>/<你的仓库>/releases/download/v0.1.0/family-tree-community-demo.mp4)

演示视频：[点击观看 90 秒演示](https://github.com/<你的用户名>/<你的仓库>/releases/download/v0.1.0/family-tree-community-demo.mp4)

![登录页与迁徙脉络](docs/showcase/01-login-timeline.png)
登录页可以先展示家族迁徙故事，再引导用户进入族谱系统。
![首页影像展示](docs/showcase/02-home-gallery.png)
首页不仅能看成员，也能承接家族影像和活动记录。
![家族树主视图](docs/showcase/03-family-tree.png)
家族树适合快速展示世代关系、主干分支和配偶结构。
![成员详情页](docs/showcase/04-member-detail.png)
成员详情页可以承接职业、地址、简介等长期资料。
![通知历史页](docs/showcase/05-notification-history.png)
通知历史页可用于展示家族公告、祭祀安排和活动提醒。
```

## 6. 这些素材还能用在哪

同一套素材可以重复利用：

- GitHub README：完整 5~8 张截图
- B 站 / 视频号 / 抖音：60~90 秒演示视频
- 公众号 / 朋友圈：封面图 + 3 张核心截图
- 私聊潜在客户：视频 + 家族树主视图 + 成员详情页
