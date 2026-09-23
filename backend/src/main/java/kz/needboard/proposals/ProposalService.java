package kz.needboard.proposals;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import kz.needboard.common.ApiException;
import kz.needboard.common.PageResponse;
import kz.needboard.needs.NeedService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProposalService {
    private final ProposalRepository proposals;
    private final NeedService needs;

    public ProposalService(ProposalRepository proposals, NeedService needs) {
        this.proposals = proposals;
        this.needs = needs;
    }

    @Transactional
    public ProposalView create(UUID needId, UUID author, ProposalRequest request) {
        validateTerms(request);
        // Creation and acceptance use the same lock: a proposal cannot appear after selection.
        var need = needs.lockPublished(needId);
        if (need.ownerId().equals(author)) throw ApiException.forbidden();
        if (proposals.existsByNeedIdAndAuthorId(needId, author)) {
            throw ApiException.conflict("PROPOSAL_EXISTS", "Вы уже предложили решение для этой потребности.");
        }
        return proposals.saveAndFlush(new Proposal(needId, author, request)).view();
    }

    public PageResponse<ProposalView> forNeed(UUID needId, UUID actor, int page, int size) {
        needs.requireOwner(needId, actor);
        return PageResponse.from(proposals.findByNeedId(needId, NeedService.paging(page, size)).map(Proposal::view));
    }

    public PageResponse<ProposalView> mine(UUID actor, int page, int size) {
        return PageResponse.from(proposals.findByAuthorId(actor, NeedService.paging(page, size)).map(Proposal::view));
    }

    @Transactional
    public ProposalView accept(UUID proposalId, UUID actor) {
        var proposal = proposals.findById(proposalId).orElseThrow(ApiException::notFound);
        var need = needs.lockPublished(proposal.needId());
        if (!need.ownerId().equals(actor)) throw ApiException.forbidden();
        if (proposal.status() != ProposalStatus.PENDING) {
            throw ApiException.conflict("INVALID_PROPOSAL_STATUS", "Это предложение уже рассмотрено.");
        }
        proposal.accept();
        proposals.flush();
        proposals.rejectOthers(proposal.needId(), proposal.id(), ProposalStatus.PENDING, ProposalStatus.REJECTED);
        needs.markSelected(proposal.needId(), proposal.id());
        return proposal.view();
    }

    private void validateTerms(ProposalRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (request.priceAmount() == null && blank(request.priceNote())) {
            errors.put("priceNote", "Укажите стоимость или условия её определения.");
        }
        if (request.priceAmount() != null && request.currency() == null) {
            errors.put("currency", "Укажите валюту стоимости.");
        }
        if (request.durationDays() == null && blank(request.scheduleNote())) {
            errors.put("scheduleNote", "Укажите длительность или условия определения срока.");
        }
        if (!errors.isEmpty()) throw ApiException.validation(errors);
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }
}
