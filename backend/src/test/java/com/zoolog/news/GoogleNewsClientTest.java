package com.zoolog.news;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GoogleNewsClientTest {

    private static final String RSS = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0"><channel>
              <item>
                <title>행정수도 세종 2031년 완성 - 한겨레</title>
                <link>https://news.google.com/rss/articles/abc?oc=5</link>
                <description>&lt;ol&gt;&lt;li&gt;링크 목록&lt;/li&gt;&lt;/ol&gt;</description>
                <source url="https://www.hani.co.kr">한겨레</source>
              </item>
              <item>
                <title>쌀쌀한 가을 아침 - KBS 뉴스</title>
                <link>https://news.google.com/rss/articles/def?oc=5</link>
                <source url="https://news.kbs.co.kr">KBS 뉴스</source>
              </item>
            </channel></rss>
            """;

    @Test
    @DisplayName("주요 기사 RSS에서 제목 끝의 언론사를 떼어 내고 정해진 개수만 읽는다")
    void parseTopStories() {
        var articles = GoogleNewsClient.parse(RSS.getBytes(StandardCharsets.UTF_8), 1);

        assertThat(articles).containsExactly(new NewsArticle(
                "행정수도 세종 2031년 완성", "한겨레", "https://news.google.com/rss/articles/abc?oc=5", ""));
    }

    @Test
    @DisplayName("DOCTYPE이 들어 있는 XML은 외부 엔티티 공격을 막기 위해 거절한다")
    void rejectDoctype() {
        String xml = """
                <?xml version="1.0"?>
                <!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
                <rss><channel><item><title>&xxe;</title></item></channel></rss>
                """;

        assertThatThrownBy(() -> GoogleNewsClient.parse(xml.getBytes(StandardCharsets.UTF_8), 5))
                .isInstanceOf(IllegalStateException.class);
    }
}
