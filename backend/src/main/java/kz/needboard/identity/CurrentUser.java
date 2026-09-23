package kz.needboard.identity;

import java.util.UUID;
import kz.needboard.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Shared with the clarification module. Never accepts a user id from request JSON. */
@Component
public class CurrentUser {
    public UserPrincipal require() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal user) {
            return user;
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Необходимо войти.");
    }

    public UUID id() { return require().id(); }

    public UUID idOrNull() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UserPrincipal user ? user.id() : null;
    }
}
