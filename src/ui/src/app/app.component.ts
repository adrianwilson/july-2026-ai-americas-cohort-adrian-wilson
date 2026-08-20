import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassifyComponent } from './classify.component';
import { ReviewComponent } from './review.component';
import { FeedbackComponent } from './feedback.component';
import { EvalHistoryComponent } from './eval-history.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ClassifyComponent, ReviewComponent, FeedbackComponent, EvalHistoryComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  activeTab: 'classify' | 'review' | 'feedback' | 'eval' = 'classify';
}
