package com.aionchat.messagingapp.room;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

    /** Every member of every room the user is in - the whole chat list in one query. */
    @Query("""
            select rm from RoomMember rm
            join fetch rm.room
            join fetch rm.user
            where rm.room.id in (select own.room.id from RoomMember own where own.user.id = :userId)
            order by rm.room.id, rm.id""")
    List<RoomMember> findAllInRoomsOf(Long userId);

    @EntityGraph(attributePaths = {"room", "user"})
    List<RoomMember> findByRoomIdOrderById(Long roomId);

    @EntityGraph(attributePaths = "user")
    Optional<RoomMember> findByRoomIdAndUserUsername(Long roomId, String username);

    boolean existsByRoomIdAndUserUsername(Long roomId, String username);
}
