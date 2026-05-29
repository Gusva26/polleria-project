# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY backend/pom.xml backend/
COPY frontend/pom.xml frontend/
RUN mvn dependency:go-offline -B
COPY backend/src backend/src
COPY frontend/src frontend/src
RUN mvn clean package -pl backend -am -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/backend/target/backend-1.0.0.jar app.jar

# Expose port
EXPOSE 8080

# Optimization for low memory (512MB)
# -Xmx320m: Max Heap Size
# -Xss256k: Thread Stack Size
# -XX:MaxMetaspaceSize=96m
ENTRYPOINT ["java", "-Xmx320m", "-Xss256k", "-XX:MaxMetaspaceSize=96m", "-jar", "app.jar"]
