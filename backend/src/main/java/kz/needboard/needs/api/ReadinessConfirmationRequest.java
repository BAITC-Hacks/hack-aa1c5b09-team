package kz.needboard.needs.api;

import jakarta.validation.constraints.*;
import java.util.Set;

/** Replaces the confirmed set for the exact reviewed card revision. Empty set revokes all confirmations. */
public record ReadinessConfirmationRequest(@NotNull @PositiveOrZero Long revision,
        @NotNull Set<@NotNull ReadinessCriterion> confirmedCriteria) {}
