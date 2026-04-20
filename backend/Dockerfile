# 使用官方的OpenJDK 8作为基础镜像
FROM openjdk:8-jdk-alpine

# 设置工作目录
WORKDIR /app

# 复制pom.xml并下载依赖
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# 下载依赖
RUN ./mvnw dependency:go-offline -B

# 复制源代码
COPY src ./src

# 构建应用
RUN ./mvnw clean package -DskipTests

# 暴露端口
EXPOSE 8080

# 运行应用
ENTRYPOINT ["java", "-jar", "target/family-tree-backend-1.0.0.jar"]