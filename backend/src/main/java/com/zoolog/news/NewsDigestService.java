package com.zoolog.news;

import com.zoolog.notification.OwnerMailer;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// 매일 아침 기사 메일: 후보 모으기 → Claude 선정 → 소유자에게 발송
// 한 단계가 실패해도 가능한 만큼 보냄 (Claude 실패 시 목록 앞쪽 기사, 요약이 있으면 그 문장을 소개로)
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

    public NewsDigestService(GoogleNewsClient googleNews, NaverNewsClient naverNews, NewsCurator curator,
            OwnerMailer mailer, NewsProperties properties, Clock clock) {
        this.googleNews = googleNews;
        this.naverNews = naverNews;
        this.curator = curator;
        this.mailer = mailer;
        this.properties = properties;
        this.clock = clock;
    }

    public void sendDailyDigest() {
        List<NewsArticle> hot = fetchHot();
        List<NewsArticle> career = fetchCareer();
        List<Selected> hotPicks = new ArrayList<>();
        List<Selected> careerPicks = new ArrayList<>();
        curator.pick(hot, career).ifPresentOrElse((picks) -> {
            hotPicks.add(new Selected(hot.get(picks.hotIssue().index()), picks.hotIssue().intro()));
            picks.careerNews().forEach((pick) -> careerPicks.add(new Selected(career.get(pick.index()), pick.intro())));
        }, () -> {
            hot.stream().limit(1).forEach((article) -> hotPicks.add(new Selected(article, article.summary())));
            career.stream().limit(2).forEach((article) -> careerPicks.add(new Selected(article, article.summary())));
        });
        LocalDate today = LocalDate.now(clock);
        mailer.send(today.getMonthValue() + "월 " + today.getDayOfMonth() + "일 아침 기사", format(hotPicks, careerPicks));
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

    static String format(List<Selected> hot, List<Selected> career) {
        StringBuilder text = new StringBuilder();
        text.append("오늘의 핫이슈\n\n");
        appendAll(text, hot);
        text.append("IT · 취업\n\n");
        appendAll(text, career);
        return text.toString();
    }

    private static void appendAll(StringBuilder text, List<Selected> items) {
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
            text.append("  ").append(article.link()).append("\n\n");
        }
    }

    record Selected(NewsArticle article, String intro) {
    }
}
