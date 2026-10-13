package com.zoolog.news;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

// application.yaml zoolog.news: 아침 기사 메일
// queries: IT·취업 기사 후보를 모을 네이버 뉴스 검색어
@ConfigurationProperties("zoolog.news")
public record NewsProperties(boolean enabled, String cron, String model, List<String> queries) {

    public NewsProperties {
        queries = queries == null ? List.of() : List.copyOf(queries);
    }
}
