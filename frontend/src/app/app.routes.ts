import { Routes } from '@angular/router';
import { usernameGuard } from './core/guards/username.guard';
import { Chat } from './pages/chat/chat';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'chat', component: Chat, canActivate: [usernameGuard] },
  { path: '**', redirectTo: 'chat' },
];
