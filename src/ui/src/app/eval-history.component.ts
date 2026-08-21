import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, EvalRun, EvalComparison } from './api.service';

@Component({
  selector: 'app-eval-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eval-history.component.html',
  styleUrl: './eval-history.component.scss'
})
export class EvalHistoryComponent implements OnInit {
  runs: EvalRun[] = [];
  comparison: EvalComparison | null = null;
  selectedRun: EvalRun | null = null;
  running = false;
  comparing = false;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.api.getEvalHistory().subscribe({
      next: (runs) => this.runs = runs,
      error: () => this.runs = []
    });
  }

  runEval(): void {
    this.running = true;
    this.error = '';
    this.api.runEval().subscribe({
      next: (run) => {
        this.running = false;
        this.loadHistory();
        this.selectedRun = run;
      },
      error: (err) => {
        this.running = false;
        this.error = err.message || 'Eval failed';
      }
    });
  }

  selectRun(run: EvalRun): void {
    this.selectedRun = run;
    this.comparison = null;
  }

  clearHistory(): void {
    this.api.clearEvalHistory().subscribe({
      next: () => {
        this.runs = [];
        this.selectedRun = null;
        this.comparison = null;
      },
      error: () => {}
    });
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
