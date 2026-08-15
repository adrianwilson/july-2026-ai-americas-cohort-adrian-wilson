import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

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
