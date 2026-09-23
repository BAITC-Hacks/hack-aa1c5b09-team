package kz.needboard.needs.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.PositiveOrZero;

public record NeedWriteRequest(
        @Size(max = 10000) String originalDescription,
        @Valid @NotNull NeedCardDraft card,
        @PositiveOrZero Long revision) {}
