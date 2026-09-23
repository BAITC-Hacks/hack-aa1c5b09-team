package kz.needboard.needs.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import kz.needboard.needs.NeedStatus;

public record NeedView(UUID id, UUID ownerId,
        @JsonInclude(JsonInclude.Include.NON_NULL) String originalDescription,
        NeedCardDraft card, NeedStatus status, Instant createdAt,
        UUID selectedProposalId, List<String> missingFields) {}
