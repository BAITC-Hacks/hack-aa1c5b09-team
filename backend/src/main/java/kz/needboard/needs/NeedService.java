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
        return view(needs.save(new Need(actor, request.originalDescription(), request.card())), actor);
    }

    @Transactional
    public NeedView update(UUID id, UUID actor, NeedWriteRequest request) {
        var need = ownedLocked(id, actor);
        requireStatus(need, NeedStatus.DRAFT);
        rules.validateBudget(request.card());
        need.update(request.originalDescription(), request.card());
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
        return view(need, actor);
    }

    public NeedView get(UUID id, UUID actor) {
        var need = needs.findById(id).orElseThrow(ApiException::notFound);
        if (need.status() == NeedStatus.DRAFT && !need.ownerId().equals(actor)) throw ApiException.notFound();
        return view(need, actor);
    }

    public PageResponse<NeedView> catalog(int page, int size) {
        return PageResponse.from(needs.findByStatus(NeedStatus.PUBLISHED, paging(page, size)).map(n -> view(n, null)));
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

    private NeedView view(Need need, UUID actor) {
        var card = need.card();
        return new NeedView(need.id(), need.ownerId(), users.displayName(need.ownerId()),
                need.ownerId().equals(actor) ? need.originalDescription() : null,
                card, need.status(), need.createdAt(), need.updatedAt(), need.selectedProposalId(), rules.missingFields(card));
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
