package kz.needboard.needs.api;

import java.util.Arrays;
import java.util.List;

/** Presence checks enable confirmation; the owner attests to the stated content requirement. */
public enum ReadinessCriterion {
    CONTEXT(20, "Контекст и потребность", "Понятно, что происходит сейчас и что необходимо изменить."),
    MATERIALS(20, "Данные и материалы", "Указаны доступные данные, примеры или источники."),
    RESULT(15, "Ожидаемый результат", "Описан конкретный результат работы команды."),
    SUCCESS(15, "Критерии успеха", "Есть измеримые признаки принятия решения."),
    CONSTRAINTS(10, "Ограничения", "Указаны сроки, технологии, доступы или иные границы."),
    USERS(10, "Пользователи", "Понятно, для кого создаётся решение."),
    BUSINESS(10, "Связь с бизнесом", "Есть контакт, формат консультаций и порядок обратной связи.");

    public final int weight;
    public final String label;
    public final String description;

    ReadinessCriterion(int weight, String label, String description) {
        this.weight = weight;
        this.label = label;
        this.description = description;
    }

    public List<?> content(NeedCardDraft card) {
        return switch (this) {
            case CONTEXT -> Arrays.asList(card.problem());
            case MATERIALS -> Arrays.asList(card.materials());
            case RESULT -> Arrays.asList(card.expectedResult());
            case SUCCESS -> card.acceptanceCriteria();
            case CONSTRAINTS -> Arrays.asList(card.constraints(), card.deadline(), card.deadlineText(), card.requirements());
            case USERS -> Arrays.asList(card.targetUsers());
            case BUSINESS -> Arrays.asList(card.businessContact(), card.consultationFormat(), card.feedbackProcedure());
        };
    }

    public boolean filled(NeedCardDraft card) {
        var values = content(card);
        return this == CONSTRAINTS ? values.stream().anyMatch(ReadinessCriterion::present)
                : !values.isEmpty() && values.stream().allMatch(ReadinessCriterion::present);
    }

    private static boolean present(Object value) {
        return value != null && (!(value instanceof String text) || !text.isBlank());
    }
}
