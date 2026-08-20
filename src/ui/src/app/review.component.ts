import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ClassifyResponse, ReviewResponse } from './api.service';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss'
})
export class ReviewComponent {
  recentDocs: string[] = [];
  result: ClassifyResponse | null = null;
  loading = false;
  error = '';

  reviewVerdict = '';
  reviewRationale = '';
  reviewMissedPolicies = '';
  reviewSubmitted = false;
  reviewResponse: ReviewResponse | null = null;

  constructor(private api: ApiService) {
    this.loadRecentDocs();
  }

  loadRecentDocs(): void {
    this.api.getRecentClassifications().subscribe({
      next: (docs) => this.recentDocs = docs,
      error: () => {}
    });
  }

  loadDocument(docId: string): void {
    this.loading = true;
    this.error = '';
    this.result = null;
    this.resetReview();

    this.api.getClassification(docId).subscribe({
      next: (result) => {
        this.result = result;
        this.reviewVerdict = result.verdict.toLowerCase();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error || `No classification found for ${docId}`;
        this.loading = false;
      }
    });
  }

  selectReviewVerdict(verdict: string): void {
    this.reviewVerdict = verdict;
  }

  isOverride(): boolean {
    return !!this.result && !!this.reviewVerdict &&
      this.reviewVerdict.toLowerCase() !== this.result.verdict.toLowerCase();
  }

  submitReview(): void {
    if (!this.result || !this.reviewVerdict) return;

    const missedPolicies = this.reviewMissedPolicies
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    this.api.submitReview({
      docId: this.result.docId,
      humanVerdict: this.reviewVerdict,
      humanRationale: this.reviewRationale || undefined,
      missedPolicyIds: missedPolicies.length > 0 ? missedPolicies : undefined
    }).subscribe({
      next: (response) => {
        this.reviewResponse = response;
        this.reviewSubmitted = true;
      },
      error: (err) => {
        this.error = err.error || 'Failed to submit review';
      }
    });
  }

  resetReview(): void {
    this.reviewVerdict = '';
    this.reviewRationale = '';
    this.reviewMissedPolicies = '';
    this.reviewSubmitted = false;
    this.reviewResponse = null;
  }

  getVerdictClass(): string {
    if (!this.result) return '';
    switch (this.result.verdict.toLowerCase()) {
      case 'allow': return 'verdict-allow';
      case 'flag': return 'verdict-flag';
      case 'block': return 'verdict-block';
      default: return '';
    }
  }
}
