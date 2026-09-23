package kz.needboard.proposals;

import jakarta.validation.Valid;
import java.util.UUID;
import kz.needboard.common.PageResponse;
import kz.needboard.identity.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProposalController {
    private final ProposalService proposals;
    private final CurrentUser user;

    public ProposalController(ProposalService proposals, CurrentUser user) {
        this.proposals = proposals;
        this.user = user;
    }

    @PostMapping("/api/needs/{id}/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    public ProposalView create(@PathVariable UUID id, @Valid @RequestBody ProposalRequest request) {
        return proposals.create(id, user.id(), request);
    }

    @GetMapping("/api/needs/{id}/proposals")
    public PageResponse<ProposalView> forNeed(@PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return proposals.forNeed(id, user.id(), page, size);
    }

    @GetMapping("/api/me/proposals")
    public PageResponse<ProposalView> mine(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return proposals.mine(user.id(), page, size);
    }

    @PostMapping("/api/proposals/{id}/accept")
    public ProposalView accept(@PathVariable UUID id) { return proposals.accept(id, user.id()); }
}
