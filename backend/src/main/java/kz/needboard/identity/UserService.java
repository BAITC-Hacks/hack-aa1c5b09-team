package kz.needboard.identity;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import kz.needboard.common.ApiException;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService implements UserDetailsService {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public UserView register(String email, String password, String displayName) {
        validatePasswordLength(password);
        var normalizedEmail = normalizeEmail(email);
        if (users.existsByEmail(normalizedEmail)) {
            throw ApiException.conflict("EMAIL_EXISTS", "Этот email уже зарегистрирован.");
        }
        return UserView.from(users.saveAndFlush(
                new UserAccount(normalizedEmail, encoder.encode(password), displayName.strip())));
    }

    static void validatePasswordLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw ApiException.validation(Map.of("password", "Пароль должен занимать не более 72 байт UTF-8."));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        var user = users.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
        return new UserPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getPasswordHash());
    }

    @Transactional(readOnly = true)
    public String displayName(UUID id) {
        return users.findById(id).map(UserAccount::getDisplayName).orElse("Пользователь");
    }

    @Transactional(readOnly = true)
    public UserView profile(UUID id) {
        return UserView.from(users.findById(id).orElseThrow(ApiException::notFound));
    }

    @Transactional
    public UserView updateProfile(UUID id, String displayName, String specialty, String location, String bio) {
        var cleanName = displayName.strip();
        if (cleanName.length() < 2) {
            throw ApiException.validation(Map.of("displayName", "Имя должно содержать минимум 2 символа."));
        }
        var user = users.findById(id).orElseThrow(ApiException::notFound);
        user.updateProfile(cleanName, optional(specialty), optional(location), optional(bio));
        return UserView.from(user);
    }

    @Transactional(readOnly = true)
    public ProviderProfileView providerProfile(UUID id) {
        return ProviderProfileView.from(users.findById(id).orElseThrow(ApiException::notFound));
    }

    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
