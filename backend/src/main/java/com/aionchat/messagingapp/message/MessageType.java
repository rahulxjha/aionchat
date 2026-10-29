package com.aionchat.messagingapp.message;

public enum MessageType {
    /** Written by a user. */
    CHAT,
    /** "Priya Sharma joined the group" - the sender is the person who joined. */
    JOIN,
    /** "Rahul Jha created the group" - no sender. */
    SYSTEM
}
