# 백엔드 실행 이미지: jar는 CI(GitHub Actions)에서 ./gradlew bootJar로 미리 빌드 (서버에서 빌드하지 않음)
FROM eclipse-temurin:25-jre

RUN useradd --system --uid 10001 zoolog
WORKDIR /app
COPY build/libs/*.jar app.jar
USER zoolog

# 컨테이너 메모리 상한(k8s limit)의 70%를 힙으로, 작은 서버라 메모리를 적게 쓰는 Serial GC
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
