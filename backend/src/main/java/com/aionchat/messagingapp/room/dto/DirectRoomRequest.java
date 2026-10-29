package com.aionchat.messagingapp.room.dto;

import jakarta.validation.constraints.NotBlank;

public record DirectRoomRequest(@NotBlank(message = "Pick someone to message.") String username) {
}
