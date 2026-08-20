import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, EvalResult, FeedbackSummary } from './api.service';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss'
})
export class FeedbackComponent implements OnInit {
  Object = Object;
  feedbackSummary: FeedbackSummary | null = null;
  evalResult: EvalResult | null = null;
  evalRunning = false;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.api.getFeedbackSummary().subscribe({
      next: (summary) => this.feedbackSummary = summary,
      error: () => {}
    });
  }

  promoteOverride(docId: string): void {
    this.api.promoteToGold(docId).subscribe({
      next: () => this.loadSummary(),
      error: (err) => this.error = err.error || 'Failed to promote override'
    });
  }

  runEval(): void {
    this.evalRunning = true;
    this.evalResult = null;
    this.error = '';
    this.api.runEval().subscribe({
      next: (result) => {
        this.evalResult = result;
        this.evalRunning = false;
      },
      error: (err) => {
        this.error = err.error || 'Eval run failed';
        this.evalRunning = false;
      }
    });
  }
}
