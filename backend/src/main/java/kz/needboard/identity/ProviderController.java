package kz.needboard.identity;

import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProviderController {
    private final UserService users;

    public ProviderController(UserService users) { this.users = users; }

    @GetMapping("/api/providers/{id}")
    public ProviderProfileView profile(@PathVariable UUID id) {
        return users.providerProfile(id);
    }
}
