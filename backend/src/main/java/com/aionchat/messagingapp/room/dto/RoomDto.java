package com.aionchat.messagingapp.room.dto;

import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.room.ChatRoom;
import com.aionchat.messagingapp.room.RoomMember;
import com.aionchat.messagingapp.room.RoomType;
import java.time.Instant;
import java.util.List;

/** A room as one viewer sees it - unreadCount is personal. */
public record RoomDto(
        Long id,
        RoomType type,
        String name,
        List<MemberDto> members,
        MessageDto lastMessage,
        long unreadCount,
        Instant createdAt) {

    public static RoomDto from(ChatRoom room, List<RoomMember> members, MessageDto lastMessage, long unreadCount) {
        return new RoomDto(
                room.getId(),
                room.getType(),
                room.getName(),
                members.stream().map(MemberDto::from).toList(),
                lastMessage,
                unreadCount,
                room.getCreatedAt());
    }
}
