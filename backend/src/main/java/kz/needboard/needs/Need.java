package kz.needboard.needs;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import kz.needboard.needs.api.NeedCardDraft;

@Entity
@Table(name = "needs")
public class Need {
    @Id private UUID id;
    @Column(nullable = false) private UUID ownerId;
    @Column(columnDefinition = "text") private String originalDescription;
    @Column(length = 200) private String title;
    @Column(columnDefinition = "text") private String problem;
    @Column(columnDefinition = "text") private String expectedResult;
    @ElementCollection
    @CollectionTable(name = "need_acceptance_criteria", joinColumns = @JoinColumn(name = "need_id"))
    @OrderColumn(name = "position")
    @Column(name = "criterion", nullable = false, length = 500)
    private List<String> acceptanceCriteria = new ArrayList<>();
    @Column(name = "constraints_text", columnDefinition = "text") private String constraints;
    @Column(precision = 14, scale = 2) private BigDecimal budgetAmount;
    @Column(length = 3) private String currency;
    private LocalDate deadline;
    @Column(length = 250) private String category;
    @Column(length = 250) private String budgetText;
    @Column(length = 250) private String deadlineText;
    @Column(length = 250) private String workFormat;
    @Column(length = 250) private String location;
    @Column(columnDefinition = "text") private String requirements;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30) private NeedStatus status;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    private UUID selectedProposalId;
    @Version private long version;

    protected Need() {}

    Need(UUID ownerId, String originalDescription, NeedCardDraft card) {
        id = UUID.randomUUID();
        this.ownerId = ownerId;
        status = NeedStatus.DRAFT;
        createdAt = Instant.now();
        updatedAt = createdAt;
        update(originalDescription, card);
    }

    void update(String originalDescription, NeedCardDraft card) {
        this.originalDescription = originalDescription;
        title = card.title();
        problem = card.problem();
        expectedResult = card.expectedResult();
        acceptanceCriteria.clear();
        acceptanceCriteria.addAll(card.acceptanceCriteria());
        constraints = card.constraints();
        budgetAmount = card.budgetAmount();
        currency = card.currency();
        deadline = card.deadline();
        category = card.category();
        budgetText = card.budgetText();
        deadlineText = card.deadlineText();
        workFormat = card.workFormat();
        location = card.location();
        requirements = card.requirements();
        updatedAt = Instant.now();
    }

    NeedCardDraft card() {
        return new NeedCardDraft(title, problem, expectedResult, acceptanceCriteria,
                constraints, budgetAmount, currency, deadline, category, budgetText, deadlineText,
                workFormat, location, requirements);
    }

    void publish() { status = NeedStatus.PUBLISHED; updatedAt = Instant.now(); }
    void select(UUID proposalId) {
        selectedProposalId = proposalId;
        status = NeedStatus.SOLUTION_SELECTED;
        updatedAt = Instant.now();
    }
    UUID id() { return id; }
    UUID ownerId() { return ownerId; }
    String originalDescription() { return originalDescription; }
    NeedStatus status() { return status; }
    Instant createdAt() { return createdAt; }
    Instant updatedAt() { return updatedAt; }
    UUID selectedProposalId() { return selectedProposalId; }
}
