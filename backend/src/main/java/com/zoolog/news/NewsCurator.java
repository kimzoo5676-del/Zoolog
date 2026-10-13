package com.zoolog.news;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.errors.AnthropicException;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.anthropic.models.messages.MessageCreateParams;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// 기사 후보 중 핫이슈 1개 + Cloud·SW 엔지니어 취업 준비생에게 맞는 IT 기사 2개를 Claude가 고르고 소개 한 줄을 씀
// 실패하면 빈 값: 호출한 쪽이 규칙 선정(목록 앞쪽)으로 대신함
@Component
public class NewsCurator {

    private static final Logger log = LoggerFactory.getLogger(NewsCurator.class);

    // 고정 지시문 (매일 같은 내용)
    private static final String SYSTEM = """
            당신은 Cloud Engineer · SW Engineer 취업을 준비하는 한국 사용자에게 매일 아침 읽을 기사를 골라 주는 편집자입니다.

            두 후보 목록에서 고르세요.
            - 핫이슈: 주제와 상관없이 오늘 한국에서 가장 많이 이야기될 기사 1개. 목록 앞쪽일수록 비중 있게 다뤄진 기사입니다.
            - IT·취업: 국내외 IT 대기업(삼성전자, SK하이닉스, 네이버, 카카오, LG CNS, 쿠팡, 토스, AWS, Microsoft, Google, NVIDIA 등)의 \
            채용, 투자, 신사업, 클라우드·AI·인프라 동향처럼 면접이나 자기소개서에 쓸 수 있는 기사 2개. \
            같은 사건을 다룬 기사는 하나만 고르고, 광고성 기사·주가 등락만 다룬 기사·단순 행사 안내는 피하세요.

            소개는 한 문장으로, 기사를 읽을 이유가 드러나게 쓰세요. 제목과 요약에 없는 사실은 지어내지 마세요.""";

    private final AnthropicClient client;
    private final String model;

    public NewsCurator(@Value("${zoolog.anthropic.api-key}") String apiKey, @Value("${zoolog.news.model}") String model) {
        this.client = apiKey.isBlank() ? null : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
        this.model = model;
    }

    public Optional<NewsPicks> pick(List<NewsArticle> hotCandidates, List<NewsArticle> careerCandidates) {
        if (client == null || hotCandidates.isEmpty() || careerCandidates.size() < 2) {
            return Optional.empty();
        }
        StructuredMessageCreateParams<NewsPicks> params = params(model, hotCandidates, careerCandidates);
        try {
            StructuredMessage<NewsPicks> response = client.messages().create(params);
            if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
                log.warn("기사 선정 요청이 거절됨");
                return Optional.empty();
            }
            return response.content().stream()
                    .flatMap((block) -> block.text().stream())
                    .map((text) -> text.text())
                    .findFirst()
                    .filter((picks) -> isValid(picks, hotCandidates.size(), careerCandidates.size()));
        } catch (AnthropicException e) {
            log.error("기사 선정 실패", e);
            return Optional.empty();
        }
    }

    static StructuredMessageCreateParams<NewsPicks> params(String model, List<NewsArticle> hotCandidates,
            List<NewsArticle> careerCandidates) {
        return MessageCreateParams.builder()
                .model(model)
                .maxTokens(16000L)
                .system(SYSTEM)
                .outputConfig(NewsPicks.class)
                .addUserMessage("## 핫이슈 후보\n" + numbered(hotCandidates) + "\n\n## IT·취업 후보\n" + numbered(careerCandidates))
                // 안전 분류기가 요청을 거절하면 서버가 권장 모델로 다시 실행 (거절 범주별 자동 선택)
                .putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
                .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
                .build();
    }

    // 번호가 후보 범위 안이고 IT 기사 2개가 서로 다른지
    static boolean isValid(NewsPicks picks, int hotSize, int careerSize) {
        if (picks.hotIssue() == null || picks.careerNews() == null || picks.careerNews().size() != 2) {
            return false;
        }
        int first = picks.careerNews().get(0).index();
        int second = picks.careerNews().get(1).index();
        int hot = picks.hotIssue().index();
        return hot >= 0 && hot < hotSize && first >= 0 && first < careerSize && second >= 0 && second < careerSize
                && first != second;
    }

    private static String numbered(List<NewsArticle> articles) {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < articles.size(); i++) {
            NewsArticle article = articles.get(i);
            text.append('[').append(i).append("] ").append(article.title());
            if (!article.source().isEmpty()) {
                text.append(" (").append(article.source()).append(')');
            }
            if (!article.summary().isEmpty()) {
                text.append("\n    요약: ").append(article.summary());
            }
            text.append('\n');
        }
        return text.toString();
    }

    @PreDestroy
    void close() {
        if (client != null) {
            client.close();
        }
    }
}
