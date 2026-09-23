package kz.needboard.needs;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import kz.needboard.common.ApiException;
import kz.needboard.common.PageResponse;
import kz.needboard.identity.UserService;
import kz.needboard.needs.api.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NeedService {
    private final NeedRepository needs;
    private final NeedCardRules rules;
    private final UserService users;

    public NeedService(NeedRepository needs, NeedCardRules rules, UserService users) {
        this.needs = needs;
        this.rules = rules;
        this.users = users;
    }

    @Transactional
    public NeedView create(UUID actor, NeedWriteRequest request) {
        rules.validateBudget(request.card());
        return view(needs.saveAndFlush(new Need(actor, request.originalDescription(), request.card())), actor);
    }

    @Transactional
    public NeedView update(UUID id, UUID actor, NeedWriteRequest request) {
        var need = ownedLocked(id, actor);
        requireEditable(need);
        if (need.status() == NeedStatus.PUBLISHED && request.revision() == null) {
            throw ApiException.validation(Map.of("revision", "Передайте версию опубликованной карточки."));
        }
        if (request.revision() != null) requireRevision(need, request.revision());
        rules.validateBudget(request.card());
        if (need.status() == NeedStatus.PUBLISHED && !rules.missingFields(request.card()).isEmpty()) {
            throw ApiException.validation(Map.of("card", "Сохраните обязательные поля опубликованной карточки."));
        }
        need.update(request.originalDescription(), request.card());
        needs.flush();
        return view(need, actor);
    }

    @Transactional
    public NeedView confirmReadiness(UUID id, UUID actor, ReadinessConfirmationRequest request) {
        var need = ownedLocked(id, actor);
        requireEditable(need);
        requireRevision(need, request.revision());
        Map<String, String> missing = new LinkedHashMap<>();
        request.confirmedCriteria().stream().filter(criterion -> !criterion.filled(need.card()))
                .forEach(criterion -> missing.put("confirmedCriteria." + criterion.name(), criterion.description));
        if (!missing.isEmpty()) throw ApiException.validation(missing);
        need.confirm(request.confirmedCriteria());
        needs.flush();
        return view(need, actor);
    }

    @Transactional
    public NeedView publish(UUID id, UUID actor) {
        var need = ownedLocked(id, actor);
        requireStatus(need, NeedStatus.DRAFT);
        Map<String, String> missing = new LinkedHashMap<>();
        rules.missingFields(need.card()).forEach(field -> missing.put("card." + field, "Заполните поле перед публикацией."));
        if (need.card().deadline() != null && need.card().deadline().isBefore(LocalDate.now(ZoneOffset.UTC))) {
            missing.put("card.deadline", "Срок не должен быть в прошлом.");
        }
        if (!missing.isEmpty()) throw ApiException.validation(missing);
        need.publish();
        needs.flush();
        return view(need, actor);
    }

    public NeedView get(UUID id, UUID actor) {
        var need = needs.findById(id).orElseThrow(ApiException::notFound);
        if (need.status() == NeedStatus.DRAFT && !need.ownerId().equals(actor)) throw ApiException.notFound();
        return view(need, actor);
    }

    public PageResponse<NeedView> catalog(int page, int size) {
        paging(page, size); // Validate pagination; catalog ordering is applied before pagination in the database.
        return PageResponse.from(needs.catalog(PageRequest.of(page, size)).map(n -> view(n, null)));
    }

    public PageResponse<NeedView> mine(UUID actor, int page, int size) {
        return PageResponse.from(needs.findByOwnerId(actor, paging(page, size)).map(n -> view(n, actor)));
    }

    public void requireOwner(UUID id, UUID actor) {
        var need = needs.findById(id).orElseThrow(ApiException::notFound);
        if (!need.ownerId().equals(actor)) throw ApiException.forbidden();
    }

    /** Must be called within the proposal operation's transaction; the lock lasts until its commit. */
    @Transactional(propagation = Propagation.MANDATORY)
    public NeedAccess lockPublished(UUID id) {
        var need = needs.findLocked(id).orElseThrow(ApiException::notFound);
        requireStatus(need, NeedStatus.PUBLISHED);
        return new NeedAccess(need.id(), need.ownerId());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void markSelected(UUID needId, UUID proposalId) {
        var need = needs.findLocked(needId).orElseThrow(ApiException::notFound);
        requireStatus(need, NeedStatus.PUBLISHED);
        need.select(proposalId);
    }

    private Need ownedLocked(UUID id, UUID actor) {
        var need = needs.findLocked(id).orElseThrow(ApiException::notFound);
        if (!need.ownerId().equals(actor)) throw ApiException.forbidden();
        return need;
    }

    private void requireStatus(Need need, NeedStatus status) {
        if (need.status() != status) {
            throw ApiException.conflict("INVALID_NEED_STATUS", "Операция недоступна в текущем состоянии карточки.");
        }
    }

    private void requireEditable(Need need) {
        if (need.status() == NeedStatus.SOLUTION_SELECTED) {
            throw ApiException.conflict("INVALID_NEED_STATUS", "После выбора решения карточка доступна только для чтения.");
        }
    }

    private void requireRevision(Need need, long revision) {
        if (need.revision() != revision) {
            throw ApiException.conflict("STALE_NEED", "Карточка изменилась. Обновите её и подтвердите актуальные сведения.");
        }
    }

    private NeedView view(Need need, UUID actor) {
        var card = need.card();
        return new NeedView(need.id(), need.ownerId(), users.displayName(need.ownerId()),
                need.ownerId().equals(actor) ? need.originalDescription() : null,
                card, need.status(), need.createdAt(), need.updatedAt(), need.selectedProposalId(), rules.missingFields(card), need.revision(), need.readiness());
    }

    public NeedChatAccess chatAccess(UUID id) {
        var need = needs.findById(id).orElseThrow(ApiException::notFound);
        return new NeedChatAccess(need.id(), need.ownerId(), need.status(), need.selectedProposalId());
    }

    public static PageRequest paging(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw ApiException.validation(Map.of("pagination", "page >= 0; size от 1 до 100."));
        }
        return PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
    }

    public record NeedAccess(UUID id, UUID ownerId) {}
    public record NeedChatAccess(UUID id, UUID ownerId, NeedStatus status, UUID selectedProposalId) {}
}
