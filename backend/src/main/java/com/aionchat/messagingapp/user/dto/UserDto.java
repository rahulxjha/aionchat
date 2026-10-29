package com.aionchat.messagingapp.user.dto;

import com.aionchat.messagingapp.user.User;
import java.time.Instant;

public record UserDto(Long id, String username, String displayName, boolean online, Instant lastSeenAt) {

    public static UserDto from(User user, boolean online) {
        return new UserDto(user.getId(), user.getUsername(), user.getDisplayName(), online, user.getLastSeenAt());
    }
}
