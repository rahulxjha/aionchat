package com.aionchat.messagingapp.user.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record JoinRequest(
        @NotNull(message = "Username is required.")
        @Pattern(regexp = "^[a-zA-Z0-9_]{3,20}$",
                message = "Username must be 3-20 characters: letters, numbers or _.")
        String username,

        @Size(max = 50, message = "Display name can be at most 50 characters.")
        String displayName) {
}
