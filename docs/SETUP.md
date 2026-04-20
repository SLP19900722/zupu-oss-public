# Community Edition Setup

## 1. Import the showcase data

推荐直接使用仓库内的演示 SQL：

1. 使用仓库默认的 `family_tree_showcase`，或自行改成别的库名后同步调整 `DB_URL`
2. 导入 [schema_showcase.sql](../backend/src/main/resources/sql/schema_showcase.sql)
3. 再导入 [seed_showcase.sql](../backend/src/main/resources/sql/seed_showcase.sql)

如果你想复用仓库里的演示库名称，也可以直接使用 `family_tree_showcase`。

## 2. Configure backend environment

最少需要这些环境变量：

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`

示例见 [.env.example](../.env.example)。

默认情况下：

- 微信配置使用 `YOUR_*` 占位值
- 后端会保留当前代码里的测试回退逻辑
- COS、邮件、订阅消息模板都需要你自己补充

## 3. Start the backend

在 `backend` 目录运行：

```powershell
mvn spring-boot:run
```

如果你使用的是打包方式，也可以先执行：

```powershell
mvn test
mvn package
java -jar target/family-tree-backend-1.0.0.jar
```

## 4. Open the mini program

1. 用微信开发者工具打开 `miniprogram`
2. 当前默认环境是 `dev`
3. 默认后端地址是 `http://127.0.0.1:8080/api`
4. 当前 `project.config.json` 使用 `touristappid` 占位；如果你要真机调试，请替换成自己的小程序 AppID

## 5. Scope of the first run

社区版首发建议先验证这些页面：

- 首页
- 家谱树
- 成员列表
- 成员详情
- 通知历史
- 迁徙时间线

这些页面依赖的都是仓库内已经提供的虚构演示数据。

## 6. What is intentionally not bundled

以下内容不会在社区版里直接打通：

- 真实微信登录
- 真实订阅消息发送
- COS 上传链路
- 商业化多租户能力
- 私有导谱脚本和运维脚本
