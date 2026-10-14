package com.zoolog.image;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.util.HexFormat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// 테스트 트랜잭션 없이 실제 커밋·롤백을 확인 (ImageApiTest는 테스트 트랜잭션이라 항상 롤백)
@SpringBootTest
@AutoConfigureMockMvc
class ImageUploadRollbackTest {

    // PNG 파일 서명 8바이트
    private static final byte[] PNG = HexFormat.of().parseHex("89504e470d0a1a0a0000");

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ImageStorage storage;

    @Test
    @DisplayName("저장소 업로드가 실패해 트랜잭션이 롤백되면 올린 파일을 지운다")
    void deleteFileOnRollback() throws Exception {
        willThrow(new IllegalStateException("저장소 오류")).given(storage).put(any(), any(), any());

        try {
            mockMvc.perform(multipart("/api/images")
                    .file(new MockMultipartFile("file", "a.png", "image/png", PNG))
                    .with(oidcLogin()).with(csrf()));
        } catch (Exception e) {
            // 처리되지 않은 예외는 MockMvc가 그대로 던짐 (실제 서버에서는 500)
        }

        verify(storage).delete(startsWith("images/"));
    }
}
