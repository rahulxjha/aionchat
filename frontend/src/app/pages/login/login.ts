import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Avatar } from '../../components/avatar/avatar';
import { ApiService, apiErrorMessage } from '../../core/services/api.service';
import { RecentUser, SessionService } from '../../core/services/session.service';

/** Same rule as the backend validation. */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

@Component({
  selector: 'app-login',
  imports: [FormsModule, Avatar],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly displayName = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly recentUsers = this.session.recentUsers;

  constructor() {
    if (this.session.currentUser()) void this.router.navigate(['/chat']);
  }

  protected submit(): void {
    const username = this.username().trim();
    if (!USERNAME_PATTERN.test(username)) {
      this.error.set('Username must be 3-20 characters: letters, numbers or _.');
      return;
    }
    this.join(username, this.displayName().trim() || null);
  }

  protected joinAs(recent: RecentUser): void {
    this.join(recent.username, null);
  }

  private join(username: string, displayName: string | null): void {
    this.submitting.set(true);
    this.error.set(null);

    this.api.join(username, displayName).subscribe({
      next: (user) => {
        this.session.login(user);
        void this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Could not join. Contact the administrator.'));
        this.submitting.set(false);
      },
    });
  }
}
