import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface ClassifyResponse {
  docId: string;
  verdict: string;
  confidence: number;
  rationale: string;
  policyCitations: string[];
  maskedText: string;
  originalText: string;
  piiDetected: string[];
  piiCount: number;
  agentSteps: AgentStep[];
}

export interface AgentStep {
  stepNumber: number;
  toolName: string;
  input: string;
  output: string;
}

export interface MaskResponse {
  maskedText: string;
  piiDetected: string[];
  piiCount: number;
}

export interface StreamEvent {
  type: string;
  data?: any;
}

export interface EvalRun {
  runId: string;
  timestamp: string;
  total: number;
  correct: number;
  accuracy: number;
  results: EvalDocResult[];
}

export interface EvalDocResult {
  docId: string;
  summary: string;
  expected: string;
  actual: string;
  confidence: number;
  pass: boolean;
  rationale: string;
  isAdversarial: boolean;
}

export interface EvalComparison {
  run1: { runId: string; timestamp: string; accuracy: number; total: number; correct: number };
  run2: { runId: string; timestamp: string; accuracy: number; total: number; correct: number };
  improved: number;
  regressed: number;
  unchanged: number;
  docs: EvalComparisonDoc[];
}

export interface EvalComparisonDoc {
  docId: string;
  summary: string;
  expected: string;
  run1Actual: string;
  run1Pass: boolean;
  run2Actual: string;
  run2Pass: boolean;
  flipped: boolean;
  improved: boolean;
  regressed: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  classifyStream(text: string, docId?: string): Subject<StreamEvent> {
    const subject = new Subject<StreamEvent>();

    fetch(`${this.baseUrl}/api/classify/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, docId: docId || undefined })
    }).then(response => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): void => {
        reader.read().then(({ done, value }) => {
          if (done) {
            subject.complete();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.substring(6)) as StreamEvent;
                subject.next(event);
              } catch { /* skip malformed */ }
            }
          }
          read();
        });
      };
      read();
    }).catch(err => subject.error(err));

    return subject;
  }

  classify(text: string, docId?: string): Observable<ClassifyResponse> {
    return this.http.post<ClassifyResponse>(`${this.baseUrl}/api/classify`, {
      text, docId: docId || undefined
    });
  }

  mask(text: string): Observable<MaskResponse> {
    return this.http.post<MaskResponse>(`${this.baseUrl}/api/mask`, { text });
  }

  runEval(): Observable<EvalRun> {
    return this.http.get<EvalRun>(`${this.baseUrl}/api/eval`);
  }

  getEvalHistory(): Observable<EvalRun[]> {
    return this.http.get<EvalRun[]>(`${this.baseUrl}/api/eval/history`);
  }

  compareEvals(run1: string, run2: string): Observable<EvalComparison> {
    return this.http.get<EvalComparison>(
      `${this.baseUrl}/api/eval/compare?run1=${run1}&run2=${run2}`);
  }

  submitReview(request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(`${this.baseUrl}/api/review`, request);
  }

  getRecentClassifications(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/api/classify/recent`);
  }

  getClassification(docId: string): Observable<ClassifyResponse> {
    return this.http.get<ClassifyResponse>(`${this.baseUrl}/api/classify/${encodeURIComponent(docId)}`);
  }

  getFeedbackSummary(): Observable<FeedbackSummary> {
    return this.http.get<FeedbackSummary>(`${this.baseUrl}/api/feedback/summary`);
  }

  promoteToGold(docId: string): Observable<{ promoted: boolean; docId: string }> {
    return this.http.post<{ promoted: boolean; docId: string }>(
      `${this.baseUrl}/api/feedback/promote/${encodeURIComponent(docId)}`, {});
  }
}

export interface ReviewRequest {
  docId: string;
  humanVerdict: string;
  humanRationale?: string;
  missedPolicyIds?: string[];
}

export interface ReviewResponse {
  recorded: boolean;
  agreement: boolean;
  agentVerdict: string;
  humanVerdict: string;
  direction: string;
}

export interface FeedbackSummary {
  totalReviews: number;
  agreements: number;
  overrides: number;
  agreementRate: number;
  overridesByDirection: Record<string, number>;
  missedPolicyCounts: Record<string, number>;
  recentOverrides: FeedbackOverride[];
}

export interface FeedbackOverride {
  docId: string;
  timestamp: string;
  agentVerdict: string;
  agentRationale: string;
  agentCitations: string[];
  humanVerdict: string;
  humanRationale: string | null;
  missedPolicyIds: string[];
  promotedToGold: boolean;
}

export type EvalResult = EvalRun;
