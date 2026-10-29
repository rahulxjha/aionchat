package com.aionchat.messagingapp.message.dto;

import com.aionchat.messagingapp.message.Message;
import com.aionchat.messagingapp.message.MessageType;
import com.aionchat.messagingapp.user.User;
import java.time.Instant;

public record MessageDto(
        Long id,
        Long roomId,
        String senderUsername,
        String senderDisplayName,
        String content,
        MessageType type,
        Instant sentAt) {

    public static MessageDto from(Message message) {
        User sender = message.getSender();
        return new MessageDto(
                message.getId(),
                message.getRoom().getId(),
                sender == null ? null : sender.getUsername(),
                sender == null ? null : sender.getDisplayName(),
                message.getContent(),
                message.getType(),
                message.getSentAt());
    }
}
