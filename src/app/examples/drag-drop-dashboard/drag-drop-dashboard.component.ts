import { ChangeDetectionStrategy, Component, HostBinding, signal, computed, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { SplitAreaComponent, SplitComponent, SplitGutterDirective } from 'angular-split'
import { AComponent } from '../../ui/components/AComponent'

interface Panel {
  id: string
  title: string
  subtitle?: string
  type: 'chart-line' | 'chart-bar' | 'metric' | 'table' | 'list'
  size?: number
  minSize?: number
  maxSize?: number
  data?: Record<string, unknown>
  icon?: string
}

interface DashboardRow {
  id: string
  panels: Panel[]
  height: number
  minHeight?: number
  maxHeight?: number
}

interface DragState {
  isDragging: boolean
  draggedPanel: Panel | null
  draggedFromRow: string | null
  draggedFromIndex: number
  dropZoneActive: string | null
}

@Component({
  selector: 'sp-ex-drag-drop-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, SplitAreaComponent, SplitComponent, SplitGutterDirective],
  styles: [
    `
      :host {
        display: block;
        background: #1a1a1a;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .dashboard-container {
        display: flex;
        flex-direction: column;
      }

      .dashboard-header {
        background: #0f0f0f;
        padding: 16px 24px;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .dashboard-title {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
        margin: 0;
      }

      .header-controls {
        display: flex;
        gap: 12px;
      }

      .btn {
        padding: 6px 12px;
        border: 1px solid #3a3a3a;
        background: #1a1a1a;
        color: #aaaaaa;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn:hover {
        background: #2a2a2a;
        color: #ffffff;
        border-color: #4a4a4a;
      }

      .btn-primary {
        background: #5e42f0;
        border-color: #5e42f0;
        color: #ffffff;
      }

      .btn-primary:hover {
        background: #7050ff;
        border-color: #7050ff;
      }

      .dashboard-body {
        background: #1a1a1a;
        overflow: visible;
        min-height: calc(100vh - 80px);
      }

      .dashboard-content {
        padding: 20px;
        position: relative;
      }

      /* Allow as-split components to expand naturally without breaking grid */
      as-split {
        overflow: visible;
      }

      /* Ensure the main vertical split respects natural content height */
      as-split[direction='vertical'] {
        height: auto;
      }

      .panel {
        height: 100%;
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.2s;
        position: relative;
      }

      .panel.dragging {
        opacity: 0.5;
        transform: rotate(2deg);
        z-index: 1000;
      }

      .panel.drag-over {
        border-color: #5e42f0;
        box-shadow: 0 0 0 2px rgba(94, 66, 240, 0.3);
      }

      .panel-header {
        padding: 12px 16px;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        align-items: flex-start;
        background: #0a0a0a;
        position: relative;
      }

      .drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-right: 12px;
        cursor: grab;
        color: #6a6a6a;
        border-radius: 4px;
        transition: all 0.2s;
        font-size: 12px;
      }

      .drag-handle:hover {
        background: #2a2a2a;
        color: #aaaaaa;
      }

      .drag-handle:active,
      .drag-handle.dragging {
        cursor: grabbing;
        background: #5e42f0;
        color: #ffffff;
      }

      .panel-title-group {
        flex: 1;
      }

      .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
      }

      .panel-subtitle {
        font-size: 12px;
        color: #8a8a8a;
        margin: 0;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
      }

      .panel-action {
        background: transparent;
        border: none;
        color: #6a6a6a;
        padding: 4px;
        cursor: pointer;
        transition: color 0.2s;
        font-size: 16px;
      }

      .panel-action:hover {
        color: #aaaaaa;
      }

      .panel-body {
        flex: 1;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .panel-content {
        width: 100%;
      }

      /* Drop zones */
      .drop-zone {
        position: absolute;
        background: rgba(94, 66, 240, 0.1);
        border: 2px dashed #5e42f0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #5e42f0;
        font-size: 14px;
        font-weight: 600;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        z-index: 999;
      }

      .drop-zone.active {
        opacity: 1;
      }

      .drop-zone-row {
        left: 0;
        right: 0;
        height: 60px;
      }

      .drop-zone-column {
        top: 0;
        bottom: 0;
        width: 60px;
      }

      .drop-zone-new-row-above {
        top: -30px;
      }

      .drop-zone-new-row-below {
        bottom: -30px;
      }

      .drop-zone-new-column-left {
        left: -30px;
      }

      .drop-zone-new-column-right {
        right: -30px;
      }

      /* Single-panel drop zones */
      .drop-zone-column.single-panel {
        width: 80px;
        background: rgba(94, 66, 240, 0.15);
        border: 2px dashed rgba(94, 66, 240, 0.6);
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .drop-zone-column.single-panel.active {
        background: rgba(94, 66, 240, 0.25);
        border-color: #5e42f0;
        border-style: solid;
        animation: single-panel-pulse 2s infinite;
      }

      @keyframes single-panel-pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(94, 66, 240, 0.4);
        }
        50% {
          box-shadow: 0 0 0 4px rgba(94, 66, 240, 0.2);
        }
      }

      .drop-zone-hint {
        color: #5e42f0;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
        white-space: nowrap;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        opacity: 0.8;
        transition: opacity 0.3s ease;
      }

      .drop-zone-column.single-panel.active .drop-zone-hint {
        opacity: 1;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      /* Drag ghost */
      .drag-ghost {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        opacity: 0.8;
        transform: rotate(5deg);
        max-width: 300px;
        max-height: 200px;
        overflow: hidden;
      }

      /* Chart and content styles */
      .metric-value {
        font-size: 32px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .metric-label {
        font-size: 13px;
        color: #8a8a8a;
      }

      .chart-container {
        width: 100%;
        height: 200px;
        position: relative;
      }

      .chart-line {
        width: 100%;
        height: 100%;
        background: #0a0a0a;
        border-radius: 4px;
        padding: 10px;
      }

      .chart-line-path {
        stroke: #6e4ff0;
        stroke-width: 2;
        fill: none;
      }

      .chart-line-area {
        fill: url(#gradient);
        opacity: 0.3;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
      }

      .data-table th {
        text-align: left;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        color: #8a8a8a;
        border-bottom: 1px solid #2a2a2a;
      }

      .data-table td {
        padding: 10px 12px;
        font-size: 13px;
        color: #ffffff;
        border-bottom: 1px solid #1a1a1a;
      }

      .list-item {
        padding: 12px 0;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .list-item-name {
        font-size: 13px;
        color: #ffffff;
      }

      .list-item-value {
        font-size: 13px;
        color: #8a8a8a;
      }

      .empty-row {
        height: 200px;
        border: 2px dashed #2a2a2a;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6a6a6a;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .empty-row:hover {
        border-color: #4a4a4a;
        background: #0f0f0f;
        color: #aaaaaa;
      }

      /* Custom gutter styles */
      .custom-gutter {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: #0f0f0f; /* Same as panel background */
        cursor: row-resize;
        transition: all 0.3s ease;
      }

      .custom-gutter.horizontal {
        cursor: col-resize;
      }

      /* Transform gutter when panel dragging starts */
      .custom-gutter.panel-dragging {
        cursor: pointer;
        z-index: 100;
      }

      .custom-gutter.panel-dragging.drop-active {
        background: rgba(94, 66, 240, 0.2);
        backdrop-filter: blur(2px);
        animation: gutter-pulse 2s infinite;
      }

      @keyframes gutter-pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(94, 66, 240, 0.7);
          background: rgba(94, 66, 240, 0.2);
        }
        50% {
          box-shadow: 0 0 0 4px rgba(94, 66, 240, 0.3);
          background: rgba(94, 66, 240, 0.35);
        }
      }

      /* Vertical gutter drop zone styling */
      .custom-gutter.vertical.panel-dragging::before {
        border-left: 3px solid rgba(94, 66, 240, 0.6);
        border-right: 3px solid rgba(94, 66, 240, 0.6);
      }

      .custom-gutter.vertical.drop-active::before {
        border-left: 4px solid #5e42f0;
        border-right: 4px solid #5e42f0;
        background: linear-gradient(90deg, #5e42f0, #7c5eff);
      }

      /* Horizontal gutter drop zone styling */
      .custom-gutter.horizontal.panel-dragging::before {
        border-top: 3px solid rgba(94, 66, 240, 0.6);
        border-bottom: 3px solid rgba(94, 66, 240, 0.6);
      }

      .custom-gutter.horizontal.drop-active::before {
        border-top: 4px solid #5e42f0;
        border-bottom: 4px solid #5e42f0;
        background: linear-gradient(180deg, #5e42f0, #7c5eff);
      }

      /* Drop hint text */
      .gutter-drop-hint {
        position: absolute;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        white-space: nowrap;
        padding: 4px 8px;
        background: linear-gradient(135deg, #5e42f0, #7c5eff);
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 2px 8px rgba(94, 66, 240, 0.5);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        animation: hint-fade-in 0.3s ease-out;
        z-index: 101;
      }

      .custom-gutter.vertical .gutter-drop-hint {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .custom-gutter.horizontal .gutter-drop-hint {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-90deg);
        font-size: 11px;
      }

      @keyframes hint-fade-in {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      .custom-gutter.horizontal .gutter-drop-hint {
        animation: hint-fade-in-rotate 0.3s ease-out;
      }

      @keyframes hint-fade-in-rotate {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) rotate(-90deg) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) rotate(-90deg) scale(1);
        }
      }

      .custom-gutter::before {
        content: '';
        position: absolute;
        background: transparent;
        transition: all 0.3s ease;
      }

      .custom-gutter:hover::before {
        background: rgba(42, 42, 42, 0.8);
      }

      .custom-gutter.dragging::before {
        background: rgba(94, 66, 240, 0.6);
      }

      .custom-gutter.horizontal::before {
        width: 1px;
        height: 100%;
        left: 50%;
        transform: translateX(-50%);
      }

      .custom-gutter.vertical::before {
        width: 100%;
        height: 1px;
        top: 50%;
        transform: translateY(-50%);
      }

      .gutter-handle {
        position: relative;
        background: transparent;
        border-radius: 4px;
        transition: all 0.3s ease;
        z-index: 1;
        opacity: 0;
      }

      .custom-gutter.horizontal .gutter-handle {
        width: 4px;
        height: 30px;
      }

      .custom-gutter.vertical .gutter-handle {
        width: 30px;
        height: 4px;
      }

      .custom-gutter:hover .gutter-handle {
        background: #5e42f0;
        opacity: 1;
      }

      .custom-gutter.dragging .gutter-handle {
        background: #7c5eff;
        opacity: 1;
      }

      .info-banner {
        background: #2a2a3a;
        border: 1px solid #4a4a5a;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        color: #cccccc;
      }

      .info-banner h4 {
        margin: 0 0 8px 0;
        color: #ffffff;
      }

      .info-banner ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }

      .info-banner li {
        margin-bottom: 4px;
      }

      /* Empty split area for adding new rows */
      .empty-split-area {
        height: 100%;
        min-height: 120px;
        background: #0a0a0a;
        border: 2px dashed #2a2a2a;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .empty-split-area p {
        margin: 0;
        color: #6a6a6a;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 1px;
        pointer-events: none;
      }

      .empty-split-area::before {
        content: '+';
        position: absolute;
        font-size: 32px;
        color: #4a4a4a;
        font-weight: 300;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin-top: -20px;
      }

      .empty-split-area.drag-over {
        background: rgba(94, 66, 240, 0.1);
        border-color: #5e42f0;
        border-style: solid;
      }

      .empty-split-area.drag-over p {
        color: #ffffff;
      }

      .empty-split-area.drag-over::before {
        color: #5e42f0;
        animation: pulse-icon 1.5s infinite;
      }

      @keyframes pulse-icon {
        0%,
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 0.7;
        }
      }
    `,
  ],
  template: `
    {{ testChangeDetectorRun() }}
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1 class="dashboard-title">🎯 Drag & Drop Dashboard</h1>
        <div class="header-controls">
          <button class="btn" (click)="loadPreset('analytics')">📊 Analytics</button>
          <button class="btn" (click)="loadPreset('sales')">💰 Sales</button>
          <button class="btn" (click)="addRow()">➕ Add Row</button>
          <button class="btn btn-primary" (click)="resetDashboard()">🔄 Reset</button>
        </div>
      </div>

      <div class="dashboard-body">
        <div class="dashboard-content">
          <div class="info-banner">
            <h4>✨ Interactive Drag & Drop Dashboard</h4>
            <ul>
              <li>Grab the ⋮⋮ handle on any panel to start dragging</li>
              <li>Drop panels to reorder within rows or create new rows</li>
              <li>Resize panels by dragging the gutters between them</li>
              <li>Panels automatically snap to optimal sizes</li>
            </ul>
          </div>

          @if (rows().length === 0) {
            <div class="empty-row" (click)="addRow()">
              🎯 Click to create your first dashboard row
            </div>
          } @else {
            <as-split
              direction="vertical"
              unit="pixel"
              [variableHeight]="true"
              [gutterSize]="8"
            >
              <!-- Custom gutter template for vertical splits -->
              <ng-template asSplitGutter let-gutterNum="gutterNum" let-isDragged="isDragged">
                <div class="custom-gutter vertical" 
                     [class.dragging]="isDragged"
                     [class.panel-dragging]="dragState().isDragging"
                     [class.drop-active]="dragState().dropZoneActive === 'gutter-vertical-' + gutterNum"
                     (dragover)="dragState().isDragging ? onDragOver($event, 'gutter-vertical-' + gutterNum) : null"
                     (dragleave)="dragState().isDragging ? onDragLeave($event) : null"
                     (drop)="dragState().isDragging ? onDropOnGutter($event, 'vertical', gutterNum) : null">
                  <div class="gutter-handle"></div>
                  @if (dragState().isDragging && dragState().dropZoneActive === 'gutter-vertical-' + gutterNum) {
                    <div class="gutter-drop-hint">Drop to create new row</div>
                  }
                </div>
              </ng-template>

              @for (row of rows(); track row.id; let rowIndex = $index) {
                <as-split-area 
                  [size]="row.height" 
                  [minSize]="row.minHeight" 
                  [maxSize]="row.maxHeight"
                >
                  <div class="dashboard-row" style="height: 100%; position: relative;">
                    <!-- Drop zones for this row -->
                    @if (dragState().isDragging) {
                      <div class="drop-zone drop-zone-row drop-zone-new-row-above" 
                           [class.active]="dragState().dropZoneActive === 'row-above-' + rowIndex"
                           (dragover)="onDragOver($event, 'row-above-' + rowIndex)"
                           (dragleave)="onDragLeave($event)"
                           (drop)="onDrop($event, 'row-above-' + rowIndex)">
                        Drop to create new row above
                      </div>
                      
                      <div class="drop-zone drop-zone-row drop-zone-new-row-below" 
                           [class.active]="dragState().dropZoneActive === 'row-below-' + rowIndex"
                           (dragover)="onDragOver($event, 'row-below-' + rowIndex)"
                           (dragleave)="onDragLeave($event)"
                           (drop)="onDrop($event, 'row-below-' + rowIndex)">
                        Drop to create new row below
                      </div>
                    }

                    @if (row.panels.length === 0) {
                      <div class="empty-row" (click)="addPanelToRow(row.id)">
                        ➕ Add panel to this row
                      </div>
                    } @else {
                      <as-split
                        direction="horizontal"
                        unit="percent"
                        [gutterSize]="8"
                        style="height: 100%"
                      >
                        <!-- Custom gutter template for horizontal splits -->
                        <ng-template asSplitGutter let-gutterNum="gutterNum" let-isDragged="isDragged">
                          <div class="custom-gutter horizontal" 
                               [class.dragging]="isDragged"
                               [class.panel-dragging]="dragState().isDragging"
                               [class.drop-active]="dragState().dropZoneActive === 'gutter-horizontal-' + gutterNum + '-' + row.id"
                               (dragover)="dragState().isDragging ? onDragOver($event, 'gutter-horizontal-' + gutterNum + '-' + row.id) : null"
                               (dragleave)="dragState().isDragging ? onDragLeave($event) : null"
                               (drop)="dragState().isDragging ? onDropOnGutter($event, 'horizontal', gutterNum, row.id) : null">
                            <div class="gutter-handle"></div>
                            @if (dragState().isDragging && dragState().dropZoneActive === 'gutter-horizontal-' + gutterNum + '-' + row.id) {
                              <div class="gutter-drop-hint">Drop to insert column</div>
                            }
                          </div>
                        </ng-template>

                        @for (panel of row.panels; track panel.id; let panelIndex = $index) {
                          <as-split-area 
                            [size]="panel.size" 
                            [minSize]="panel.minSize" 
                            [maxSize]="panel.maxSize"
                          >
                            <div class="panel" 
                                 [class.dragging]="dragState().draggedPanel?.id === panel.id"
                                 style="position: relative;">
                              
                              <!-- Drop zones around this panel -->
                              @if (dragState().isDragging && (dragState().draggedPanel?.id !== panel.id || row.panels.length === 1)) {
                                <div class="drop-zone drop-zone-column drop-zone-new-column-left" 
                                     [class.active]="dragState().dropZoneActive === 'column-left-' + panel.id"
                                     [class.single-panel]="row.panels.length === 1"
                                     (dragover)="onDragOver($event, 'column-left-' + panel.id)"
                                     (dragleave)="onDragLeave($event)"
                                     (drop)="onDrop($event, 'column-left-' + panel.id, row.id, panelIndex)">
                                  @if (row.panels.length === 1) {
                                    <div class="drop-zone-hint">Drop here to add column</div>
                                  } @else {
                                    ⬅️
                                  }
                                </div>
                                
                                <div class="drop-zone drop-zone-column drop-zone-new-column-right" 
                                     [class.active]="dragState().dropZoneActive === 'column-right-' + panel.id"
                                     [class.single-panel]="row.panels.length === 1"
                                     (dragover)="onDragOver($event, 'column-right-' + panel.id)"
                                     (dragleave)="onDragLeave($event)"
                                     (drop)="onDrop($event, 'column-right-' + panel.id, row.id, panelIndex + 1)">
                                  @if (row.panels.length === 1) {
                                    <div class="drop-zone-hint">Drop here to add column</div>
                                  } @else {
                                    ➡️
                                  }
                                </div>
                              }

                              <div class="panel-header">
                                <!-- Drag Handle -->
                                <div class="drag-handle" 
                                     [class.dragging]="dragState().draggedPanel?.id === panel.id"
                                     draggable="true"
                                     (dragstart)="onDragStart($event, panel, row.id, panelIndex)"
                                     (dragend)="onDragEnd($event)">
                                  ⋮⋮
                                </div>

                                <div class="panel-title-group">
                                  <h3 class="panel-title">
                                    @if (panel.icon) {
                                      <span style="margin-right: 8px;">{{ panel.icon }}</span>
                                    }
                                    {{ panel.title }}
                                  </h3>
                                  @if (panel.subtitle) {
                                    <p class="panel-subtitle">{{ panel.subtitle }}</p>
                                  }
                                </div>

                                <div class="panel-actions">
                                  <button class="panel-action" (click)="addPanelToRow(row.id)">➕</button>
                                  <button class="panel-action" (click)="removePanel(row.id, panel.id)">✕</button>
                                </div>
                              </div>

                              <div class="panel-body">
                                <div class="panel-content">
                                  @switch (panel.type) {
                                    @case ('metric') {
                                      <div>
                                        <div class="metric-value">{{ (panel.data as { value?: string })?.value || '0' }}</div>
                                        <div class="metric-label">{{ (panel.data as { label?: string })?.label || 'Metric' }}</div>
                                      </div>
                                    }
                                    @case ('chart-line') {
                                      <div class="chart-container">
                                        <svg class="chart-line" viewBox="0 0 400 200">
                                          <defs>
                                            <linearGradient id="gradient{{ panel.id }}" x1="0%" y1="0%" x2="0%" y2="100%">
                                              <stop offset="0%" style="stop-color:#6e4ff0;stop-opacity:0.3" />
                                              <stop offset="100%" style="stop-color:#6e4ff0;stop-opacity:0" />
                                            </linearGradient>
                                          </defs>
                                          <path class="chart-line-area" d="M 20 150 L 80 120 L 140 130 L 200 100 L 260 110 L 320 90 L 380 95 L 380 180 L 20 180 Z" [attr.fill]="'url(#gradient' + panel.id + ')'" />
                                          <path class="chart-line-path" d="M 20 150 L 80 120 L 140 130 L 200 100 L 260 110 L 320 90 L 380 95" />
                                        </svg>
                                      </div>
                                    }
                                    @case ('table') {
                                      <div style="max-height: 200px; overflow: auto;">
                                        <table class="data-table">
                                          <thead>
                                            <tr>
                                              @for (header of (panel.data as { headers?: string[] })?.headers || []; track $index) {
                                                <th>{{ header }}</th>
                                              }
                                            </tr>
                                          </thead>
                                          <tbody>
                                            @for (row of (panel.data as { rows?: string[][] })?.rows || []; track $index) {
                                              <tr>
                                                @for (cell of row; track $index) {
                                                  <td>{{ cell }}</td>
                                                }
                                              </tr>
                                            }
                                          </tbody>
                                        </table>
                                      </div>
                                    }
                                    @case ('list') {
                                      <div>
                                        @for (item of (panel.data as { items?: Array<{ name: string; value: string }> })?.items || []; track $index) {
                                          <div class="list-item">
                                            <span class="list-item-name">{{ item.name }}</span>
                                            <span class="list-item-value">{{ item.value }}</span>
                                          </div>
                                        }
                                      </div>
                                    }
                                  }
                                </div>
                              </div>
                            </div>
                          </as-split-area>
                        }
                      </as-split>
                    }
                  </div>
                </as-split-area>
              }
              <!-- always show a empty split area -->
              <as-split-area [size]="120" [minSize]="120" [maxSize]="120">
                <div class="empty-split-area"
                     [class.drag-over]="dragState().dropZoneActive === 'empty-split-area'"
                     (dragover)="onDragOver($event, 'empty-split-area')"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onDropOnEmptySplitArea($event)">
                  <p>Drop panels here</p>
                </div>
              </as-split-area>
            </as-split>
          }
        </div>
      </div>
    </div>
  `,
})
export class DragDropDashboardComponent extends AComponent implements OnInit {
  @HostBinding('class') class = 'drag-drop-dashboard-page'

  rows = signal<DashboardRow[]>([])
  dragState = signal<DragState>({
    isDragging: false,
    draggedPanel: null,
    draggedFromRow: null,
    draggedFromIndex: -1,
    dropZoneActive: null,
  })

  // Computed total height for reference (not used for explicit height binding)
  // The split component now uses variableHeight="true" to size naturally
  totalDashboardHeight = computed(() => {
    const currentRows = this.rows()
    if (currentRows.length === 0) {
      // Just empty-split-area + minimal padding
      return 160 // 120 (empty area) + 40 (padding and spacing)
    }

    const totalRowHeight = currentRows.reduce((sum: number, row: DashboardRow) => sum + row.height, 0)
    const gutterHeight = currentRows.length * 8 // gutters between rows + gutter before empty area
    const emptySplitAreaHeight = 120 // Fixed height for empty-split-area

    return totalRowHeight + gutterHeight + emptySplitAreaHeight
  })

  private rowCounter = 0
  private panelCounter = 0

  ngOnInit() {
    this.loadPreset('analytics')
  }

  // Drag and Drop Methods
  onDragStart(event: DragEvent, panel: Panel, rowId: string, panelIndex: number) {
    console.log('Drag start:', panel.title)

    this.dragState.set({
      isDragging: true,
      draggedPanel: panel,
      draggedFromRow: rowId,
      draggedFromIndex: panelIndex,
      dropZoneActive: null,
    })

    // Set drag effect
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', panel.id)
    }
  }

  onDragOver(event: DragEvent, dropZoneId: string) {
    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }

    this.dragState.update((state: DragState) => ({
      ...state,
      dropZoneActive: dropZoneId,
    }))
  }

  onDragLeave(event: DragEvent) {
    // Only clear if we're truly leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.dragState.update((state: DragState) => ({
        ...state,
        dropZoneActive: null,
      }))
    }
  }

  onDrop(event: DragEvent, dropZoneId: string, targetRowId?: string, targetIndex?: number) {
    event.preventDefault()
    event.stopPropagation()

    console.log('Drop on:', dropZoneId, targetRowId, targetIndex)

    const draggedPanel = this.dragState().draggedPanel
    const draggedFromRow = this.dragState().draggedFromRow
    // const draggedFromIndex = this.dragState().draggedFromIndex

    if (!draggedPanel || !draggedFromRow) return

    // Handle different drop zones
    if (dropZoneId.startsWith('row-above-')) {
      // Remove panel from original position
      this.removePanelFromRow(draggedFromRow, draggedPanel.id)
      const targetRowIndex = parseInt(dropZoneId.replace('row-above-', ''))
      this.insertRowAt(targetRowIndex, draggedPanel)
    } else if (dropZoneId.startsWith('row-below-')) {
      // Remove panel from original position
      this.removePanelFromRow(draggedFromRow, draggedPanel.id)
      const targetRowIndex = parseInt(dropZoneId.replace('row-below-', ''))
      this.insertRowAt(targetRowIndex + 1, draggedPanel)
    } else if (dropZoneId.startsWith('column-left-') || dropZoneId.startsWith('column-right-')) {
      if (targetRowId && typeof targetIndex === 'number') {
        // Special case: dropping within the same single-panel row to create columns
        if (draggedFromRow === targetRowId) {
          const currentRows = this.rows()
          const sourceRow = currentRows.find((r: DashboardRow) => r.id === draggedFromRow)
          if (sourceRow && sourceRow.panels.length === 1) {
            // For single-panel rows, we duplicate the panel to create a column layout
            const duplicatedPanel: Panel = {
              ...draggedPanel,
              id: `panel-${++this.panelCounter}`,
              size: 50, // Split evenly
            }
            this.insertPanelInRow(targetRowId, duplicatedPanel, targetIndex)

            // Update original panel size
            this.rows.update((rows: DashboardRow[]) => {
              return rows.map((row) => {
                if (row.id === targetRowId) {
                  return {
                    ...row,
                    panels: row.panels.map((p) => ({ ...p, size: 50 })),
                  }
                }
                return row
              })
            })
          } else {
            // Normal case: move between different positions
            this.removePanelFromRow(draggedFromRow, draggedPanel.id)
            this.insertPanelInRow(targetRowId, draggedPanel, targetIndex)
          }
        } else {
          // Normal case: move between different rows
          this.removePanelFromRow(draggedFromRow, draggedPanel.id)
          this.insertPanelInRow(targetRowId, draggedPanel, targetIndex)
        }

        // Recalculate heights in case the panel move affects layout
        this.rows.update((rows: DashboardRow[]) => {
          this.redistributeRowHeights(rows)
          return rows
        })
      }
    }

    this.onDragEnd()
  }

  onDropOnGutter(event: DragEvent, direction: 'vertical' | 'horizontal', gutterIndex: number, rowId?: string) {
    event.preventDefault()
    event.stopPropagation()

    console.log('Drop on gutter:', direction, gutterIndex, rowId)

    const draggedPanel = this.dragState().draggedPanel
    const draggedFromRow = this.dragState().draggedFromRow

    if (!draggedPanel || !draggedFromRow) return

    // Remove panel from original position
    this.removePanelFromRow(draggedFromRow, draggedPanel.id)

    if (direction === 'vertical') {
      // Create new row at the gutter position
      // For vertical gutters, gutterIndex represents the position between rows
      this.insertRowAt(gutterIndex, draggedPanel)
    } else {
      // For horizontal gutters (within a row), insert panel at gutter position
      if (rowId) {
        this.insertPanelInRow(rowId, draggedPanel, gutterIndex)
      } else {
        const currentRows = this.rows()
        if (currentRows.length > 0) {
          const firstRowId = currentRows[0].id
          this.insertPanelInRow(firstRowId, draggedPanel, gutterIndex)
        }
      }
    }

    this.onDragEnd()
  }

  onDropOnEmptySplitArea(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    console.log('Drop on empty split area')

    const draggedPanel = this.dragState().draggedPanel
    const draggedFromRow = this.dragState().draggedFromRow

    if (!draggedPanel || !draggedFromRow) return

    // Remove panel from original position
    this.removePanelFromRow(draggedFromRow, draggedPanel.id)

    // Create new row at the end with the dropped panel
    const newRow: DashboardRow = {
      id: `row-${++this.rowCounter}`,
      panels: [draggedPanel],
      height: 280,
      minHeight: 150,
      maxHeight: 450,
    }

    this.rows.update((rows: DashboardRow[]) => {
      const newRows = [...rows, newRow]
      this.redistributeRowHeights(newRows)
      return newRows
    })

    this.onDragEnd()
  }

  onDragEnd() {
    console.log('Drag end')

    this.dragState.set({
      isDragging: false,
      draggedPanel: null,
      draggedFromRow: null,
      draggedFromIndex: -1,
      dropZoneActive: null,
    })
  }

  // Panel Management Methods
  addRow() {
    const newRow: DashboardRow = {
      id: `row-${++this.rowCounter}`,
      panels: [],
      height: 300,
      minHeight: 200,
      maxHeight: 600,
    }
    this.rows.update((rows: DashboardRow[]) => {
      const newRows = [...rows, newRow]
      this.redistributeRowHeights(newRows)
      return newRows
    })
  }

  insertRowAt(index: number, panel?: Panel) {
    const newRow: DashboardRow = {
      id: `row-${++this.rowCounter}`,
      panels: panel ? [panel] : [],
      height: 250,
      minHeight: 150,
      maxHeight: 400,
    }

    this.rows.update((rows: DashboardRow[]) => {
      const newRows = [...rows]
      newRows.splice(index, 0, newRow)

      // After adding the new row, redistribute heights to ensure proper fit
      this.redistributeRowHeights(newRows)

      return newRows
    })
  }

  // Method to redistribute row heights when rows are added or removed
  private redistributeRowHeights(rows: DashboardRow[]) {
    if (rows.length === 0) return

    // Target height for each row - aim for reasonable, consistent heights
    const minRowHeight = 150
    const maxRowHeight = 450
    const idealRowHeight = 280 // Good balance for most dashboard panels

    // If we have very few rows, allow them to be taller
    const adjustedIdealHeight =
      rows.length <= 2 ? Math.min(maxRowHeight, Math.max(idealRowHeight, 350)) : idealRowHeight

    // Check if redistribution is needed
    const needsNormalization = rows.some(
      (row) =>
        row.height < minRowHeight || row.height > maxRowHeight || Math.abs(row.height - adjustedIdealHeight) > 100,
    )

    if (needsNormalization || rows.length <= 3) {
      // For small number of rows or when normalization is needed
      rows.forEach((row) => {
        const targetHeight = Math.max(
          row.minHeight || minRowHeight,
          Math.min(row.maxHeight || maxRowHeight, adjustedIdealHeight),
        )

        row.height = targetHeight
      })
    }

    // Final pass: ensure all rows have reasonable heights
    rows.forEach((row) => {
      if (row.height < minRowHeight) row.height = minRowHeight
      if (row.height > maxRowHeight) row.height = maxRowHeight
    })
  }

  addPanelToRow(rowId: string) {
    const panelTypes: Panel['type'][] = ['metric', 'chart-line', 'table', 'list']
    const randomType = panelTypes[Math.floor(Math.random() * panelTypes.length)]

    const newPanel: Panel = {
      id: `panel-${++this.panelCounter}`,
      title: `Panel ${this.panelCounter}`,
      subtitle: this.getPanelSubtitle(randomType),
      type: randomType,
      size: 50,
      minSize: 20,
      maxSize: 80,
      data: this.generatePanelData(randomType),
      icon: this.getPanelIcon(randomType),
    }

    this.insertPanelInRow(rowId, newPanel)
  }

  insertPanelInRow(rowId: string, panel: Panel, index?: number) {
    this.rows.update((rows: DashboardRow[]) =>
      rows.map((row: DashboardRow) => {
        if (row.id === rowId) {
          const updatedPanels = [...row.panels]

          if (typeof index === 'number') {
            updatedPanels.splice(index, 0, panel)
          } else {
            updatedPanels.push(panel)
          }

          // Redistribute sizes for percentage units
          const newSize = 100 / updatedPanels.length
          updatedPanels.forEach((p: Panel) => (p.size = newSize))

          return { ...row, panels: updatedPanels }
        }
        return row
      }),
    )
  }

  removePanel(rowId: string, panelId: string) {
    this.removePanelFromRow(rowId, panelId)
  }

  private removePanelFromRow(rowId: string, panelId: string) {
    this.rows.update((rows: DashboardRow[]) => {
      const updatedRows = rows
        .map((row: DashboardRow) => {
          if (row.id === rowId) {
            const updatedPanels = row.panels.filter((p: Panel) => p.id !== panelId)

            if (updatedPanels.length > 0) {
              // Redistribute sizes evenly for percentage units
              const newSize = 100 / updatedPanels.length
              updatedPanels.forEach((p: Panel) => (p.size = newSize))
            }

            return { ...row, panels: updatedPanels }
          }
          return row
        })
        .filter((row: DashboardRow) => row.panels.length > 0) // Remove empty rows

      // If rows were removed, redistribute heights to avoid wasted space
      if (updatedRows.length < rows.length) {
        this.redistributeRowHeights(updatedRows)
      }

      return updatedRows
    })
  }

  resetDashboard() {
    this.rows.set([])
    this.rowCounter = 0
    this.panelCounter = 0
  }

  loadPreset(preset: 'analytics' | 'sales') {
    this.resetDashboard()

    if (preset === 'analytics') {
      this.rows.set([
        {
          id: `row-${++this.rowCounter}`,
          height: 200,
          minHeight: 150,
          maxHeight: 300,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Active Users',
              subtitle: 'Daily active users',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '👥',
              data: { value: '12,543', label: 'Last 24 hours' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Page Views',
              subtitle: 'Total page views',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '👁️',
              data: { value: '45,231', label: 'This week' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Conversion Rate',
              subtitle: 'Sign-up conversions',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '🎯',
              data: { value: '3.2%', label: 'Last 30 days' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Bounce Rate',
              subtitle: 'Session bounce rate',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '📉',
              data: { value: '28.5%', label: 'This month' },
            },
          ],
        },
        {
          id: `row-${++this.rowCounter}`,
          height: 300,
          minHeight: 250,
          maxHeight: 450,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Traffic Trend',
              subtitle: 'Website traffic over time',
              type: 'chart-line',
              size: 70,
              minSize: 50,
              maxSize: 80,
              icon: '📈',
              data: {},
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Top Pages',
              subtitle: 'Most visited pages',
              type: 'list',
              size: 30,
              minSize: 20,
              maxSize: 50,
              icon: '📄',
              data: {
                items: [
                  { name: '/dashboard', value: '8,234' },
                  { name: '/analytics', value: '5,123' },
                  { name: '/reports', value: '3,456' },
                  { name: '/settings', value: '2,789' },
                ],
              },
            },
          ],
        },
      ])
    } else if (preset === 'sales') {
      this.rows.set([
        {
          id: `row-${++this.rowCounter}`,
          height: 250,
          minHeight: 200,
          maxHeight: 350,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Revenue',
              subtitle: 'Monthly recurring revenue',
              type: 'metric',
              size: 50,
              minSize: 20,
              maxSize: 50,
              icon: '💰',
              data: { value: '$125,430', label: 'This month' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Sales Pipeline',
              subtitle: 'Deals in progress',
              type: 'chart-line',
              size: 50,
              minSize: 20,
              maxSize: 50,
              icon: '📊',
              data: {},
            },
          ],
        },
      ])
    }

    // Recalculate heights after loading preset
    this.rows.update((rows: DashboardRow[]) => {
      this.redistributeRowHeights(rows)
      return rows
    })
  }

  private getPanelSubtitle(type: Panel['type']): string {
    const subtitles = {
      metric: 'Key performance indicator',
      'chart-line': 'Trend analysis',
      table: 'Detailed data view',
      list: 'Top items list',
    }
    return subtitles[type] || ''
  }

  private getPanelIcon(type: Panel['type']): string {
    const icons = {
      metric: '📊',
      'chart-line': '📈',
      table: '📋',
      list: '📝',
    }
    return icons[type] || '📊'
  }

  private generatePanelData(type: Panel['type']): Record<string, unknown> {
    switch (type) {
      case 'metric':
        return {
          value: Math.floor(Math.random() * 10000).toLocaleString(),
          label: 'Sample metric',
        }
      case 'table':
        return {
          headers: ['Name', 'Value', 'Change'],
          rows: [
            ['Metric A', Math.floor(Math.random() * 1000), '+5%'],
            ['Metric B', Math.floor(Math.random() * 1000), '-2%'],
            ['Metric C', Math.floor(Math.random() * 1000), '+12%'],
          ],
        }
      case 'list':
        return {
          items: [
            { name: 'Item 1', value: Math.floor(Math.random() * 1000) },
            { name: 'Item 2', value: Math.floor(Math.random() * 1000) },
            { name: 'Item 3', value: Math.floor(Math.random() * 1000) },
          ],
        }
      default:
        return {}
    }
  }
}
