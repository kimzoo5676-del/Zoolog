# 백엔드 실행 이미지: jar는 CI(GitHub Actions)에서 ./gradlew bootJar로 미리 빌드 (서버에서 빌드하지 않음)
FROM eclipse-temurin:25-jre

RUN useradd --system --uid 10001 zoolog
WORKDIR /app
COPY build/libs/*.jar app.jar
USER zoolog

# 컨테이너 메모리 상한(k8s limit)의 50%를 힙으로, 작은 서버라 메모리를 적게 쓰는 Serial GC
# 70% → 50% (2026-10-31): 서버 메모리가 모자라 스왑으로 멈추던 문제, 힙을 크게 잡아 두지 않도록
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=50 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
