package kz.needboard.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService users;
    private final CurrentUser currentUser;
    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionStrategy;
    private final SecurityContextRepository contexts;

    public AuthController(UserService users, CurrentUser currentUser, AuthenticationManager authenticationManager,
                          SessionAuthenticationStrategy sessionStrategy, SecurityContextRepository contexts) {
        this.users = users;
        this.currentUser = currentUser;
        this.authenticationManager = authenticationManager;
        this.sessionStrategy = sessionStrategy;
        this.contexts = contexts;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserView register(@Valid @RequestBody RegisterRequest request) {
        return users.register(request.email(), request.password(), request.displayName());
    }

    @PostMapping("/login")
    public UserView login(@Valid @RequestBody LoginRequest request,
                          HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        UserService.validatePasswordLength(request.password());
        var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
        sessionStrategy.onAuthentication(authentication, httpRequest, httpResponse);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, httpRequest, httpResponse);
        return users.profile(((UserPrincipal) authentication.getPrincipal()).id());
    }

    @GetMapping("/me")
    public UserView me() { return users.profile(currentUser.id()); }

    @PutMapping("/me")
    public UserView updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return users.updateProfile(currentUser.id(), request.displayName(), request.specialty(),
                request.location(), request.bio());
    }

    @GetMapping("/csrf")
    public CsrfView csrf(CsrfToken token) {
        return new CsrfView(token.getHeaderName(), token.getToken());
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 100) String displayName) {}
    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 72) String password) {}
    public record UpdateProfileRequest(
            @NotBlank @Size(min = 2, max = 100) String displayName,
            @Size(max = 120) String specialty,
            @Size(max = 120) String location,
            @Size(max = 2000) String bio) {}
    public record CsrfView(String headerName, String token) {}
}
