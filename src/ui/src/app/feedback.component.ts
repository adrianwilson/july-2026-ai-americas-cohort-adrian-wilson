import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, FeedbackSummary, EvalRun, EvalComparison, PolicyEntry } from './api.service';

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
  error = '';

  // Policies
  policies: PolicyEntry[] = [];
  togglingPolicy = '';

  // Eval
  runs: EvalRun[] = [];
  selectedRun: EvalRun | null = null;
  comparison: EvalComparison | null = null;
  evalRunning = false;
  comparing = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadPolicies();
    this.loadSummary();
    this.loadHistory();
  }

  loadPolicies(): void {
    this.api.getPolicies().subscribe({
      next: (policies) => this.policies = policies,
      error: () => {}
    });
  }

  togglePolicy(chunkId: string): void {
    this.togglingPolicy = chunkId;
    this.api.togglePolicy(chunkId).subscribe({
      next: (result) => {
        const policy = this.policies.find(p => p.chunkId === result.chunkId);
        if (policy) policy.enabled = result.enabled;
        this.togglingPolicy = '';
      },
      error: () => this.togglingPolicy = ''
    });
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
      error: (err: any) => this.error = err.error || 'Failed to promote override'
    });
  }

  // Eval methods
  loadHistory(): void {
    this.api.getEvalHistory().subscribe({
      next: (runs) => this.runs = runs,
      error: () => this.runs = []
    });
  }

  clearEvalHistory(): void {
    this.api.clearEvalHistory().subscribe({
      next: () => {
        this.runs = [];
        this.selectedRun = null;
        this.comparison = null;
      },
      error: () => {}
    });
  }

  runEval(): void {
    this.evalRunning = true;
    this.error = '';
    this.api.runEval().subscribe({
      next: (run) => {
        this.evalRunning = false;
        this.loadHistory();
        this.selectedRun = run;
        this.comparison = null;
      },
      error: (err: any) => {
        this.evalRunning = false;
        this.error = err.message || 'Eval failed';
      }
    });
  }

  selectRun(run: EvalRun): void {
    this.selectedRun = run;
    this.comparison = null;
  }

  compareWithPrevious(run: EvalRun): void {
    const idx = this.runs.indexOf(run);
    if (idx < 0 || idx >= this.runs.length - 1) return;

    const previous = this.runs[idx + 1];
    this.comparing = true;
    this.api.compareEvals(previous.runId, run.runId).subscribe({
      next: (comp) => {
        this.comparison = comp;
        this.comparing = false;
        this.selectedRun = null;
      },
      error: () => this.comparing = false
    });
  }
}
