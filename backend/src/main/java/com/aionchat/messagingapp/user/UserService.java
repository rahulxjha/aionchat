package com.aionchat.messagingapp.user;

import com.aionchat.messagingapp.message.Message;
import com.aionchat.messagingapp.message.MessageRepository;
import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.presence.PresenceService;
import com.aionchat.messagingapp.room.RoomMember;
import com.aionchat.messagingapp.room.RoomMemberRepository;
import com.aionchat.messagingapp.room.RoomRepository;
import com.aionchat.messagingapp.room.RoomType;
import com.aionchat.messagingapp.user.dto.UserDto;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {

    /** Seeded group every new user joins, so people can talk straight away. */
    private static final String LOBBY_ROOM_NAME = "general";

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageRepository messageRepository;
    private final PresenceService presenceService;

    /** Creates the user, or returns the existing one (updating the display name if a new one is given). */
    @Transactional
    public JoinResult join(String username, String displayName) {
        String name = StringUtils.hasText(displayName) ? displayName.trim() : null;
        return userRepository.findByUsername(username)
                .map(user -> {
                    if (name != null) {
                        user.setDisplayName(name);
                    }
                    return new JoinResult(toDto(user), null);
                })
                .orElseGet(() -> createUser(username, name));
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAll() {
        return userRepository.findAll(Sort.by("username")).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public UserDto get(String username) {
        return toDto(getUser(username));
    }

    /** Called when the user's last WebSocket session closes. */
    @Transactional
    public UserDto markLastSeen(String username) {
        User user = getUser(username);
        user.setLastSeenAt(Instant.now());
        return toDto(user);
    }

    public User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown user: " + username));
    }

    private JoinResult createUser(String username, String displayName) {
        User user = userRepository.save(new User(username, displayName));
        MessageDto joinMessage = roomRepository.findFirstByTypeAndNameOrderByIdAsc(RoomType.GROUP, LOBBY_ROOM_NAME)
                .map(lobby -> {
                    roomMemberRepository.save(new RoomMember(lobby, user));
                    return MessageDto.from(messageRepository.save(Message.join(lobby, user)));
                })
                .orElse(null);
        return new JoinResult(toDto(user), joinMessage);
    }

    private UserDto toDto(User user) {
        return UserDto.from(user, presenceService.isOnline(user.getUsername()));
    }
}
