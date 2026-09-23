package kz.needboard.identity;

import java.util.UUID;

public record ProviderProfileView(UUID id, String displayName,
                                  String specialty, String location, String bio) {
    static ProviderProfileView from(UserAccount user) {
        return new ProviderProfileView(user.getId(), user.getDisplayName(),
                user.getSpecialty(), user.getLocation(), user.getBio());
    }
}
