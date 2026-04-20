# 社区版启动说明

## 1. 导入演示数据

建议使用的数据库名：

- `family_tree_showcase`

导入顺序如下：

1. [schema_showcase.sql](../backend/src/main/resources/sql/schema_showcase.sql)
2. [seed_showcase.sql](../backend/src/main/resources/sql/seed_showcase.sql)

如果你想使用其他数据库名，也可以，只需要同步修改数据库连接地址即可。

## 2. 检查基础环境变量

至少建议确认这些变量：

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`

示例见 [../.env.example](../.env.example)。

默认情况下：

- 微信配置仍使用 `YOUR_*` 占位值
- COS、邮件、订阅模板等能力需要你自己补充
- 现有代码中保留了一些开发态兼容逻辑

## 3. 配置拆分说明

为了兼顾公开安全与本地演示，后端配置被拆成了三层：

- `application.yml`：公共基线配置
- `application-local.yml`：本地演示默认配置
- `application-remote.yml.example`：远程演示模板

如果你要用远程演示库录屏，可以把模板复制为本地私有文件：

- `application-remote.yml`

这个真实远程配置文件已经被 Git 忽略，不会进入公开仓库。

## 4. 启动后端

在 `backend/` 目录运行：

```powershell
mvn spring-boot:run
```

默认会走 `local` profile，适合本地截图和演示。

如果你要连接自己的远程演示库：

```powershell
Copy-Item src\main\resources\application-remote.yml.example src\main\resources\application-remote.yml
```

补充完本地私有配置后，再执行：

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=remote
```

如果你更习惯打包启动，也可以：

```powershell
mvn test
mvn package
java -jar target/family-tree-backend-1.0.0.jar
```

## 5. 打开小程序

1. 用微信开发者工具打开 `miniprogram/`
2. 默认前端环境是 `dev`
3. 默认后端地址是 `http://127.0.0.1:8080/api`
4. `project.config.json` 使用 `touristappid` 作为安全占位

如果你需要真机调试，可以改成自己的小程序 AppID，但不要把真实配置提交到公开仓库。

## 6. 首次建议验证的页面

建议优先验证这些页面：

- 首页
- 家族树
- 成员名录
- 成员详情
- 通知历史
- 迁徙时间线

这些页面都已经被仓库里的虚构演示数据覆盖。

## 7. 社区版未直接打通的能力

社区版默认不直接包含：

- 真实微信登录
- 真实订阅消息发送
- COS 上传链路
- 多租户商业能力
- 私有导谱或运维脚本
