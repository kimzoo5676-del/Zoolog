package com.zoolog.news;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NewsProperties.class)
public class NewsConfig {
}
