package com.zoolog.news;

// 기사 후보 한 건. summary는 기사 앞부분 문장(네이버) 또는 빈 문자열(Google 뉴스)
public record NewsArticle(String title, String source, String link, String summary) {
}
