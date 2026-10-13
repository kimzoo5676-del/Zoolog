package com.zoolog.news;

import static org.assertj.core.api.Assertions.assertThat;

import com.anthropic.core.JsonValue;
import com.zoolog.news.NewsPicks.Pick;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NewsCuratorTest {

    private static final List<NewsArticle> HOT = List.of(new NewsArticle("핫이슈", "한겨레", "https://a", ""));
    private static final List<NewsArticle> CAREER = List.of(
            new NewsArticle("AWS 리전", "example.co.kr", "https://b", "요약 1"),
            new NewsArticle("네이버 채용", "example.co.kr", "https://c", "요약 2"));

    @Test
    @DisplayName("요청에 후보 목록, 구조화된 응답 형식, 거절 시 자동 재시도 설정이 들어간다")
    void buildRequest() {
        var params = NewsCurator.params("claude-opus-5-5", HOT, CAREER);

        assertThat(params.rawParams().outputConfig()).isPresent();
        assertThat(params.rawParams()._additionalBodyProperties()).containsEntry("fallbacks", JsonValue.from("default"));
        assertThat(params.rawParams()._additionalHeaders().values("anthropic-beta"))
                .containsExactly("server-side-fallback-2026-07-01");
        assertThat(params.rawParams().messages().getFirst().content().string().orElseThrow())
                .contains("[0] 핫이슈 (한겨레)", "[1] 네이버 채용 (example.co.kr)", "요약: 요약 2");
    }

    @Test
    @DisplayName("고른 번호가 후보 범위를 벗어나거나 IT 기사 2개가 같으면 쓰지 않는다")
    void validatePicks() {
        assertThat(NewsCurator.isValid(new NewsPicks(new Pick(0, "a"), List.of(new Pick(0, "b"), new Pick(1, "c"))), 1, 2))
                .isTrue();
        assertThat(NewsCurator.isValid(new NewsPicks(new Pick(1, "a"), List.of(new Pick(0, "b"), new Pick(1, "c"))), 1, 2))
                .isFalse();
        assertThat(NewsCurator.isValid(new NewsPicks(new Pick(0, "a"), List.of(new Pick(1, "b"), new Pick(1, "c"))), 1, 2))
                .isFalse();
        assertThat(NewsCurator.isValid(new NewsPicks(new Pick(0, "a"), List.of(new Pick(0, "b"))), 1, 2)).isFalse();
    }
}
