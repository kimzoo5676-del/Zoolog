package com.zoolog.clip;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import com.zoolog.category.CategoryService;
import com.zoolog.post.PostDetailResponse;
import com.zoolog.post.PostRequest;
import com.zoolog.post.PostService;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// 뉴스 스크랩 글 게시 (2026-10-14 소유자 결정)
// 주제: News Clipping > 달(2026.10) > 주(2026.10 Week 2), 없으면 만듦. 주제 이름은 사이트 전체에서 겹치면 안 되어 주 이름에도 연월
// 글: 제목 "10.14 기사 제목", 본문은 기사 제목 링크 + 언론사 + 코멘트만 (기사 본문 복제 금지, 저작권)
@Service
@Transactional(readOnly = true)
public class ClipService {

    static final String TOP_NAME = "News Clipping";
    private static final int TITLE_MAX = 200;
    // 월요일 시작, 1일이 들어 있는 주가 Week 1 (Streak 달력과 같은 기준)
    private static final WeekFields WEEK = WeekFields.of(DayOfWeek.MONDAY, 1);

    private final CategoryRepository categoryRepository;
    private final PostService postService;

    public ClipService(CategoryRepository categoryRepository, PostService postService) {
        this.categoryRepository = categoryRepository;
        this.postService = postService;
    }

    @Transactional
    public PostDetailResponse create(ClipRequest request) {
        URI url = articleUrl(request.url());
        Category top = findOrCreate(TOP_NAME, null);
        Category month = findOrCreate(monthName(request.date()), top);
        Category week = findOrCreate(weekName(request.date()), month);
        return postService.create(new PostRequest(week.getId(), title(request), content(request, url)));
    }

    static String monthName(LocalDate date) {
        return "%d.%02d".formatted(date.getYear(), date.getMonthValue());
    }

    static String weekName(LocalDate date) {
        return monthName(date) + " Week " + date.get(WEEK.weekOfMonth());
    }

    static String title(ClipRequest request) {
        String title = request.date().getMonthValue() + "." + request.date().getDayOfMonth() + " " + request.title().strip();
        return title.length() <= TITLE_MAX ? title : title.substring(0, TITLE_MAX - 1) + "…";
    }

    // [기사 제목](<주소>) · 언론사 + 빈 줄 + 코멘트. 꺾쇠로 감싼 주소는 괄호가 들어 있어도 링크가 끊기지 않음 (CommonMark)
    static String content(ClipRequest request, URI url) {
        String link = "[" + request.title().strip().replaceAll("([\\\\\\[\\]])", "\\\\$1") + "](<" + url + ">)";
        String source = request.source() == null || request.source().isBlank() ? "" : " · " + request.source().strip();
        return link + source + "\n\n" + request.comment().strip() + "\n";
    }

    // http·https 기사 주소만 (javascript: 같은 주소가 글 링크로 들어가지 않도록)
    private static URI articleUrl(String value) {
        try {
            URI uri = new URI(value.strip());
            if (("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) && uri.getHost() != null) {
                return uri;
            }
        } catch (URISyntaxException e) {
            // 아래에서 400
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기사 주소를 확인해 주세요");
    }

    // 같은 이름(slug)의 주제가 다른 자리에 이미 있으면 409: 엉뚱한 주제 아래에 글이 쌓이지 않도록
    private Category findOrCreate(String name, Category parent) {
        String slug = CategoryService.toSlug(name);
        return categoryRepository.findBySlug(slug)
                .map((found) -> {
                    Long foundParent = found.getParent() == null ? null : found.getParent().getId();
                    Long expected = parent == null ? null : parent.getId();
                    if (!Objects.equals(foundParent, expected)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "'" + name + "' 주제가 다른 자리에 이미 있어요");
                    }
                    return found;
                })
                .orElseGet(() -> categoryRepository.save(new Category(name, slug, parent)));
    }
}
