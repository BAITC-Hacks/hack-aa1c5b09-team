package kz.needboard;

import kz.needboard.needs.api.*;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;

class ReadinessRatingTests {
    @ParameterizedTest
    @CsvSource({"0,NEEDS_CLARIFICATION", "39,NEEDS_CLARIFICATION", "40,WORKABLE", "69,WORKABLE",
            "70,READY", "89,READY", "90,PRIORITY", "100,PRIORITY"})
    void readinessBoundaries(int score, ReadinessRating.Level level) {
        assertThat(ReadinessRating.Level.forScore(score)).isEqualTo(level);
    }

    @Test
    void eachConfirmedCriterionHasItsOwnWeightAndAllWeightsTotalOneHundred() {
        var card = new NeedCardDraft("title", "context", "result", List.of("measurable acceptance"),
                "constraints", null, null, null, null, null, null, null, null, null,
                "data", "users", "contact", "consultations", "feedback");
        int[] weights = {20, 20, 15, 15, 10, 10, 10};
        for (var criterion : ReadinessCriterion.values()) {
            assertThat(ReadinessRating.calculate(card, Set.of(criterion)).score()).isEqualTo(weights[criterion.ordinal()]);
        }
        assertThat(ReadinessRating.calculate(card, Set.of()).score()).isZero();
        assertThat(ReadinessRating.calculate(card, EnumSet.allOf(ReadinessCriterion.class)).score()).isEqualTo(100);
    }

    @Test
    void blankFieldsAndPartialBusinessContactDoNotScoreWhileDeadlineAloneDefinesAConstraint() {
        var card = new NeedCardDraft(null, "  ", null, List.of(), null, null, null,
                LocalDate.of(2027, 1, 1), null, null, null, null, null, null,
                null, null, "contact", "video", null);
        var rating = ReadinessRating.calculate(card, EnumSet.allOf(ReadinessCriterion.class));
        assertThat(rating.score()).isEqualTo(10);
        assertThat(rating.criteria().stream().filter(ReadinessRating.CriterionResult::confirmed)
                .map(ReadinessRating.CriterionResult::criterion)).containsExactly(ReadinessCriterion.CONSTRAINTS);
    }
}
