import { Component, computed, input } from '@angular/core';
import { avatarColor, initials } from '../../core/utils/avatar';

/** Initials in a colored circle (people) or rounded square (groups), with an optional online dot. */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  host: {
    '[class]': 'size() + " " + shape()',
    '[style.background]': 'color().bg',
    '[style.color]': 'color().fg',
  },
})
export class Avatar {
  readonly name = input.required<string>();
  /** What decides the color - usually the username, so it stays stable if the name changes. */
  readonly colorKey = input<string>('');
  readonly size = input<'xs' | 'sm' | 'md'>('md');
  readonly shape = input<'circle' | 'square'>('circle');
  readonly online = input(false);

  protected readonly initials = computed(() => initials(this.name()));
  protected readonly color = computed(() => avatarColor(this.colorKey() || this.name()));
}
