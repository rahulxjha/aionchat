package com.aionchat.messagingapp.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record GroupRoomRequest(
        @NotBlank(message = "Group name is required.")
        @Size(max = 50, message = "Group name can be at most 50 characters.")
        String name,

        @NotEmpty(message = "Add at least one member.")
        List<String> memberUsernames) {
}
