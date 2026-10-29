import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/** No username picked yet -> send to the join screen. */
export const usernameGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  return session.currentUser() ? true : inject(Router).createUrlTree(['/login']);
};
