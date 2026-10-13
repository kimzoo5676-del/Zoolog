package com.zoolog.news;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
}
