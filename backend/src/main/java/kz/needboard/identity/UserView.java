package kz.needboard.identity;

import java.util.UUID;

public record UserView(UUID id, String email, String displayName,
                       String specialty, String location, String bio) {
    static UserView from(UserAccount user) {
        return new UserView(user.getId(), user.getEmail(), user.getDisplayName(),
                user.getSpecialty(), user.getLocation(), user.getBio());
    }
}
