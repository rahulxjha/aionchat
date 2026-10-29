import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

/**
 * Tells the backend who is calling. No authentication by design -
 * a real app would send a JWT here instead.
 */
export const usernameInterceptor: HttpInterceptorFn = (req, next) => {
  const username = inject(SessionService).currentUser()?.username;
  return next(username ? req.clone({ setHeaders: { 'X-Username': username } }) : req);
};
