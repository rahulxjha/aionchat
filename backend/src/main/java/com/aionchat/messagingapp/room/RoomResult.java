package com.aionchat.messagingapp.room;

import com.aionchat.messagingapp.room.dto.RoomDto;
import java.util.List;

/**
 * A created or opened room: what the caller gets back, and who else must be told about it.
 * Everyone else sees the same view of a new room, so one DTO serves them all.
 */
public record RoomResult(RoomDto room, List<String> notifyUsernames, RoomDto notifyView) {

    public static RoomResult existing(RoomDto room) {
        return new RoomResult(room, List.of(), null);
    }
}
