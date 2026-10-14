package com.zoolog.category;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByName(String name);

    boolean existsBySlug(String slug);

    Optional<Category> findBySlug(String slug);
}