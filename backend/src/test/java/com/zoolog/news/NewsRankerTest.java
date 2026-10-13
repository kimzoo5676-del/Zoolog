package com.zoolog.news;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NewsRankerTest {

    private static NewsArticle article(String title, String summary) {
        return new NewsArticle(title, "", "https://" + title.hashCode(), summary);
    }

    @Test
    @DisplayName("주가·광고성 기사는 빼고 채용 소식, 취업 주제, IT 대기업이 많이 나온 기사 순으로 고른다")
    void rankByTopics() {
        var stock = article("삼성전자 주가 급등, 목표가 상향", "AI 반도체 기대");
        var weather = article("내일 전국 비 소식", "");
        var cloud = article("AWS, 서울 리전 데이터센터 투자 확대", "클라우드 인프라");
        var hiring = article("네이버 하반기 신입 개발자 공채 시작", "채용 규모");

        assertThat(NewsRanker.top(List.of(stock, weather, cloud, hiring), 2)).containsExactly(hiring, cloud);
    }

    @Test
    @DisplayName("같은 사건을 다룬 비슷한 제목은 하나만 고른다")
    void skipSimilarTitles() {
        var first = article("카카오 AI 신사업 출범 발표", "");
        var same = article("카카오, AI 신사업 출범…플랫폼 강화", "");
        var other = article("SK하이닉스 신입 엔지니어 채용", "");

        var picked = NewsRanker.top(List.of(first, same, other), 2);

        assertThat(picked).hasSize(2).contains(other);
        assertThat(picked.contains(first) ^ picked.contains(same)).isTrue();
    }

    @Test
    @DisplayName("점수가 같으면 목록 앞쪽(최신) 기사를 고른다")
    void keepOrderOnTie() {
        var newer = article("LG CNS 클라우드 사업 확대", "");
        var older = article("KT 클라우드 사업 개편", "");

        assertThat(NewsRanker.top(List.of(newer, older), 1)).containsExactly(newer);
    }
}
