package com.aionchat.messagingapp.user;

import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.user.dto.UserDto;

/** The joined user, plus the "joined the group" message to broadcast - null for a returning user. */
public record JoinResult(UserDto user, MessageDto lobbyJoinMessage) {
}
