package kz.needboard.identity;

import java.util.UUID;

public record UserView(UUID id, String email, String displayName) {
    static UserView from(UserAccount user) {
        return new UserView(user.getId(), user.getEmail(), user.getDisplayName());
    }

    public static UserView from(UserPrincipal user) {
        return new UserView(user.id(), user.email(), user.displayName());
    }
}
