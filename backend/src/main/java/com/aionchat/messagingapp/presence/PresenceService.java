package com.aionchat.messagingapp.presence;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Who is online, kept in memory because it changes constantly.
 * Tracks session ids (not a counter) so a user with two tabs stays online until both close,
 * and a repeated disconnect event for the same session is harmless.
 * Connects and disconnects are rare, so a simple lock is enough.
 */
@Service
public class PresenceService {

    private final Map<String, Set<String>> sessionsByUser = new HashMap<>();

    public synchronized boolean isOnline(String username) {
        return sessionsByUser.containsKey(username);
    }

    /** @return true if this was the user's first session, i.e. they just came online */
    public synchronized boolean addSession(String username, String sessionId) {
        Set<String> sessions = sessionsByUser.computeIfAbsent(username, key -> new HashSet<>());
        return sessions.add(sessionId) && sessions.size() == 1;
    }

    /** @return true if this was the user's last session, i.e. they just went offline */
    public synchronized boolean removeSession(String username, String sessionId) {
        Set<String> sessions = sessionsByUser.get(username);
        if (sessions == null || !sessions.remove(sessionId)) {
            return false;
        }
        if (sessions.isEmpty()) {
            sessionsByUser.remove(username);
            return true;
        }
        return false;
    }
}
