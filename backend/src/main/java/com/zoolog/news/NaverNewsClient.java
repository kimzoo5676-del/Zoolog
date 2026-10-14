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
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

// 네이버 뉴스 검색 API(NAVER API HUB): IT·취업 기사 후보 (기사 앞부분 문장 description을 소개 근거로 사용)
// 인기순 정렬이 없어 최신순으로 모은 뒤 고르기는 NewsRanker(또는 Claude)
// 개발자센터(openapi.naver.com) 검색 API는 네이버 클라우드 NAVER API HUB로 이관: 주소·인증 헤더만 다르고 요청·응답 형식은 같음
// https://api.ncloud-docs.com/docs/naver-api-hub-search-news
@Component
public class NaverNewsClient {

    private static final Logger log = LoggerFactory.getLogger(NaverNewsClient.class);

    private static final String SEARCH_URL = "https://naverapihub.apigw.ntruss.com/search/v1/news";
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
    // 한 검색어가 실패해도 나머지로 계속 (모두 실패하면 예외: 메일에 IT 기사 생략 + 오류 로그)
    public List<NewsArticle> recent(List<String> queries, int perQuery, int limit) {
        Map<String, NewsArticle> byTitle = new LinkedHashMap<>();
        Instant since = clock.instant().minus(FRESH);
        int failed = 0;
        RestClientException lastError = null;
        for (String query : queries) {
            List<SearchResponse.Item> items;
            try {
                items = search(query, perQuery, "date");
            } catch (RestClientException e) {
                log.warn("네이버 뉴스 검색 실패 (검색어 {}): {}", query, e.getMessage());
                failed++;
                lastError = e;
                continue;
            }
            for (SearchResponse.Item item : items) {
                if (hasLink(item) && publishedAt(item.pubDate()).isAfter(since)) {
                    NewsArticle article = toArticle(item);
                    byTitle.putIfAbsent(article.title(), article);
                }
            }
        }
        if (failed > 0 && failed == queries.size()) {
            throw new IllegalStateException("네이버 뉴스 검색이 모두 실패", lastError);
        }
        return byTitle.values().stream().limit(limit).toList();
    }

    // 다른 곳(Google 뉴스)에서 고른 기사를 제목으로 검색해 같은 기사의 원문 주소·요약을 찾음 (관련도순 상위 10개 중 제목이 비슷한 첫 기사)
    // Google 뉴스 기사 링크는 휴대폰에서 Google 뉴스 앱으로 열리며 "콘텐츠를 찾을 수 없음"이 뜨는 경우가 있어 원문 주소로 바꾸는 용도
    public Optional<NewsArticle> findSameStory(String title) {
        return search(title, 10, "sim").stream()
                .filter(NaverNewsClient::hasLink)
                .map(NaverNewsClient::toArticle)
                .filter((article) -> NewsRanker.similar(article.title(), title))
                .findFirst();
    }

    private List<SearchResponse.Item> search(String query, int display, String sort) {
        URI uri = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("query", query)
                .queryParam("display", display)
                .queryParam("sort", sort)
                .encode()
                .build()
                .toUri();
        SearchResponse response = restClient.get().uri(uri)
                .header("X-NCP-APIGW-API-KEY-ID", clientId)
                .header("X-NCP-APIGW-API-KEY", clientSecret)
                .retrieve()
                .body(SearchResponse.class);
        return response == null || response.items() == null ? List.of() : response.items();
    }

    // 주소가 하나도 없는 기사는 메일에 넣지 않음
    private static boolean hasLink(SearchResponse.Item item) {
        return !isBlank(item.originallink()) || !isBlank(item.link());
    }

    // 제목·요약의 <b> 강조 태그와 HTML 문자(&quot; 등)를 일반 글자로. 원문 주소가 없으면 네이버 뉴스 주소
    static NewsArticle toArticle(SearchResponse.Item item) {
        String link = isBlank(item.originallink()) ? item.link() : item.originallink();
        return new NewsArticle(clean(item.title()), host(link), link, clean(item.description()));
    }

    // 언론사 칸: 주소의 호스트(www. 제외). 주소 형식이 잘못된 기사 하나 때문에 IT 기사 전체가 빠지지 않도록 빈 값
    private static String host(String link) {
        try {
            String host = link == null ? null : URI.create(link).getHost();
            return host == null ? "" : host.replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException e) {
            return "";
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String clean(String html) {
        return html == null ? "" : HtmlUtils.htmlUnescape(html.replaceAll("<[^>]+>", "")).strip();
    }

    private static Instant publishedAt(String pubDate) {
        if (pubDate == null) {
            return Instant.EPOCH;
        }
        try {
            return ZonedDateTime.parse(pubDate, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
        } catch (DateTimeParseException e) {
            return Instant.EPOCH;
        }
    }

    record SearchResponse(List<Item> items) {
        record Item(String title, String originallink, String link, String description, String pubDate) {
        }
    }
}
