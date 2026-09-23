package kz.needboard.proposals;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface ProposalRepository extends JpaRepository<Proposal, UUID> {
    boolean existsByNeedIdAndAuthorId(UUID needId, UUID authorId);
    Page<Proposal> findByNeedId(UUID needId, Pageable pageable);
    Page<Proposal> findByAuthorId(UUID authorId, Pageable pageable);

    @Modifying
    @Query("update Proposal p set p.status = :rejected where p.needId = :needId and p.id <> :selectedId and p.status = :pending")
    int rejectOthers(@Param("needId") UUID needId, @Param("selectedId") UUID selectedId,
                     @Param("pending") ProposalStatus pending, @Param("rejected") ProposalStatus rejected);
}
