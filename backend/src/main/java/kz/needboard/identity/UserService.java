package kz.needboard.identity;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
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
}
