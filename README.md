# Family Tree Community Edition

单租户家谱管理小程序社区版，覆盖家谱树、成员详情、首页影像、迁徙时间线和家族通知历史等基础能力。

社区版当前定位：

- 提供单租户演示数据与本地运行说明
- 提供 `schema_showcase.sql` 和 `seed_showcase.sql` 快速复现界面效果
- 不内置真实微信、COS、数据库等生产配置
- 不承诺后台管理、微信提醒、文件上传在默认配置下可直接使用

## Important Notes

- 仓库中的成员、通知、影像、地名和迁徙信息全部为虚构演示数据。
- 社区版首发以“前台展示可跑通”为目标，登录、后台审核、消息发送和上传能力需要自行配置。
- 商业使用、私有化部署、定制开发和多租户版本请联系维护者单独授权。

## Demo Showcase

建议你在正式公开前准备 5 张截图和 1 个短视频，优先展示这几个页面：

1. 登录页与迁徙时间线
2. 首页影像轮播
3. 家谱树主视图
4. 成员详情页
5. 通知历史页

推荐把展示素材放到 `docs/showcase/` 目录，并使用这些文件名：

- `docs/showcase/01-login-timeline.png`
- `docs/showcase/02-home-gallery.png`
- `docs/showcase/03-family-tree.png`
- `docs/showcase/04-member-detail.png`
- `docs/showcase/05-notification-history.png`
- `docs/showcase/demo-cover.png`

截图要点、60 到 90 秒演示视频脚本、README 可直接复用的图片文案模板见 [docs/SHOWCASE.md](docs/SHOWCASE.md)。

## Project Layout

- `backend/`: Spring Boot 后端
- `miniprogram/`: 微信小程序前端
- `backend/src/main/resources/sql/schema_showcase.sql`: 演示库结构
- `backend/src/main/resources/sql/seed_showcase.sql`: 演示库虚构种子数据
- `docs/SETUP.md`: 本地启动说明
- `docs/SHOWCASE.md`: 截图与演示视频脚本

## Quick Start

1. 准备 MySQL 8.x，并直接导入社区版自带的 `family_tree_showcase` 演示库结构和数据。
2. 导入 [schema_showcase.sql](backend/src/main/resources/sql/schema_showcase.sql) 和 [seed_showcase.sql](backend/src/main/resources/sql/seed_showcase.sql)。
3. 按 [.env.example](.env.example) 配置环境变量，至少填好数据库连接。
4. 在 `backend` 目录启动 Spring Boot 服务。
5. 在微信开发者工具中打开 `miniprogram`，默认环境已经指向 `http://127.0.0.1:8080/api`。

更详细的步骤见 [docs/SETUP.md](docs/SETUP.md)。

## Community Edition Boundary

- 已包含：家谱树浏览、成员列表与详情、首页影像轮播、迁徙时间线、家族通知历史、完整演示数据 SQL。
- 未包含：多租户、真实生产配置、运维脚本、真实导谱脚本、真实家族资料。
- 默认占位：微信小程序配置、COS、邮件、订阅消息模板、JWT 密钥。

## License

本仓库采用自定义社区版许可证，见 [LICENSE](LICENSE)。
