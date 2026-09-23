package kz.needboard.identity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserAccount {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true, length = 254)
    private String email;
    @Column(nullable = false, length = 100)
    private String passwordHash;
    @Column(nullable = false, length = 100)
    private String displayName;
    @Column(length = 120)
    private String specialty;
    @Column(length = 120)
    private String location;
    @Column(length = 2000)
    private String bio;
    @Column(nullable = false)
    private Instant createdAt;

    protected UserAccount() {}

    UserAccount(String email, String passwordHash, String displayName) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public String getSpecialty() { return specialty; }
    public String getLocation() { return location; }
    public String getBio() { return bio; }

    void updateProfile(String displayName, String specialty, String location, String bio) {
        this.displayName = displayName;
        this.specialty = specialty;
        this.location = location;
        this.bio = bio;
    }
}
