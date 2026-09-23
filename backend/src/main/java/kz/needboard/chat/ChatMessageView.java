package kz.needboard.chat;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageView(UUID id, UUID clientId, UUID offerId, String sender,
        String text, Instant createdAt) {}
