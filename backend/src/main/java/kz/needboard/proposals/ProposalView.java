package kz.needboard.proposals;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProposalView(UUID id, UUID needId, UUID authorId,
        String solutionDescription, String implementationPlan, String expectedResult,
        BigDecimal priceAmount, String currency, String priceNote,
        Integer durationDays, String scheduleNote, ProposalStatus status, Instant createdAt) {}
