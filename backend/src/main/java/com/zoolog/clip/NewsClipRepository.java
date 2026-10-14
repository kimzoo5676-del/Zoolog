package com.zoolog.clip;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsClipRepository extends JpaRepository<NewsClip, Long> {

    Optional<NewsClip> findByUrl(String url);
}
