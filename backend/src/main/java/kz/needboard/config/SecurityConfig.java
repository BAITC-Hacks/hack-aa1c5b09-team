package kz.needboard.config;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import kz.needboard.common.ApiError;
import kz.needboard.identity.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.*;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.savedrequest.NullRequestCache;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class SecurityConfig {
    @Bean
    AuthenticationManager authenticationManager(UserService users, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrf) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(csrf)));
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper mapper,
            CsrfTokenRepository csrf, SecurityContextRepository contexts) throws Exception {
        return http
                .csrf(config -> config.csrfTokenRepository(csrf))
                .securityContext(config -> config.securityContextRepository(contexts))
                .requestCache(config -> config.requestCache(new NullRequestCache()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf", "/api/needs", "/api/needs/*", "/api/providers/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(config -> config
                        .authenticationEntryPoint((request, response, ex) ->
                                writeError(mapper, response, 401, "UNAUTHENTICATED", "Необходимо войти."))
                        .accessDeniedHandler((request, response, ex) -> {
                            boolean csrfError = ex instanceof CsrfException;
                            writeError(mapper, response, 403, csrfError ? "CSRF_INVALID" : "FORBIDDEN",
                                    csrfError ? "Получите новый CSRF-токен." : "Недостаточно прав.");
                        }))
                .logout(config -> config.logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true).deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, auth) -> response.setStatus(204)))
                .build();
    }

    private static void writeError(ObjectMapper mapper, HttpServletResponse response,
                                   int status, String code, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), new ApiError(code, message));
    }
}
