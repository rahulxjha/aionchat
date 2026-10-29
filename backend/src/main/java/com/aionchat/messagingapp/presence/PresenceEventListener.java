package com.aionchat.messagingapp.presence;

import com.aionchat.messagingapp.user.UserService;
import com.aionchat.messagingapp.user.dto.UserDto;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** Turns WebSocket connect/disconnect events into online/offline broadcasts on /topic/presence. */
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    private final PresenceService presenceService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        Principal user = event.getUser();
        String sessionId = SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders());
        if (user != null && presenceService.addSession(user.getName(), sessionId)) {
            broadcast(userService.get(user.getName()));
        }
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user != null && presenceService.removeSession(user.getName(), event.getSessionId())) {
            broadcast(userService.markLastSeen(user.getName()));
        }
    }

    private void broadcast(UserDto user) {
        messagingTemplate.convertAndSend("/topic/presence", user);
    }
}
