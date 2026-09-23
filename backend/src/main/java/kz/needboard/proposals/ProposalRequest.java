package kz.needboard.proposals;

import java.math.BigDecimal;
import java.util.Locale;
import jakarta.validation.constraints.*;

public record ProposalRequest(
        @NotBlank @Size(max = 10000) String solutionDescription,
        @NotBlank @Size(max = 5000) String implementationPlan,
        @NotBlank @Size(max = 5000) String expectedResult,
        @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal priceAmount,
        @Pattern(regexp = "[A-Z]{3}") String currency,
        @Size(max = 2000) String priceNote,
        @Min(1) @Max(3650) Integer durationDays,
        @Size(max = 2000) String scheduleNote) {
    public ProposalRequest {
        currency = currency == null || currency.isBlank() ? null : currency.strip().toUpperCase(Locale.ROOT);
    }
}
