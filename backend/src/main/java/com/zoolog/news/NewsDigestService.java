package com.zoolog.news;

import com.zoolog.notification.OwnerMailer;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// 매일 아침 기사 메일: 후보 모으기 → 선정 → 소유자에게 발송 (언제 보낼지는 NewsDigestScheduler)
// 선정은 Claude API 키가 있으면 Claude, 없거나 실패하면 규칙(핫이슈는 주요 기사 1위, IT는 NewsRanker), 소개는 기사 앞부분 문장
// 한 단계가 실패해도 가능한 만큼 보냄
@Service
public class NewsDigestService {

    private static final Logger log = LoggerFactory.getLogger(NewsDigestService.class);
    private static final int HOT_CANDIDATES = 15;
    private static final int CAREER_PER_QUERY = 10;
    private static final int CAREER_CANDIDATES = 40;

    private final GoogleNewsClient googleNews;
    private final NaverNewsClient naverNews;
    private final NewsCurator curator;
    private final OwnerMailer mailer;
    private final NewsProperties properties;
    private final Clock clock;
    private final String siteUrl;

    public NewsDigestService(GoogleNewsClient googleNews, NaverNewsClient naverNews, NewsCurator curator,
            OwnerMailer mailer, NewsProperties properties, Clock clock, @Value("${zoolog.site-url}") String siteUrl) {
        this.googleNews = googleNews;
        this.naverNews = naverNews;
        this.curator = curator;
        this.mailer = mailer;
        this.properties = properties;
        this.clock = clock;
        this.siteUrl = siteUrl;
    }

    // 메일을 보냈으면 true
    public boolean sendDailyDigest() {
        List<NewsArticle> hot = fetchHot();
        List<NewsArticle> career = fetchCareer();
        List<Selected> hotPicks = new ArrayList<>();
        List<Selected> careerPicks = new ArrayList<>();
        curator.pick(hot, career).ifPresentOrElse((picks) -> {
            hotPicks.add(new Selected(hot.get(picks.hotIssue().index()), picks.hotIssue().intro()));
            picks.careerNews().forEach((pick) -> careerPicks.add(new Selected(career.get(pick.index()), pick.intro())));
        }, () -> {
            hot.stream().limit(1).forEach((article) -> hotPicks.add(new Selected(article, article.summary())));
            NewsRanker.top(career, 2).forEach((article) -> careerPicks.add(new Selected(article, article.summary())));
        });
        hotPicks.replaceAll(this::withOriginalLink);
        LocalDate today = LocalDate.now(clock);
        return mailer.send(today.getMonthValue() + "월 " + today.getDayOfMonth() + "일 아침 기사",
                format(hotPicks, careerPicks, siteUrl, today));
    }

    // 핫이슈(Google 뉴스 링크)를 네이버에서 같은 기사로 찾아 원문 주소·언론사로 바꾸고, 소개가 없으면 기사 앞부분 문장
    // 못 찾거나 실패하면 Google 뉴스 링크 그대로 (제목은 Google 쪽 유지)
    private Selected withOriginalLink(Selected pick) {
        if (!naverNews.isConfigured()) {
            return pick;
        }
        try {
            return naverNews.findSameStory(pick.article().title())
                    .map((found) -> new Selected(
                            new NewsArticle(pick.article().title(), found.source(), found.link(), found.summary()),
                            pick.intro() == null || pick.intro().isBlank() ? found.summary() : pick.intro()))
                    .orElse(pick);
        } catch (RuntimeException e) {
            log.warn("핫이슈 원문 주소를 찾지 못함: {}", e.getMessage());
            return pick;
        }
    }

    private List<NewsArticle> fetchHot() {
        try {
            return googleNews.topStories(HOT_CANDIDATES);
        } catch (RuntimeException e) {
            log.error("핫이슈 후보를 가져오지 못함", e);
            return List.of();
        }
    }

    private List<NewsArticle> fetchCareer() {
        if (!naverNews.isConfigured()) {
            log.warn("네이버 API 키가 없어 IT·취업 기사를 건너뜀");
            return List.of();
        }
        try {
            return naverNews.recent(properties.queries(), CAREER_PER_QUERY, CAREER_CANDIDATES);
        } catch (RuntimeException e) {
            log.error("IT·취업 후보를 가져오지 못함", e);
            return List.of();
        }
    }

    static String format(List<Selected> hot, List<Selected> career, String siteUrl, LocalDate date) {
        StringBuilder text = new StringBuilder();
        text.append("오늘의 핫이슈\n\n");
        appendAll(text, hot, siteUrl, date);
        text.append("IT · 취업\n\n");
        appendAll(text, career, siteUrl, date);
        return text.toString();
    }

    // 소유자 전용 뉴스 스크랩 화면 주소: 기사 정보와 질문을 채워 둠 (로그인은 화면에서 확인)
    static String clipLink(String siteUrl, NewsArticle article, LocalDate date) {
        return UriComponentsBuilder.fromUriString(siteUrl)
                .path("/clips/new")
                .queryParam("title", article.title())
                .queryParam("url", article.link())
                .queryParam("source", article.source())
                .queryParam("date", date.toString())
                .encode()
                .build()
                .toUriString();
    }

    private static void appendAll(StringBuilder text, List<Selected> items, String siteUrl,
            LocalDate date) {
        if (items.isEmpty()) {
            text.append("오늘은 기사를 가져오지 못했어요\n\n");
            return;
        }
        for (Selected item : items) {
            NewsArticle article = item.article();
            text.append("- ").append(article.title());
            if (!article.source().isEmpty()) {
                text.append(" (").append(article.source()).append(')');
            }
            text.append('\n');
            if (item.intro() != null && !item.intro().isBlank()) {
                text.append("  ").append(item.intro().strip()).append('\n');
            }
            text.append("  ").append(article.link()).append('\n');
            text.append("  코멘트 쓰기: ").append(clipLink(siteUrl, article, date)).append("\n\n");
        }
    }

    record Selected(NewsArticle article, String intro) {
    }
}
