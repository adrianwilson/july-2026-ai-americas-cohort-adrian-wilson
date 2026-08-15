import { Component } from '@angular/core';
import { ClassifyComponent } from './classify.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ClassifyComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
