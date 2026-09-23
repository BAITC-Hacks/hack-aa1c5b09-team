package kz.needboard.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import kz.needboard.identity.CurrentUser;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requests/{requestId}/offers/{offerId}/messages")
public class ChatController {
    private final ChatService chats;
    private final CurrentUser user;

    public ChatController(ChatService chats, CurrentUser user) {
        this.chats = chats;
        this.user = user;
    }

    @GetMapping
    public List<ChatMessageView> list(@PathVariable UUID requestId, @PathVariable UUID offerId) {
        return chats.list(requestId, offerId, user.id());
    }

    @PostMapping
    public List<ChatMessageView> send(@PathVariable UUID requestId, @PathVariable UUID offerId,
            @Valid @RequestBody SendMessage request) {
        return chats.send(requestId, offerId, user.id(), request.clientId(), request.text());
    }

    public record SendMessage(@NotBlank @Size(max = 4000) String text, @NotNull UUID clientId) {}
}
