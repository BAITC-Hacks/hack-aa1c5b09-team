package kz.needboard.chat;

import java.util.List;
import java.util.UUID;
import kz.needboard.common.ApiException;
import kz.needboard.needs.NeedService;
import kz.needboard.needs.NeedStatus;
import kz.needboard.proposals.ProposalService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ChatService {
    private final ChatMessageRepository messages;
    private final NeedService needs;
    private final ProposalService proposals;

    public ChatService(ChatMessageRepository messages, NeedService needs, ProposalService proposals) {
        this.messages = messages;
        this.needs = needs;
        this.proposals = proposals;
    }

    public List<ChatMessageView> list(UUID requestId, UUID offerId, UUID actor) {
        access(requestId, offerId, actor);
        return views(offerId);
    }

    @Transactional
    public List<ChatMessageView> send(UUID requestId, UUID offerId, UUID actor,
            UUID clientId, String text) {
        var access = access(requestId, offerId, actor);
        if (access.need().status() == NeedStatus.SOLUTION_SELECTED
                && !offerId.equals(access.need().selectedProposalId())) {
            throw ApiException.conflict("CHAT_READ_ONLY", "Этот чат доступен только для чтения.");
        }
        if (messages.findByProposalIdAndSenderIdAndClientId(offerId, actor, clientId).isEmpty()) {
            var role = access.need().ownerId().equals(actor) ? "consumer" : "provider";
            messages.saveAndFlush(new ChatMessage(offerId, actor, role, clientId, text));
        }
        return views(offerId);
    }

    private Access access(UUID requestId, UUID offerId, UUID actor) {
        var need = needs.chatAccess(requestId);
        var proposal = proposals.access(offerId);
        if (!proposal.needId().equals(requestId)
                || (!need.ownerId().equals(actor) && !proposal.authorId().equals(actor))) {
            throw ApiException.notFound();
        }
        return new Access(need, proposal);
    }

    private List<ChatMessageView> views(UUID offerId) {
        return messages.findByProposalIdOrderByCreatedAtAscIdAsc(offerId).stream()
                .map(ChatMessage::view).toList();
    }

    private record Access(NeedService.NeedChatAccess need, ProposalService.ProposalAccess proposal) {}
}
