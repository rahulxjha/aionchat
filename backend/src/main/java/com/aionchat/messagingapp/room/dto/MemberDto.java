package com.aionchat.messagingapp.room.dto;

import com.aionchat.messagingapp.room.RoomMember;

public record MemberDto(String username, String displayName, Long lastReadMessageId) {

    public static MemberDto from(RoomMember member) {
        return new MemberDto(
                member.getUser().getUsername(), member.getUser().getDisplayName(), member.getLastReadMessageId());
    }
}
