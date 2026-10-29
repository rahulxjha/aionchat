package com.aionchat.messagingapp.user;

import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.user.dto.JoinRequest;
import com.aionchat.messagingapp.user.dto.UserDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /** The lightweight "login". Broadcasting happens here, after the service's transaction has committed. */
    @PostMapping
    public UserDto join(@Valid @RequestBody JoinRequest request) {
        JoinResult result = userService.join(request.username(), request.displayName());
        MessageDto joinMessage = result.lobbyJoinMessage();
        if (joinMessage != null) {
            messagingTemplate.convertAndSend("/topic/rooms/" + joinMessage.roomId(), joinMessage);
        }
        return result.user();
    }

    @GetMapping
    public List<UserDto> getAll() {
        return userService.getAll();
    }
}
