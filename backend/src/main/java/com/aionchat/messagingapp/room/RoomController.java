package com.aionchat.messagingapp.room;

import com.aionchat.messagingapp.common.ApiHeaders;
import com.aionchat.messagingapp.room.dto.DirectRoomRequest;
import com.aionchat.messagingapp.room.dto.GroupRoomRequest;
import com.aionchat.messagingapp.room.dto.RoomDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public List<RoomDto> getMyRooms(@RequestHeader(ApiHeaders.USERNAME) String username) {
        return roomService.getMyRooms(username);
    }

    @PostMapping("/direct")
    public RoomDto openDirect(@RequestHeader(ApiHeaders.USERNAME) String username,
                              @Valid @RequestBody DirectRoomRequest request) {
        return notifyAndReturn(roomService.openDirect(username, request.username()));
    }

    @PostMapping("/group")
    public RoomDto createGroup(@RequestHeader(ApiHeaders.USERNAME) String username,
                               @Valid @RequestBody GroupRoomRequest request) {
        return notifyAndReturn(roomService.createGroup(username, request.name(), request.memberUsernames()));
    }

    /** Other members learn about the new room on their private queue; the caller gets it as the response. */
    private RoomDto notifyAndReturn(RoomResult result) {
        result.notifyUsernames().forEach(username ->
                messagingTemplate.convertAndSendToUser(username, "/queue/rooms", result.notifyView()));
        return result.room();
    }
}
