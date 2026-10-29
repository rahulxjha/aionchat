package com.aionchat.messagingapp.message;

import com.aionchat.messagingapp.common.ApiHeaders;
import com.aionchat.messagingapp.message.dto.MessageDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/api/rooms/{roomId}/messages")
    public List<MessageDto> getHistory(@RequestHeader(ApiHeaders.USERNAME) String username,
                                       @PathVariable Long roomId,
                                       @RequestParam(required = false) Long before,
                                       @RequestParam(required = false) Long after,
                                       @RequestParam(defaultValue = "30") int size) {
        return messageService.getHistory(roomId, username, before, after, size);
    }
}
