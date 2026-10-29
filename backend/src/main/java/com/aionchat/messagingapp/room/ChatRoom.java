package com.aionchat.messagingapp.room;

import com.aionchat.messagingapp.user.User;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "chat_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private RoomType type;

    /** Group name; null for direct rooms (the title is the other person's name). */
    private String name;

    /** "dm:alice:bob" for direct rooms, null for groups. Unique, so two people share one room. */
    private String directKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    private Instant createdAt;

    private ChatRoom(RoomType type, String name, String directKey, User createdBy) {
        this.type = type;
        this.name = name;
        this.directKey = directKey;
        this.createdBy = createdBy;
    }

    public static ChatRoom group(String name, User createdBy) {
        return new ChatRoom(RoomType.GROUP, name, null, createdBy);
    }

    public static ChatRoom direct(String directKey, User createdBy) {
        return new ChatRoom(RoomType.DIRECT, null, directKey, createdBy);
    }
}
