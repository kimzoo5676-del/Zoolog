package com.zoolog.news;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class NaverNewsClientTest {

    @Test
    @DisplayName("검색 결과의 강조 태그와 HTML 문자를 일반 글자로 바꾸고 원문 주소와 사이트 이름을 쓴다")
    void toArticle() {
        var item = new NaverNewsClient.SearchResponse.Item(
                "<b>AWS</b> 서울 리전 &quot;확장&quot;",
                "https://www.example.co.kr/news/1",
                "https://n.news.naver.com/article/1",
                "아마존웹서비스(<b>AWS</b>)가 &amp; 데이터센터를...",
                "Tue, 13 Oct 2026 15:50:00 +0900");

        assertThat(NaverNewsClient.toArticle(item)).isEqualTo(new NewsArticle(
                "AWS 서울 리전 \"확장\"", "example.co.kr", "https://www.example.co.kr/news/1",
                "아마존웹서비스(AWS)가 & 데이터센터를..."));
    }

    @Test
    @DisplayName("원문 주소가 없으면 네이버 뉴스 주소를 쓴다")
    void fallbackToNaverLink() {
        var item = new NaverNewsClient.SearchResponse.Item("제목", "", "https://n.news.naver.com/article/1", "요약",
                "Tue, 13 Oct 2026 15:50:00 +0900");

        assertThat(NaverNewsClient.toArticle(item).link()).isEqualTo("https://n.news.naver.com/article/1");
    }

    @Test
    @DisplayName("주소 형식이 잘못된 기사도 오류 없이 언론사 칸만 비운다")
    void malformedLink() {
        var item = new NaverNewsClient.SearchResponse.Item("제목", "https://bad host/news 1", "", "요약",
                "Tue, 13 Oct 2026 15:50:00 +0900");

        assertThat(NaverNewsClient.toArticle(item).source()).isEmpty();
    }

    @Test
    @DisplayName("NAVER API HUB 응답(모르는 칸 포함)을 글자로 받아 기사 목록으로 읽는다")
    void parseResponse() {
        String body = """
                {"lastBuildDate":"Wed, 14 Oct 2026 06:00:00 +0900","total":2,"start":1,"display":1,
                 "items":[{"title":"<b>AWS</b> 채용","originallink":"https://a.co.kr/1","link":"https://n.news.naver.com/1",
                 "description":"요약","pubDate":"Wed, 14 Oct 2026 05:50:00 +0900"}]}
                """;

        var items = NaverNewsClient.parse(body, JsonMapper.builder().build());

        assertThat(items).hasSize(1);
        assertThat(NaverNewsClient.toArticle(items.get(0)).title()).isEqualTo("AWS 채용");
    }
}
