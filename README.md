# Family Tree Community Edition

单租户家谱管理小程序社区版，包含家谱树、成员详情、首页影像、迁徙时间线和家族通知历史等基础能力。

这个仓库只提供社区版能力：

- 提供单租户演示数据与本地运行说明
- 提供 `schema_showcase.sql` 和 `seed_showcase.sql` 方便快速体验界面效果
- 不内置真实微信、COS、数据库等生产配置
- 不承诺后台管理、微信提醒、文件上传在默认配置下可直接使用

## Important Notes

- 仓库中的成员、通知、影像、地名和迁徙信息全部是虚构演示数据。
- 社区版首发以“前台展示可跑通”为目标，登录、后台审核、消息发送和上传能力需要你自行配置。
- 商业使用、私有化部署、定制开发和多租户版本请联系仓库维护者单独授权。

## Project Layout

- `backend/`: Spring Boot 后端
- `miniprogram/`: 微信小程序前端
- `backend/src/main/resources/sql/schema_showcase.sql`: 演示库结构
- `backend/src/main/resources/sql/seed_showcase.sql`: 演示库虚构种子数据
- `docs/SETUP.md`: 本地启动说明

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
