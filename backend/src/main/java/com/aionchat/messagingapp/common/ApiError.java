package com.aionchat.messagingapp.common;

import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.validation.BindingResult;

public record ApiError(String message) {

    public static ApiError of(BindingResult result) {
        return new ApiError(result.getAllErrors().stream()
                .findFirst()
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .orElse("Invalid request."));
    }
}
