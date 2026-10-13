package com.zoolog.image;

import com.zoolog.post.Post;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {

    Optional<PostImage> findByObjectKey(String objectKey);

    List<PostImage> findAllByObjectKeyIn(Collection<String> objectKeys);

    List<PostImage> findAllByPost(Post post);

    // 글과 연결되지 않은 채 기준 시각 전부터 바뀌지 않은 이미지 (정리 대상)
    List<PostImage> findAllByPostIsNullAndUpdatedAtBefore(Instant cutoff);
}
