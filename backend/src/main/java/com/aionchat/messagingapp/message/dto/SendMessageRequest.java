package com.aionchat.messagingapp.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "Message can't be empty.")
        @Size(max = 1000, message = "Message can be at most 1000 characters.")
        String content) {
}
