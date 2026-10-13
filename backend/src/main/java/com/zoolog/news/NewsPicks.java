package com.zoolog.news;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

// Claude가 고른 기사: 후보 목록의 번호 + 한 줄 소개. 제목·주소는 번호로 원래 후보에서 꺼내 쓰므로 지어낸 링크가 들어갈 수 없음
public record NewsPicks(
        @JsonPropertyDescription("핫이슈 후보 목록에서 고른 기사 1개") Pick hotIssue,
        @JsonPropertyDescription("IT·취업 후보 목록에서 고른 기사 2개") List<Pick> careerNews) {

    public record Pick(
            @JsonPropertyDescription("해당 후보 목록의 번호 (대괄호 안 숫자)") int index,
            @JsonPropertyDescription("기사를 읽고 싶게 만드는 한국어 소개 한 문장. 제목과 요약에 있는 내용만") String intro) {
    }
}
