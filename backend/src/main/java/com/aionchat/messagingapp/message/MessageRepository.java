package com.aionchat.messagingapp.message;

import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * History uses keyset ("cursor") paging on the message id, backed by the (room_id, id) index.
 * Unlike offset paging, new messages arriving never shift a page. The sender is fetched in the same query.
 */
public interface MessageRepository extends JpaRepository<Message, Long> {

    @EntityGraph(attributePaths = "sender")
    List<Message> findByRoomIdOrderByIdDesc(Long roomId, Limit limit);

    @EntityGraph(attributePaths = "sender")
    List<Message> findByRoomIdAndIdLessThanOrderByIdDesc(Long roomId, Long id, Limit limit);

    @EntityGraph(attributePaths = "sender")
    List<Message> findByRoomIdAndIdGreaterThanOrderByIdAsc(Long roomId, Long id, Limit limit);

    /** Newest message of each room, for the chat list preview. */
    @EntityGraph(attributePaths = "sender")
    @Query("""
            select m from Message m
            where m.id in (select max(x.id) from Message x where x.room.id in :roomIds group by x.room.id)""")
    List<Message> findLatestInRooms(Collection<Long> roomIds);

    /** Per room: messages after the user's read marker, not counting their own. */
    @Query("""
            select new com.aionchat.messagingapp.message.UnreadCount(m.room.id, count(m))
            from Message m
            join RoomMember rm on rm.room = m.room
            where rm.user.id = :userId
              and m.room.id in :roomIds
              and m.id > coalesce(rm.lastReadMessageId, 0)
              and (m.sender is null or m.sender <> rm.user)
            group by m.room.id""")
    List<UnreadCount> countUnread(Long userId, Collection<Long> roomIds);
}
