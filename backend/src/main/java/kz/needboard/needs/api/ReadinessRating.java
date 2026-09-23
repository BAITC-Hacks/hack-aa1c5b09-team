package kz.needboard.needs.api;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

public record ReadinessRating(int score, int maxScore, Level level, int catalogPriority,
                              List<CriterionResult> criteria) {
    public enum Level {
        NEEDS_CLARIFICATION, WORKABLE, READY, PRIORITY;

        public static Level forScore(int score) {
            if (score < 0 || score > 100) throw new IllegalArgumentException("Score must be between 0 and 100");
            return score >= 90 ? PRIORITY : score >= 70 ? READY : score >= 40 ? WORKABLE : NEEDS_CLARIFICATION;
        }
    }

    public static ReadinessRating calculate(NeedCardDraft card, Set<ReadinessCriterion> confirmations) {
        var criteria = Arrays.stream(ReadinessCriterion.values()).map(criterion -> {
            boolean filled = criterion.filled(card);
            boolean confirmed = filled && confirmations.contains(criterion);
            return new CriterionResult(criterion, criterion.label, criterion.description, criterion.weight,
                    filled, confirmed, confirmed ? criterion.weight : 0);
        }).toList();
        int score = criteria.stream().mapToInt(CriterionResult::points).sum();
        return new ReadinessRating(score, 100, Level.forScore(score), score >= 90 ? 2 : score >= 70 ? 1 : 0, criteria);
    }

    public record CriterionResult(ReadinessCriterion criterion, String label, String description,
                                  int weight, boolean filled, boolean confirmed, int points) {}
}
