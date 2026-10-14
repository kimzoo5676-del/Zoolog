package com.zoolog.news;

import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsDigestLogRepository extends JpaRepository<NewsDigestLog, Long> {

    boolean existsBySentOn(LocalDate sentOn);
}
