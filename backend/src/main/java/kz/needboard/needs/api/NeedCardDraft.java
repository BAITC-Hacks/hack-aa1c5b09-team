package kz.needboard.needs.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import jakarta.validation.constraints.*;

/** JSON contract shared by the editor and the future AI module. Empty text is allowed in a draft. */
public record NeedCardDraft(
        @Size(max = 200) String title,
        @Size(max = 10000) String problem,
        @Size(max = 5000) String expectedResult,
        @Size(max = 30) List<@NotBlank @Size(max = 500) String> acceptanceCriteria,
        @Size(max = 5000) String constraints,
        @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal budgetAmount,
        @Pattern(regexp = "[A-Z]{3}") String currency,
        LocalDate deadline,
        @Size(max = 250) String category,
        @Size(max = 250) String budgetText,
        @Size(max = 250) String deadlineText,
        @Size(max = 250) String workFormat,
        @Size(max = 250) String location,
        @Size(max = 5000) String requirements) {
    public NeedCardDraft {
        title = strip(title);
        problem = strip(problem);
        expectedResult = strip(expectedResult);
        constraints = strip(constraints);
        category = strip(category);
        budgetText = strip(budgetText);
        deadlineText = strip(deadlineText);
        workFormat = strip(workFormat);
        location = strip(location);
        requirements = strip(requirements);
        acceptanceCriteria = acceptanceCriteria == null ? List.of() :
                acceptanceCriteria.stream().map(NeedCardDraft::strip).toList();
        currency = currency == null || currency.isBlank() ? null : currency.strip().toUpperCase(Locale.ROOT);
    }

    public NeedCardDraft(String title, String problem, String expectedResult, List<String> acceptanceCriteria,
            String constraints, BigDecimal budgetAmount, String currency, LocalDate deadline) {
        this(title, problem, expectedResult, acceptanceCriteria, constraints, budgetAmount, currency, deadline,
                null, null, null, null, null, constraints);
    }

    private static String strip(String value) { return value == null ? null : value.strip(); }
}
