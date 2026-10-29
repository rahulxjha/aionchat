package com.aionchat.messagingapp.room;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByDirectKey(String directKey);

    /** Group names can repeat; the seeded room is the oldest one with its name. */
    Optional<ChatRoom> findFirstByTypeAndNameOrderByIdAsc(RoomType type, String name);
}
