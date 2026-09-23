package kz.needboard.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByProposalIdOrderByCreatedAtAscIdAsc(UUID proposalId);
    Optional<ChatMessage> findByProposalIdAndSenderIdAndClientId(UUID proposalId, UUID senderId, UUID clientId);
}
