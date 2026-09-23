package kz.needboard.needs;

import jakarta.validation.Valid;
import java.util.UUID;
import kz.needboard.common.PageResponse;
import kz.needboard.identity.CurrentUser;
import kz.needboard.needs.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class NeedController {
    private final NeedService needs;
    private final CurrentUser user;

    public NeedController(NeedService needs, CurrentUser user) {
        this.needs = needs;
        this.user = user;
    }

    @PostMapping("/api/needs")
    @ResponseStatus(HttpStatus.CREATED)
    public NeedView create(@Valid @RequestBody NeedWriteRequest request) {
        return needs.create(user.id(), request);
    }

    @PutMapping("/api/needs/{id}")
    public NeedView update(@PathVariable UUID id, @Valid @RequestBody NeedWriteRequest request) {
        return needs.update(id, user.id(), request);
    }

    @PostMapping("/api/needs/{id}/publish")
    public NeedView publish(@PathVariable UUID id) { return needs.publish(id, user.id()); }

    @PutMapping("/api/needs/{id}/readiness-confirmations")
    public NeedView confirmReadiness(@PathVariable UUID id, @Valid @RequestBody ReadinessConfirmationRequest request) {
        return needs.confirmReadiness(id, user.id(), request);
    }

    @GetMapping("/api/needs")
    public PageResponse<NeedView> catalog(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return needs.catalog(page, size);
    }

    @GetMapping("/api/needs/{id}")
    public NeedView get(@PathVariable UUID id) { return needs.get(id, user.idOrNull()); }

    @GetMapping("/api/me/needs")
    public PageResponse<NeedView> mine(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return needs.mine(user.id(), page, size);
    }
}
