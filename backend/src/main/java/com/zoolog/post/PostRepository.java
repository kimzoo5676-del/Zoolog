package com.zoolog.post;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("select p from Post p join fetch p.category order by p.createdAt desc, p.id desc")
    List<Post> findAllWithCategory();

    // 상위 주제 slug면 하위·그 아래(3단계) 주제 글까지 함께 조회
    @Query("select p from Post p join fetch p.category c left join c.parent pc left join pc.parent ppc"
            + " where c.slug = :slug or pc.slug = :slug or ppc.slug = :slug order by p.createdAt desc, p.id desc")
    List<Post> findAllWithCategoryBySlug(String slug);

    @Query("select p from Post p join fetch p.category where p.id = :id")
    Optional<Post> findWithCategoryById(Long id);
}