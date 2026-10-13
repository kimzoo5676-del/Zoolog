package com.zoolog.news;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

// Google 뉴스 한국판 주요 기사 RSS: Google이 중요도로 정렬한 순서라 "오늘의 핫이슈" 후보로 사용 (API 키 불필요)
@Component
public class GoogleNewsClient {

    static final String TOP_STORIES = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

    private final RestClient restClient = HttpClients.withTimeouts();

    public List<NewsArticle> topStories(int limit) {
        byte[] xml = restClient.get().uri(TOP_STORIES).retrieve().body(byte[].class);
        return parse(xml == null ? new byte[0] : xml, limit);
    }

    // 제목은 "기사 제목 - 언론사" 형식이라 언론사 부분을 떼어 냄. description은 같은 제목의 링크 목록이라 쓰지 않음
    static List<NewsArticle> parse(byte[] xml, int limit) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            // 외부 엔티티(XXE) 차단: 외부에서 받은 XML이 서버 파일이나 내부 주소를 읽지 못하도록
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            NodeList items = factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml)).getElementsByTagName("item");
            List<NewsArticle> articles = new ArrayList<>();
            for (int i = 0; i < items.getLength() && articles.size() < limit; i++) {
                Element item = (Element) items.item(i);
                String source = text(item, "source");
                String title = text(item, "title");
                if (!source.isEmpty() && title.endsWith(" - " + source)) {
                    title = title.substring(0, title.length() - source.length() - 3);
                }
                articles.add(new NewsArticle(title, source, text(item, "link"), ""));
            }
            return articles;
        } catch (Exception e) {
            throw new IllegalStateException("Google 뉴스 RSS를 읽지 못함", e);
        }
    }

    private static String text(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        return nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent().strip();
    }
}
