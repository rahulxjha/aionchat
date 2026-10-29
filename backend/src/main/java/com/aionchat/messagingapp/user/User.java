package com.aionchat.messagingapp.user;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @Setter
    private String displayName;

    @CreationTimestamp
    private Instant createdAt;

    @Setter
    private Instant lastSeenAt;

    public User(String username, String displayName) {
        this.username = username;
        this.displayName = displayName;
    }

    /** What other people see: the display name if set, otherwise the username. */
    public String nameForDisplay() {
        return displayName != null ? displayName : username;
    }
}
