package com.zoolog.news;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

// Claude 없이 IT·취업 기사 고르기 (2026-10-13 소유자 결정: API 별도 결제 대신 무료 규칙)
// 주가·광고성 기사는 빼고, 채용(가장 높게)·클라우드 같은 단어와 IT 대기업 이름이 많이 나온 기사를 우선, 비슷한 제목은 하나만
final class NewsRanker {

    // 제목에 있으면 제외: 주가 등락·증시·광고성 기사
    private static final List<String> EXCLUDE = List.of(
            "주가", "특징주", "급등", "급락", "상한가", "하한가", "목표가", "목표주가", "코스피", "코스닥", "증시", "시황",
            "매수", "매도", "52주", "광고", "이벤트", "할인", "프로모션", "경품", "부고", "인사]", "[인사");
    // 채용 소식 (제목 3점, 요약 1점): 취업 준비생에게 가장 직접적인 기사
    private static final List<String> HIRING = List.of("채용", "공채", "신입", "인턴");
    // 취업 준비에 쓸 만한 주제 (제목 2점, 요약 1점)
    private static final List<String> TOPICS = List.of(
            "개발자", "엔지니어", "클라우드", "AWS", "Azure", "데이터센터", "인프라", "AI",
            "인공지능", "반도체", "보안", "SW", "소프트웨어", "플랫폼", "투자", "인수", "신사업", "출범", "오픈소스");
    // 국내외 IT 대기업 (제목·요약 1점)
    private static final List<String> COMPANIES = List.of(
            "삼성", "SK", "네이버", "카카오", "LG", "쿠팡", "토스", "배민", "우아한형제들", "라인", "KT", "아마존",
            "마이크로소프트", "MS", "구글", "엔비디아", "애플", "메타", "오픈AI", "OpenAI");
    // 제목 낱말이 이만큼 겹치면 같은 사건으로 봄
    private static final double SIMILAR = 0.5;

    private NewsRanker() {
    }

    // 점수 높은 순(같으면 목록 앞쪽 = 최신), 비슷한 제목은 건너뜀
    static List<NewsArticle> top(List<NewsArticle> candidates, int count) {
        List<Integer> order = IntStream.range(0, candidates.size())
                .filter((i) -> !excluded(candidates.get(i)))
                .boxed()
                .sorted(Comparator.comparingInt((Integer i) -> -score(candidates.get(i))).thenComparingInt((i) -> i))
                .toList();
        List<NewsArticle> picked = new ArrayList<>();
        for (int i : order) {
            NewsArticle article = candidates.get(i);
            if (picked.stream().noneMatch((p) -> similar(p.title(), article.title()))) {
                picked.add(article);
            }
            if (picked.size() == count) {
                break;
            }
        }
        return picked;
    }

    static boolean excluded(NewsArticle article) {
        return EXCLUDE.stream().anyMatch(article.title()::contains);
    }

    static int score(NewsArticle article) {
        int score = 0;
        for (String word : HIRING) {
            score += article.title().contains(word) ? 3 : article.summary().contains(word) ? 1 : 0;
        }
        for (String word : TOPICS) {
            score += article.title().contains(word) ? 2 : article.summary().contains(word) ? 1 : 0;
        }
        for (String word : COMPANIES) {
            score += article.title().contains(word) || article.summary().contains(word) ? 1 : 0;
        }
        return score;
    }

    static boolean similar(String a, String b) {
        Set<String> wordsA = words(a);
        Set<String> wordsB = words(b);
        if (wordsA.isEmpty() || wordsB.isEmpty()) {
            return false;
        }
        Set<String> common = new HashSet<>(wordsA);
        common.retainAll(wordsB);
        return (double) common.size() / Math.min(wordsA.size(), wordsB.size()) >= SIMILAR;
    }

    private static Set<String> words(String title) {
        Set<String> words = new HashSet<>(Arrays.asList(title.replaceAll("[^\\p{L}\\p{N} ]", " ").split("\\s+")));
        words.removeIf((word) -> word.length() < 2);
        return words;
    }
}
