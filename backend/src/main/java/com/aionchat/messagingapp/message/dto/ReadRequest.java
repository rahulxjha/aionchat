package com.aionchat.messagingapp.message.dto;

import jakarta.validation.constraints.NotNull;

public record ReadRequest(@NotNull(message = "messageId is required.") Long messageId) {
}
