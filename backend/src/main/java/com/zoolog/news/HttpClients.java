package com.zoolog.news;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// 외부 뉴스 요청용 RestClient: 응답이 없을 때 아침 작업이 멈춰 있지 않도록 시간 제한
final class HttpClients {

    private HttpClients() {
    }

    static RestClient withTimeouts() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(20));
        return RestClient.builder().requestFactory(factory).build();
    }
}
