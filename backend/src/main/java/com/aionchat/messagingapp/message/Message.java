package com.aionchat.messagingapp.message;

import com.aionchat.messagingapp.room.ChatRoom;
import com.aionchat.messagingapp.user.User;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private ChatRoom room;

    /** Null for SYSTEM messages. */
    @ManyToOne(fetch = FetchType.LAZY)
    private User sender;

    private String content;

    @Enumerated(EnumType.STRING)
    private MessageType type;

    @CreationTimestamp
    private Instant sentAt;

    private Message(ChatRoom room, User sender, String content, MessageType type) {
        this.room = room;
        this.sender = sender;
        this.content = content;
        this.type = type;
    }

    public static Message chat(ChatRoom room, User sender, String content) {
        return new Message(room, sender, content, MessageType.CHAT);
    }

    public static Message join(ChatRoom room, User user) {
        return new Message(room, user, user.nameForDisplay() + " joined the group", MessageType.JOIN);
    }

    public static Message system(ChatRoom room, String content) {
        return new Message(room, null, content, MessageType.SYSTEM);
    }
}
