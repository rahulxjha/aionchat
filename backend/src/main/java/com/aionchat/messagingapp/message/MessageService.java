package com.aionchat.messagingapp.message;

import com.aionchat.messagingapp.message.dto.MessageDto;
import com.aionchat.messagingapp.room.RoomMember;
import com.aionchat.messagingapp.room.RoomService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final int MAX_PAGE_SIZE = 100;

    private final MessageRepository messageRepository;
    private final RoomService roomService;

    /**
     * One page of history, oldest first.
     * before = scrolling up, after = catching up after a reconnect, neither = the latest page.
     */
    @Transactional(readOnly = true)
    public List<MessageDto> getHistory(Long roomId, String username, Long before, Long after, int size) {
        roomService.checkMember(roomId, username);
        if (before != null && after != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use either before or after, not both.");
        }
        Limit limit = Limit.of(Math.clamp(size, 1, MAX_PAGE_SIZE));

        List<Message> page;
        if (after != null) {
            page = messageRepository.findByRoomIdAndIdGreaterThanOrderByIdAsc(roomId, after, limit);
        } else {
            // Newest-first is what the index reads fastest; flip it so the client gets oldest-first.
            page = (before != null
                    ? messageRepository.findByRoomIdAndIdLessThanOrderByIdDesc(roomId, before, limit)
                    : messageRepository.findByRoomIdOrderByIdDesc(roomId, limit)).reversed();
        }
        return page.stream().map(MessageDto::from).toList();
    }

    /** Saves the message; the caller broadcasts it once this transaction has committed. */
    @Transactional
    public MessageDto send(Long roomId, String username, String content) {
        RoomMember member = roomService.requireMember(roomId, username);
        Message message = messageRepository.save(Message.chat(member.getRoom(), member.getUser(), content.trim()));
        member.markRead(message.getId());
        return MessageDto.from(message);
    }

    @Transactional
    public void markRead(Long roomId, String username, long messageId) {
        roomService.requireMember(roomId, username).markRead(messageId);
    }
}
