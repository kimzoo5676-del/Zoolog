package com.zoolog.image;

import java.util.Arrays;
import java.util.Optional;

// 허용하는 이미지 형식: 파일 이름·Content-Type은 바꿔 보낼 수 있으므로 파일 앞부분 서명(magic bytes)으로 판별
enum ImageType {
    JPEG("image/jpeg", "jpg", new int[] {0xFF, 0xD8, 0xFF}),
    PNG("image/png", "png", new int[] {0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}),
    GIF("image/gif", "gif", new int[] {'G', 'I', 'F', '8'}),
    // WebP: "RIFF" + 4바이트 크기 + "WEBP"
    WEBP("image/webp", "webp", new int[] {'R', 'I', 'F', 'F', -1, -1, -1, -1, 'W', 'E', 'B', 'P'});

    final String contentType;
    final String extension;
    private final int[] signature; // -1은 아무 값

    ImageType(String contentType, String extension, int[] signature) {
        this.contentType = contentType;
        this.extension = extension;
        this.signature = signature;
    }

    static Optional<ImageType> detect(byte[] head) {
        return Arrays.stream(values()).filter((type) -> type.matches(head)).findFirst();
    }

    private boolean matches(byte[] head) {
        if (head.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (signature[i] != -1 && (head[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
