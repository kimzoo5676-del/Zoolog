package com.zoolog.image;

import com.zoolog.post.Post;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {

    Optional<PostImage> findByObjectKey(String objectKey);

    List<PostImage> findAllByObjectKeyIn(Collection<String> objectKeys);

    List<PostImage> findAllByPost(Post post);
}
