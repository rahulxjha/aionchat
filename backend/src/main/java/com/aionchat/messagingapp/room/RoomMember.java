package com.aionchat.messagingapp.room;

import com.aionchat.messagingapp.user.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "room_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private ChatRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    /** Newest message this member has seen. Everything after it is unread for them. */
    private Long lastReadMessageId;

    public RoomMember(ChatRoom room, User user) {
        this.room = room;
        this.user = user;
    }

    /** Only moves forward, so a late or repeated read receipt never marks messages unread again. */
    public void markRead(long messageId) {
        if (lastReadMessageId == null || messageId > lastReadMessageId) {
            lastReadMessageId = messageId;
        }
    }
}
