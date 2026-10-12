package com.zoolog.category;

import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    static final int MAX_DEPTH = 3;

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryResponse> findAll() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    // 이름, slug 중복은 409 Conflict (DB UNIQUE 제약 위반 전에 확인해 이유를 구분)
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().strip();
        String slug = toSlug(name);
        if (slug.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "주제 이름에 글자나 숫자를 넣어 주세요");
        }
        if (categoryRepository.existsByName(name) || categoryRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 있는 주제예요");
        }
        Category parent = (request.parentId() == null) ? null : getParent(request.parentId());
        return CategoryResponse.from(categoryRepository.save(new Category(name, slug, parent)));
    }

    // 3단계까지만 (예: Cloud Engineer > AWS-SAA > 컴퓨팅): 3단계 주제 아래에는 만들 수 없음
    private Category getParent(Long parentId) {
        Category parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "상위 주제를 찾을 수 없어요"));
        if (depthOf(parent) >= MAX_DEPTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "주제는 3단계까지만 만들 수 있어요");
        }
        return parent;
    }

    private static int depthOf(Category category) {
        int depth = 1;
        for (Category c = category.getParent(); c != null; c = c.getParent()) {
            depth++;
        }
        return depth;
    }

    // 주소용 이름(slug): 소문자로 바꾸고 글자·숫자(한글 포함)가 아닌 문자 묶음은 하이픈 하나로 (예: "AWS SAA" → "aws-saa")
    static String toSlug(String name) {
        return name.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", "-")
                .replaceAll("^-|-$", "");
    }
}
