package com.zoolog.image;

import com.zoolog.post.Post;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {

    Optional<PostImage> findByObjectKey(String objectKey);

    List<PostImage> findAllByObjectKeyIn(Collection<String> objectKeys);

    // 이 글에 연결된 이미지
    @Query("select i from PostImage i join i.posts p where p = :post")
    List<PostImage> findAllLinkedTo(@Param("post") Post post);

    // 연결된 글 없이 기준 시각 전부터 남아 있는 이미지 (정리 대상)
    List<PostImage> findAllByUnusedSinceBefore(Instant cutoff);
}
