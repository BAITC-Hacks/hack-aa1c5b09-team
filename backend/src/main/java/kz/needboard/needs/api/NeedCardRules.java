package kz.needboard.needs.api;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import kz.needboard.common.ApiException;
import org.springframework.stereotype.Component;

@Component
public class NeedCardRules {
    public List<String> missingFields(NeedCardDraft card) {
        var fields = new ArrayList<String>();
        if (blank(card.title())) fields.add("title");
        if (blank(card.problem())) fields.add("problem");
        if (blank(card.expectedResult())) fields.add("expectedResult");
        if (card.acceptanceCriteria().isEmpty() || card.acceptanceCriteria().stream().allMatch(this::blank)) {
            fields.add("acceptanceCriteria");
        }
        return List.copyOf(fields);
    }

    public void validateBudget(NeedCardDraft card) {
        if (card.budgetAmount() != null && card.currency() == null) {
            throw ApiException.validation(Map.of("card.currency", "Укажите валюту бюджета."));
        }
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }
}
