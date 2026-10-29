package com.aionchat.messagingapp.message;

import com.aionchat.messagingapp.common.ApiError;
import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.message.dto.ReadEvent;
import com.aionchat.messagingapp.message.dto.ReadRequest;
import com.aionchat.messagingapp.message.dto.SendMessageRequest;
import com.aionchat.messagingapp.message.dto.TypingEvent;
import com.aionchat.messagingapp.message.dto.TypingRequest;
import com.aionchat.messagingapp.room.RoomService;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

/**
 * STOMP endpoints. The sender always comes from the session's Principal, never from the payload.
 * The return value is broadcast by @SendTo after the service's transaction has committed.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final MessageService messageService;
    private final RoomService roomService;

    @MessageMapping("/rooms/{roomId}/send")
    @SendTo("/topic/rooms/{roomId}")
    public MessageDto send(@DestinationVariable Long roomId,
                           @Valid @Payload SendMessageRequest request,
                           Principal principal) {
        return messageService.send(roomId, principal.getName(), request.content());
    }

    /** Not saved - typing only matters right now. */
    @MessageMapping("/rooms/{roomId}/typing")
    @SendTo("/topic/rooms/{roomId}/typing")
    public TypingEvent typing(@DestinationVariable Long roomId, @Payload TypingRequest request, Principal principal) {
        roomService.checkMember(roomId, principal.getName());
        return new TypingEvent(principal.getName(), request.typing());
    }

    @MessageMapping("/rooms/{roomId}/read")
    @SendTo("/topic/rooms/{roomId}/read")
    public ReadEvent read(@DestinationVariable Long roomId, @Valid @Payload ReadRequest request, Principal principal) {
        messageService.markRead(roomId, principal.getName(), request.messageId());
        return new ReadEvent(principal.getName(), request.messageId());
    }

    /** WebSocket has no status codes, so errors go privately to the sender's own queue. */
    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ApiError handleError(Exception e) {
        return switch (e) {
            case ResponseStatusException statusError -> new ApiError(statusError.getReason());
            case MethodArgumentNotValidException invalid when invalid.getBindingResult() != null ->
                    ApiError.of(invalid.getBindingResult());
            default -> {
                log.error("WebSocket message failed", e);
                yield new ApiError("Something went wrong.");
            }
        };
    }
}
