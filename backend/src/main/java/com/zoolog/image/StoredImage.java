package com.zoolog.image;

import java.io.InputStream;

public record StoredImage(String contentType, InputStream body) {
}
