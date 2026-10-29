package com.aionchat.messagingapp.config;

import com.aionchat.messagingapp.user.UserRepository;
import java.security.Principal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class UsernameHandshakeHandler extends DefaultHandshakeHandler implements HandshakeInterceptor {

    private static final String USERNAME_ATTRIBUTE = "username";

    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String username = UriComponentsBuilder.fromUri(request.getURI()).build()
                .getQueryParams().getFirst(USERNAME_ATTRIBUTE);
        if (username == null || !userRepository.existsByUsername(username)) {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }
        attributes.put(USERNAME_ATTRIBUTE, username);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Nothing to clean up.
    }

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler,
                                      Map<String, Object> attributes) {
        return new StompPrincipal((String) attributes.get(USERNAME_ATTRIBUTE));
    }
}
