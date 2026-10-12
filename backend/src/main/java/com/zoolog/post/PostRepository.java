package com.zoolog.post;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("select p from Post p join fetch p.category order by p.createdAt desc, p.id desc")
    List<Post> findAllWithCategory();

    @Query("select p from Post p join fetch p.category c where c.slug = :slug order by p.createdAt desc, p.id desc")
    List<Post> findAllWithCategoryBySlug(String slug);

    @Query("select p from Post p join fetch p.category where p.id = :id")
    Optional<Post> findWithCategoryById(Long id);
  }