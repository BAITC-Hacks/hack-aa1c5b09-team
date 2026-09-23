package kz.needboard.proposals;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "proposals")
public class Proposal {
    @Id private UUID id;
    @Column(nullable = false) private UUID needId;
    @Column(nullable = false) private UUID authorId;
    @Column(nullable = false, columnDefinition = "text") private String solutionDescription;
    @Column(nullable = false, columnDefinition = "text") private String implementationPlan;
    @Column(nullable = false, columnDefinition = "text") private String expectedResult;
    @Column(precision = 14, scale = 2) private BigDecimal priceAmount;
    @Column(length = 3) private String currency;
    @Column(columnDefinition = "text") private String priceNote;
    private Integer durationDays;
    @Column(columnDefinition = "text") private String scheduleNote;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20) private ProposalStatus status;
    @Column(nullable = false) private Instant createdAt;

    protected Proposal() {}

    Proposal(UUID needId, UUID authorId, ProposalRequest request) {
        id = UUID.randomUUID();
        this.needId = needId;
        this.authorId = authorId;
        solutionDescription = request.solutionDescription().strip();
        implementationPlan = request.implementationPlan().strip();
        expectedResult = request.expectedResult().strip();
        priceAmount = request.priceAmount();
        currency = request.currency();
        priceNote = request.priceNote();
        durationDays = request.durationDays();
        scheduleNote = request.scheduleNote();
        status = ProposalStatus.PENDING;
        createdAt = Instant.now();
    }

    UUID id() { return id; }
    UUID needId() { return needId; }
    ProposalStatus status() { return status; }
    void accept() { status = ProposalStatus.ACCEPTED; }

    ProposalView view() {
        return new ProposalView(id, needId, authorId, solutionDescription, implementationPlan, expectedResult,
                priceAmount, currency, priceNote, durationDays, scheduleNote, status, createdAt);
    }
}
