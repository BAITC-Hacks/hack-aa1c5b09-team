package kz.needboard.chat;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
class ChatMessage {
    @Id private UUID id;
    @Column(nullable = false) private UUID proposalId;
    @Column(nullable = false) private UUID senderId;
    @Column(nullable = false, length = 20) private String senderRole;
    @Column(nullable = false) private UUID clientId;
    @Column(name = "message_text", nullable = false, columnDefinition = "text") private String text;
    @Column(nullable = false) private Instant createdAt;

    protected ChatMessage() {}

    ChatMessage(UUID proposalId, UUID senderId, String senderRole, UUID clientId, String text) {
        this.id = UUID.randomUUID();
        this.proposalId = proposalId;
        this.senderId = senderId;
        this.senderRole = senderRole;
        this.clientId = clientId;
        this.text = text.strip();
        this.createdAt = Instant.now();
    }

    ChatMessageView view() {
        return new ChatMessageView(id, clientId, proposalId, senderRole, text, createdAt);
    }
}
