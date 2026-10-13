package com.zoolog.news;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.zoolog.news.NewsPicks.Pick;
import com.zoolog.notification.OwnerMailer;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class NewsDigestServiceTest {

    private final GoogleNewsClient googleNews = mock(GoogleNewsClient.class);
    private final NaverNewsClient naverNews = mock(NaverNewsClient.class);
    private final NewsCurator curator = mock(NewsCurator.class);
    private final OwnerMailer mailer = mock(OwnerMailer.class);
    private final NewsProperties properties = new NewsProperties(true, "0 0 6 * * *", "claude-opus-5-5", List.of("AWS"));
    // 2026-10-14 06:00 한국 시각
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-13T21:00:00Z"), ZoneId.of("Asia/Seoul"));
    private final NewsDigestService service = new NewsDigestService(googleNews, naverNews, curator, mailer, properties, clock);

    private final List<NewsArticle> hot = List.of(
            new NewsArticle("첫 기사", "한겨레", "https://hot/1", ""),
            new NewsArticle("둘째 기사", "KBS 뉴스", "https://hot/2", ""));
    private final List<NewsArticle> career = List.of(
            new NewsArticle("AWS 리전 확장", "a.co.kr", "https://it/1", "AWS 요약"),
            new NewsArticle("주가 등락", "b.co.kr", "https://it/2", "주가 요약"),
            new NewsArticle("네이버 개발자 채용", "c.co.kr", "https://it/3", "채용 요약"));

    @BeforeEach
    void setUp() {
        given(googleNews.topStories(anyInt())).willReturn(hot);
        given(naverNews.isConfigured()).willReturn(true);
        given(naverNews.recent(any(), anyInt(), anyInt())).willReturn(career);
    }

    @Test
    @DisplayName("Claude가 고른 핫이슈 1개와 IT 기사 2개를 소개·원문 링크와 함께 날짜 제목으로 보낸다")
    void sendCuratedDigest() {
        given(curator.pick(hot, career)).willReturn(Optional.of(new NewsPicks(
                new Pick(1, "둘째 기사 소개"), List.of(new Pick(2, "채용 소개"), new Pick(0, "리전 소개")))));

        service.sendDailyDigest();

        String text = sentText("10월 14일 아침 기사");
        assertThat(text).isEqualTo("""
                오늘의 핫이슈

                - 둘째 기사 (KBS 뉴스)
                  둘째 기사 소개
                  https://hot/2

                IT · 취업

                - 네이버 개발자 채용 (c.co.kr)
                  채용 소개
                  https://it/3

                - AWS 리전 확장 (a.co.kr)
                  리전 소개
                  https://it/1

                """);
    }

    @Test
    @DisplayName("Claude 키가 없으면 핫이슈는 주요 기사 1위, IT는 규칙으로 고른 기사를 요약과 함께 보낸다")
    void fallbackWhenCuratorFails() {
        given(curator.pick(hot, career)).willReturn(Optional.empty());

        service.sendDailyDigest();

        assertThat(sentText("10월 14일 아침 기사"))
                .contains("- 첫 기사 (한겨레)\n  https://hot/1\n\nIT · 취업\n\n- 네이버 개발자 채용 (c.co.kr)\n  채용 요약",
                        "- AWS 리전 확장 (a.co.kr)\n  AWS 요약")
                .doesNotContain("둘째 기사", "주가 등락");
    }

    @Test
    @DisplayName("기사를 하나도 못 가져와도 못 가져왔다는 메일을 보낸다")
    void sendEvenWhenSourcesFail() {
        given(googleNews.topStories(anyInt())).willThrow(new IllegalStateException("연결 실패"));
        given(naverNews.isConfigured()).willReturn(false);
        given(curator.pick(List.of(), List.of())).willReturn(Optional.empty());

        service.sendDailyDigest();

        assertThat(sentText("10월 14일 아침 기사")).contains("오늘은 기사를 가져오지 못했어요");
    }

    private String sentText(String subject) {
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(eq(subject), text.capture());
        return text.getValue();
    }
}
