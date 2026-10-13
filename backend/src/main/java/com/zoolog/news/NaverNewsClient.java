package com.zoolog.news;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

// 네이버 뉴스 검색 API: IT·취업 기사 후보 (기사 앞부분 문장 description을 소개 근거로 사용)
// 인기순 정렬이 없어 최신순으로 모은 뒤 선정은 Claude가 맡음
// https://developers.naver.com/docs/serviceapi/search/news/news.md
@Component
public class NaverNewsClient {

    private static final String SEARCH_URL = "https://openapi.naver.com/v1/search/news.json";
    // 전날 아침 이후 기사만 (06:00 발송 기준 하루)
    private static final Duration FRESH = Duration.ofHours(24);

    private final RestClient restClient = HttpClients.withTimeouts();
    private final String clientId;
    private final String clientSecret;
    private final Clock clock;

    public NaverNewsClient(@Value("${zoolog.naver.client-id}") String clientId,
            @Value("${zoolog.naver.client-secret}") String clientSecret, Clock clock) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.clock = clock;
    }

    public boolean isConfigured() {
        return !clientId.isBlank() && !clientSecret.isBlank();
    }

    // 검색어마다 최신 기사를 모아 하루 안 기사만, 같은 제목은 하나로
    public List<NewsArticle> recent(List<String> queries, int perQuery, int limit) {
        Map<String, NewsArticle> byTitle = new LinkedHashMap<>();
        Instant since = clock.instant().minus(FRESH);
        for (String query : queries) {
            URI uri = UriComponentsBuilder.fromUriString(SEARCH_URL)
                    .queryParam("query", query)
                    .queryParam("display", perQuery)
                    .queryParam("sort", "date")
                    .encode()
                    .build()
                    .toUri();
            SearchResponse response = restClient.get().uri(uri)
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .retrieve()
                    .body(SearchResponse.class);
            if (response == null || response.items() == null) {
                continue;
            }
            for (SearchResponse.Item item : response.items()) {
                if (publishedAt(item.pubDate()).isAfter(since)) {
                    NewsArticle article = toArticle(item);
                    byTitle.putIfAbsent(article.title(), article);
                }
            }
        }
        return byTitle.values().stream().limit(limit).toList();
    }

    // 제목·요약의 <b> 강조 태그와 HTML 문자(&quot; 등)를 일반 글자로. 원문 주소가 없으면 네이버 뉴스 주소
    static NewsArticle toArticle(SearchResponse.Item item) {
        String link = item.originallink() == null || item.originallink().isBlank() ? item.link() : item.originallink();
        String source = link == null ? "" : URI.create(link).getHost();
        return new NewsArticle(clean(item.title()), source == null ? "" : source.replaceFirst("^www\\.", ""), link,
                clean(item.description()));
    }

    private static String clean(String html) {
        return html == null ? "" : HtmlUtils.htmlUnescape(html.replaceAll("<[^>]+>", "")).strip();
    }

    private static Instant publishedAt(String pubDate) {
        try {
            return ZonedDateTime.parse(pubDate, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
        } catch (DateTimeParseException | NullPointerException e) {
            return Instant.EPOCH;
        }
    }

    record SearchResponse(List<Item> items) {
        record Item(String title, String originallink, String link, String description, String pubDate) {
        }
    }
}
