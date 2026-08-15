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
      text,
      docId: docId || undefined
    });
  }

  mask(text: string): Observable<MaskResponse> {
    return this.http.post<MaskResponse>(`${this.baseUrl}/api/mask`, { text });
  }
}
