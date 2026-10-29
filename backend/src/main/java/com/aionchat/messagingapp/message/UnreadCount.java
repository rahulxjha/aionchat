package com.aionchat.messagingapp.message;

/** One row of the unread-count query. */
public record UnreadCount(Long roomId, Long count) {
}
