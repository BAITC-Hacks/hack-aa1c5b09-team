package kz.needboard.needs;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface NeedRepository extends JpaRepository<Need, UUID> {
    Page<Need> findByStatus(NeedStatus status, Pageable pageable);
    Page<Need> findByOwnerId(UUID ownerId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from Need n where n.id = :id")
    Optional<Need> findLocked(@Param("id") UUID id);
}
