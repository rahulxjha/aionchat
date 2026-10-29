package com.aionchat.messagingapp.room;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.toMap;

import com.aionchat.messagingapp.message.Message;
import com.aionchat.messagingapp.message.MessageRepository;
import com.aionchat.messagingapp.message.UnreadCount;
import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.room.dto.RoomDto;
import com.aionchat.messagingapp.user.User;
import com.aionchat.messagingapp.user.UserRepository;
import com.aionchat.messagingapp.user.UserService;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    /** The chat list: 3 queries in total, however many rooms the user has. */
    @Transactional(readOnly = true)
    public List<RoomDto> getMyRooms(String username) {
        User me = userService.getUser(username);
        return toDtos(me, roomMemberRepository.findAllInRoomsOf(me.getId()));
    }

    /** Returns the direct room between the two users, creating it on first contact. */
    @Transactional
    public RoomResult openDirect(String username, String otherUsername) {
        if (username.equals(otherUsername)) {
            throw badRequest("You can't start a chat with yourself.");
        }
        User me = userService.getUser(username);
        User other = userService.getUser(otherUsername);
        String directKey = directKey(me, other);

        return roomRepository.findByDirectKey(directKey)
                .map(room -> RoomResult.existing(
                        toDtos(me, roomMemberRepository.findByRoomIdOrderById(room.getId())).getFirst()))
                .orElseGet(() -> {
                    ChatRoom room = roomRepository.save(ChatRoom.direct(directKey, me));
                    List<RoomMember> members = roomMemberRepository.saveAll(
                            List.of(new RoomMember(room, me), new RoomMember(room, other)));
                    RoomDto dto = RoomDto.from(room, members, null, 0);
                    return new RoomResult(dto, List.of(other.getUsername()), dto);
                });
    }

    /** Creates a group with a "created the group" notice, which is unread for everyone but the creator. */
    @Transactional
    public RoomResult createGroup(String username, String name, Collection<String> memberUsernames) {
        User me = userService.getUser(username);
        Set<String> wanted = new HashSet<>(memberUsernames);
        wanted.remove(username);
        List<User> others = userRepository.findByUsernameIn(wanted);
        if (others.isEmpty() || others.size() != wanted.size()) {
            throw badRequest("Members must be other existing users.");
        }

        ChatRoom room = roomRepository.save(ChatRoom.group(name.trim(), me));
        RoomMember creator = new RoomMember(room, me);
        List<RoomMember> members = new ArrayList<>(List.of(creator));
        others.forEach(user -> members.add(new RoomMember(room, user)));
        roomMemberRepository.saveAll(members);

        Message notice = messageRepository.save(Message.system(room, me.nameForDisplay() + " created the group"));
        creator.markRead(notice.getId());
        MessageDto lastMessage = MessageDto.from(notice);

        return new RoomResult(
                RoomDto.from(room, members, lastMessage, 0),
                others.stream().map(User::getUsername).toList(),
                RoomDto.from(room, members, lastMessage, 1));
    }

    public RoomMember requireMember(Long roomId, String username) {
        return roomMemberRepository.findByRoomIdAndUserUsername(roomId, username).orElseThrow(RoomService::notMember);
    }

    /** Cheaper than requireMember when only a yes/no is needed. */
    public void checkMember(Long roomId, String username) {
        if (!roomMemberRepository.existsByRoomIdAndUserUsername(roomId, username)) {
            throw notMember();
        }
    }

    /** Builds the viewer's DTOs with 2 more queries: latest message per room and unread counts. */
    private List<RoomDto> toDtos(User viewer, List<RoomMember> members) {
        if (members.isEmpty()) {
            return List.of();
        }
        // One persistence context loads each room once, so grouping by the entity is safe.
        Map<ChatRoom, List<RoomMember>> membersByRoom =
                members.stream().collect(groupingBy(RoomMember::getRoom, LinkedHashMap::new, Collectors.toList()));
        List<Long> roomIds = membersByRoom.keySet().stream().map(ChatRoom::getId).toList();

        Map<Long, MessageDto> latest = messageRepository.findLatestInRooms(roomIds).stream()
                .map(MessageDto::from)
                .collect(toMap(MessageDto::roomId, Function.identity()));
        Map<Long, Long> unread = messageRepository.countUnread(viewer.getId(), roomIds).stream()
                .collect(toMap(UnreadCount::roomId, UnreadCount::count));

        return membersByRoom.entrySet().stream()
                .map(entry -> {
                    Long roomId = entry.getKey().getId();
                    return RoomDto.from(entry.getKey(), entry.getValue(), latest.get(roomId),
                            unread.getOrDefault(roomId, 0L));
                })
                .toList();
    }

    /** Same key whoever starts the chat: usernames in alphabetical order. */
    private static String directKey(User a, User b) {
        return a.getUsername().compareTo(b.getUsername()) < 0
                ? "dm:" + a.getUsername() + ":" + b.getUsername()
                : "dm:" + b.getUsername() + ":" + a.getUsername();
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    private static ResponseStatusException notMember() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this chat.");
    }
}
