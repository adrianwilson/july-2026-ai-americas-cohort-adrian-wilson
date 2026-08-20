import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassifyComponent } from './classify.component';
import { FeedbackComponent } from './feedback.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ClassifyComponent, FeedbackComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  activeTab: 'classify' | 'admin' = 'classify';
}
