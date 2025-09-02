import { ChangeDetectionStrategy, Component, HostBinding, signal, OnInit } from '@angular/core'
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
  showAddButton?: boolean
}

@Component({
  selector: 'sp-ex-mixpanel-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, SplitAreaComponent, SplitComponent, SplitGutterDirective],
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        background: #1a1a1a;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .dashboard-container {
        height: 100%;
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

      .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
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
        flex: 1;
        background: #1a1a1a;
        overflow: hidden;
      }

      .dashboard-row {
        display: flex;
        height: 100%;
      }

      .add-content-sidebar {
        width: 40px;
        background: #0f0f0f;
        border-right: 1px solid #2a2a2a;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0;
        gap: 10px;
      }

      .add-row-btn {
        width: 30px;
        height: 30px;
        border: 1px dashed #3a3a3a;
        background: transparent;
        color: #6a6a6a;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.2s;
      }

      .add-row-btn:hover {
        background: #2a2a2a;
        border-color: #5a5a5a;
        color: #aaaaaa;
      }

      .add-content-label {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-size: 11px;
        color: #6a6a6a;
        margin-top: 10px;
      }

      .dashboard-content {
        flex: 1;
        padding: 20px;
        overflow: auto;
      }

      .panel {
        height: 100%;
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .panel-header {
        padding: 16px 20px;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .panel-title-group {
        flex: 1;
      }

      .panel-icon {
        width: 20px;
        height: 20px;
        margin-right: 8px;
        opacity: 0.7;
        vertical-align: middle;
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

      /* Chart styles */
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
        position: relative;
        overflow: hidden;
      }

      .chart-grid {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image:
          repeating-linear-gradient(0deg, #1a1a1a, #1a1a1a 1px, transparent 1px, transparent 40px),
          repeating-linear-gradient(90deg, #1a1a1a, #1a1a1a 1px, transparent 1px, transparent 40px);
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

      .chart-axis {
        stroke: #2a2a2a;
        stroke-width: 1;
      }

      .chart-label {
        font-size: 10px;
        fill: #6a6a6a;
      }

      /* Metric styles */
      .metric-container {
        text-align: left;
      }

      .metric-value {
        font-size: 32px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .metric-change {
        font-size: 14px;
        color: #2dce89;
        margin-bottom: 4px;
      }

      .metric-change.negative {
        color: #f5365c;
      }

      .metric-label {
        font-size: 13px;
        color: #8a8a8a;
      }

      /* Table styles */
      .table-container {
        width: 100%;
        max-height: 300px;
        overflow: auto;
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
        background: #0a0a0a;
        position: sticky;
        top: 0;
      }

      .data-table td {
        padding: 10px 12px;
        font-size: 13px;
        color: #ffffff;
        border-bottom: 1px solid #1a1a1a;
      }

      .data-table tr:hover td {
        background: #1a1a1a;
      }

      /* List styles */
      .list-container {
        width: 100%;
      }

      .list-item {
        padding: 12px 16px;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.2s;
      }

      .list-item:hover {
        background: #1a1a1a;
      }

      .list-item-name {
        font-size: 13px;
        color: #ffffff;
      }

      .list-item-value {
        font-size: 13px;
        color: #8a8a8a;
      }

      /* Empty state */
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

      /* Scrollbar styles */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #0f0f0f;
      }

      ::-webkit-scrollbar-thumb {
        background: #3a3a3a;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #4a4a4a;
      }

      /* Custom gutter styles */
      .custom-gutter {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: transparent;
        cursor: row-resize;
      }

      .custom-gutter.horizontal {
        cursor: col-resize;
      }

      /* Add row hover zone */
      .gutter-add-zone {
        position: absolute;
        top: -10px;
        left: 0;
        right: 0;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .gutter-add-zone:hover .add-row-inline {
        opacity: 1;
      }

      .add-row-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s;
        background: #1a1a1a;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid #3a3a3a;
      }

      .add-row-inline:hover {
        background: #2a2a2a;
        border-color: #5e42f0;
      }

      .add-row-inline-btn {
        background: transparent;
        border: none;
        color: #8a8a8a;
        cursor: pointer;
        font-size: 12px;
        padding: 2px 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .add-row-inline-btn:hover {
        color: #ffffff;
      }

      .add-row-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: #5e42f0;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }

      .gutter-add-zone:hover .add-row-line {
        opacity: 0.5;
      }

      .custom-gutter::before {
        content: '';
        position: absolute;
        background: #2a2a2a;
        transition: background 0.2s;
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
        background: #404040;
        border-radius: 4px;
        transition: all 0.2s;
        z-index: 1;
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
      }

      .custom-gutter.dragging .gutter-handle {
        background: #7050ff;
      }

      .custom-gutter:hover::before {
        background: #3a3a3a;
      }

      .custom-gutter.dragging::before {
        background: #4a4a4a;
      }

      /* Override default gutter styles */
      ::ng-deep .as-split-gutter {
        background: transparent !important;
      }

      ::ng-deep .as-split-gutter-icon {
        display: none;
      }

      /* Snap indicators */
      .snap-indicators {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: space-around;
        pointer-events: none;
        z-index: 1000;
        padding: 0 40px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .snap-indicators.visible {
        opacity: 1;
      }

      .snap-indicators.vertical {
        width: 20px;
        height: 100%;
        flex-direction: column;
        padding: 40px 0;
      }

      .snap-dot {
        width: 4px;
        height: 4px;
        background: #4a4a4a;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .snap-dot.active {
        background: #5e42f0;
        width: 6px;
        height: 6px;
      }

      .snap-dot.nearby {
        background: #6a6a6a;
        width: 5px;
        height: 5px;
      }

      /* Snap ghost preview */
      .snap-ghost {
        position: absolute;
        background: #5e42f0;
        opacity: 0.2;
        pointer-events: none;
        z-index: 999;
        transition: all 0.15s ease-out;
      }

      .snap-ghost.horizontal {
        width: 1px;
        height: 100%;
        top: 0;
      }

      .snap-ghost.vertical {
        width: 100%;
        height: 1px;
        left: 0;
      }
    `,
  ],
  template: `
    {{ testChangeDetectorRun() }}
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div class="header-left">
          <h1 class="dashboard-title">📊 Dashboard</h1>
          <button class="btn" (click)="toggleTheme()">{{ isDarkMode ? '🌞' : '🌙' }} Theme</button>
        </div>
        <div class="header-controls">
          <button class="btn" (click)="loadPreset('analytics')">Analytics Preset</button>
          <button class="btn" (click)="loadPreset('engagement')">Engagement Preset</button>
          <button class="btn btn-primary" (click)="saveDashboard()">Save Dashboard</button>
        </div>
      </div>

      <div class="dashboard-body">
        <div class="dashboard-row">
          <!-- Left sidebar for adding content -->
          <div class="add-content-sidebar">
            <button class="add-row-btn" (click)="addRow()" title="Add content to row">+</button>
            <span class="add-content-label">Add content to row</span>
          </div>

          <!-- Main dashboard content -->
          <div class="dashboard-content" style="position: relative;">
            <!-- Top edge add zone -->
            @if (rows().length > 0) {
              <div class="gutter-add-zone" style="top: 0; position: absolute; z-index: 20;">
                <div class="add-row-line"></div>
                <div class="add-row-inline">
                  <button class="add-row-inline-btn" (click)="insertRowAt(0)">
                    <span>+</span>
                    <span>Add row above</span>
                  </button>
                </div>
              </div>
            }

            <!-- Snap indicators overlay -->
            @if (isDragging()) {
              <div
                class="snap-indicators"
                [class.visible]="isDragging()"
                [class.vertical]="dragDirection() === 'vertical'"
              >
                @for (point of snapPoints(); track $index) {
                  <div
                    class="snap-dot"
                    [class.active]="isSnapPointActive(point)"
                    [class.nearby]="isSnapPointNearby(point)"
                  ></div>
                }
              </div>
            }

            @if (rows().length === 0) {
              <div class="empty-row" (click)="addRow()">+ Add your first dashboard row</div>
            } @else {
              <as-split
                direction="vertical"
                unit="pixel"
                [variableHeight]="true"
                [gutterSize]="8"
                (dragStart)="onDragStart('vertical', $event)"
                (dragEnd)="onDragEnd($event)"
                (dragProgress)="onDragProgress($event)"
              >
                <!-- Custom gutter template for vertical splits -->
                <ng-template asSplitGutter let-gutterNum="gutterNum" let-isDragged="isDragged">
                  <div class="custom-gutter vertical" [class.dragging]="isDragged">
                    <!-- Add row hover zone above gutter -->
                    <div class="gutter-add-zone">
                      <div class="add-row-line"></div>
                      <div class="add-row-inline">
                        <button class="add-row-inline-btn" (click)="insertRowAt(gutterNum)">
                          <span>+</span>
                          <span>Add row</span>
                        </button>
                      </div>
                    </div>
                    <div class="gutter-handle"></div>
                  </div>
                </ng-template>
                @for (row of rows(); track row.id; let i = $index) {
                  <as-split-area [size]="row.height" [minSize]="row.minHeight" [maxSize]="row.maxHeight">
                    @if (row.panels.length === 0) {
                      <div class="empty-row" (click)="addPanelToRow(row.id)">+ Add panel to row {{ i + 1 }}</div>
                    } @else {
                      <as-split
                        direction="horizontal"
                        unit="percent"
                        [gutterSize]="8"
                        style="height: 100%"
                        (dragStart)="onDragStart('horizontal', $event)"
                        (dragEnd)="onDragEnd($event)"
                        (dragProgress)="onDragProgress($event)"
                      >
                        <!-- Custom gutter template for horizontal splits -->
                        <ng-template asSplitGutter let-gutterNum="gutterNum" let-isDragged="isDragged">
                          <div class="custom-gutter horizontal" [class.dragging]="isDragged">
                            <div class="gutter-handle"></div>
                          </div>
                        </ng-template>
                        @for (panel of row.panels; track panel.id) {
                          <as-split-area [size]="panel.size" [minSize]="panel.minSize" [maxSize]="panel.maxSize">
                            <div class="panel">
                              <div class="panel-header">
                                <div class="panel-title-group">
                                  <h3 class="panel-title">
                                    @if (panel.icon) {
                                      <span>{{ panel.icon }}</span>
                                    }
                                    {{ panel.title }}
                                  </h3>
                                  @if (panel.subtitle) {
                                    <p class="panel-subtitle">{{ panel.subtitle }}</p>
                                  }
                                </div>
                                <div class="panel-actions">
                                  <button class="panel-action" (click)="refreshPanel(panel.id)">↻</button>
                                  <button class="panel-action" (click)="removePanel(row.id, panel.id)">×</button>
                                </div>
                              </div>
                              <div class="panel-body">
                                <div class="panel-content">
                                  @switch (panel.type) {
                                    @case ('metric') {
                                      <div class="metric-container">
                                        <div class="metric-value">{{ panel.data?.value || '0' }}</div>
                                        @if (panel.data?.change) {
                                          <div class="metric-change" [class.negative]="panel.data.change < 0">
                                            {{ panel.data.change > 0 ? '+' : '' }}{{ panel.data.change }}%
                                          </div>
                                        }
                                        <div class="metric-label">{{ panel.data?.label || 'Metric' }}</div>
                                      </div>
                                    }
                                    @case ('chart-line') {
                                      <div class="chart-container">
                                        <svg class="chart-line" viewBox="0 0 400 200">
                                          <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                              <stop offset="0%" style="stop-color:#6e4ff0;stop-opacity:0.3" />
                                              <stop offset="100%" style="stop-color:#6e4ff0;stop-opacity:0" />
                                            </linearGradient>
                                          </defs>
                                          <g class="chart-grid"></g>
                                          <path
                                            class="chart-line-area"
                                            d="M 20 150 L 80 120 L 140 130 L 200 100 L 260 110 L 320 90 L 380 95 L 380 180 L 20 180 Z"
                                          />
                                          <path
                                            class="chart-line-path"
                                            d="M 20 150 L 80 120 L 140 130 L 200 100 L 260 110 L 320 90 L 380 95"
                                          />
                                        </svg>
                                      </div>
                                    }
                                    @case ('table') {
                                      <div class="table-container">
                                        <table class="data-table">
                                          <thead>
                                            <tr>
                                              @for (header of panel.data?.headers || []; track $index) {
                                                <th>{{ header }}</th>
                                              }
                                            </tr>
                                          </thead>
                                          <tbody>
                                            @for (row of panel.data?.rows || []; track $index) {
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
                                      <div class="list-container">
                                        @for (item of panel.data?.items || []; track $index) {
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
                  </as-split-area>
                }
              </as-split>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MixpanelDashboardComponent extends AComponent implements OnInit {
  @HostBinding('class') class = 'mixpanel-dashboard-page'

  rows = signal<DashboardRow[]>([])
  isDarkMode = true
  isDragging = signal(false)
  dragDirection = signal<'horizontal' | 'vertical'>('horizontal')
  snapPoints = signal<number[]>([])
  currentDragGutter = signal<number>(-1)
  currentDragSizes = signal<number[]>([])

  private rowCounter = 0
  private panelCounter = 0
  private currentSplitComponent: SplitComponent | null = null

  ngOnInit() {
    // Start with analytics preset
    this.loadPreset('analytics')
  }

  addRow() {
    const newRow: DashboardRow = {
      id: `row-${++this.rowCounter}`,
      panels: [],
      height: 300,
      minHeight: 200,
      maxHeight: 600,
      showAddButton: true,
    }
    this.rows.update((rows) => [...rows, newRow])
  }

  insertRowAt(gutterIndex: number) {
    const newRow: DashboardRow = {
      id: `row-${++this.rowCounter}`,
      panels: [],
      height: 250,
      minHeight: 150,
      maxHeight: 400,
      showAddButton: true,
    }

    // Insert row at the position indicated by gutter index
    // Gutter 1 is between row 0 and row 1, so insert at position gutterIndex
    this.rows.update((rows) => {
      const newRows = [...rows]
      newRows.splice(gutterIndex, 0, newRow)
      return newRows
    })

    // Automatically add a panel to the new row after a short delay
    setTimeout(() => this.addPanelToRow(newRow.id), 100)
  }

  addPanelToRow(rowId: string) {
    const panelTypes: Panel['type'][] = ['metric', 'chart-line', 'table', 'list']
    const randomType = panelTypes[Math.floor(Math.random() * panelTypes.length)]

    const newPanel: Panel = {
      id: `panel-${++this.panelCounter}`,
      title: this.getPanelTitle(randomType),
      subtitle: this.getPanelSubtitle(randomType),
      type: randomType,
      size: 100,
      minSize: 20,
      maxSize: 80,
      data: this.generatePanelData(randomType),
      icon: this.getPanelIcon(randomType),
    }

    this.rows.update((rows) =>
      rows.map((row) => {
        if (row.id === rowId) {
          const updatedPanels = [...row.panels, newPanel]
          // Redistribute sizes
          const newSize = 100 / updatedPanels.length
          updatedPanels.forEach((p) => (p.size = newSize))
          return { ...row, panels: updatedPanels }
        }
        return row
      }),
    )
  }

  removePanel(rowId: string, panelId: string) {
    this.rows.update((rows) =>
      rows.map((row) => {
        if (row.id === rowId) {
          const updatedPanels = row.panels.filter((p) => p.id !== panelId)
          if (updatedPanels.length > 0) {
            const newSize = 100 / updatedPanels.length
            updatedPanels.forEach((p) => (p.size = newSize))
          }
          return { ...row, panels: updatedPanels }
        }
        return row
      }),
    )
  }

  refreshPanel(panelId: string) {
    console.log('Refreshing panel:', panelId)
    // Implement refresh logic here
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode
    // Implement theme toggle
  }

  saveDashboard() {
    console.log('Saving dashboard:', this.rows())
    // Implement save logic
  }

  // Snap-to-grid functionality
  onDragStart(_direction: 'horizontal' | 'vertical', event: { sizes: number[] }) {
    this.isDragging.set(true)
    this.dragDirection.set(direction)
    this.currentDragGutter.set(event.gutterNum || 0)

    // Calculate snap points based on direction
    const snapPoints = this.calculateSnapPoints()
    this.snapPoints.set(snapPoints)

    console.log('Drag started:', { direction, gutterNum: event.gutterNum, sizes: event.sizes })
  }

  onDragProgress(event: { sizes: number[] }) {
    // Update visual feedback during drag
    if (event.sizes) {
      this.currentDragSizes.set(event.sizes)
      console.log('Drag progress:', event.sizes)
    }
  }

  onDragEnd(event: { sizes: number[] }) {
    console.log('Drag ended:', event)
    this.isDragging.set(false)

    // Snap to nearest grid point
    if (event.sizes && event.sizes.length > 0) {
      const originalSizes = event.sizes
      const snappedSizes = this.snapToNearestGrid(originalSizes)

      console.log('Snapping from:', originalSizes, 'to:', snappedSizes)

      // Apply snapped sizes back to the panels
      if (this.dragDirection() === 'horizontal') {
        this.updatePanelSizesInCurrentRow(snappedSizes)
      } else {
        this.updateRowHeights(snappedSizes)
      }
    }

    this.snapPoints.set([])
    this.currentDragGutter.set(-1)
    this.currentDragSizes.set([])
  }

  // Visual feedback methods
  isSnapPointActive(snapPoint: number): boolean {
    if (!this.isDragging() || this.currentDragSizes().length === 0) {
      return false
    }

    const currentSizes = this.currentDragSizes()
    return currentSizes.some((size) => Math.abs(size - snapPoint) <= 2)
  }

  isSnapPointNearby(snapPoint: number): boolean {
    if (!this.isDragging() || this.currentDragSizes().length === 0) {
      return false
    }

    const currentSizes = this.currentDragSizes()
    return currentSizes.some((size) => {
      const distance = Math.abs(size - snapPoint)
      return distance > 2 && distance <= 5
    })
  }

  private calculateSnapPoints(): number[] {
    // Generate snap points at regular intervals
    const commonSplits = [10, 15, 20, 25, 30, 33, 40, 50, 60, 67, 70, 75, 80, 85, 90]
    return commonSplits
  }

  private snapToNearestGrid(sizes: number[]): number[] {
    const snapThreshold = 5 // percentage points - increased for better snapping
    const snapPoints = [10, 15, 20, 25, 30, 33, 40, 50, 60, 67, 70, 75, 80, 85, 90]

    return sizes.map((size) => {
      // Convert to percentage if needed
      const percentSize = typeof size === 'number' ? size : parseFloat(String(size))

      // Find the closest snap point
      let closestSnapPoint = percentSize
      let minDistance = Infinity

      for (const snapPoint of snapPoints) {
        const distance = Math.abs(percentSize - snapPoint)
        if (distance < minDistance && distance <= snapThreshold) {
          minDistance = distance
          closestSnapPoint = snapPoint
        }
      }

      // If no snap point found within threshold, round to nearest 5%
      if (minDistance === Infinity) {
        closestSnapPoint = Math.round(percentSize / 5) * 5
      }

      // Ensure we don't go below minimum or above maximum
      closestSnapPoint = Math.max(10, Math.min(90, closestSnapPoint))

      return closestSnapPoint
    })
  }

  private updatePanelSizesInCurrentRow(snappedSizes: number[]) {
    const currentRows = this.rows()
    let targetRowIndex = -1

    // Find which row is being dragged (simplified - could be enhanced)
    currentRows.forEach((row, rowIndex) => {
      if (row.panels.length === snappedSizes.length) {
        targetRowIndex = rowIndex
      }
    })

    if (targetRowIndex >= 0) {
      this.rows.update((rows) => {
        const newRows = [...rows]
        const targetRow = { ...newRows[targetRowIndex] }

        // Update panel sizes
        targetRow.panels = targetRow.panels.map((panel, panelIndex) => ({
          ...panel,
          size: snappedSizes[panelIndex] || panel.size,
        }))

        newRows[targetRowIndex] = targetRow
        return newRows
      })
    }
  }

  private updateRowHeights(snappedSizes: number[]) {
    // Convert percentage-based sizes to pixel heights for rows
    const baseHeight = 300 // base height for calculations

    this.rows.update((rows) => {
      return rows.map((row, index) => {
        if (index < snappedSizes.length) {
          // Calculate new height based on snapped percentage
          const heightPercentage = snappedSizes[index] / 100
          const newHeight = Math.max(150, Math.min(500, baseHeight * (1 + heightPercentage)))

          return {
            ...row,
            height: Math.round(newHeight),
          }
        }
        return row
      })
    })
  }

  loadPreset(preset: 'analytics' | 'engagement') {
    this.rows.set([])
    this.rowCounter = 0
    this.panelCounter = 0

    if (preset === 'analytics') {
      this.rows.set([
        {
          id: `row-${++this.rowCounter}`,
          height: 250,
          minHeight: 200,
          maxHeight: 400,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Least Frequent Events',
              subtitle: 'Last 30 days',
              type: 'table',
              size: 50,
              minSize: 30,
              maxSize: 70,
              icon: '📊',
              data: {
                headers: ['Event Name', 'Total Events'],
                rows: [
                  ['AlertAction', '5'],
                  ['Clone System Action', '10'],
                  ['Close Filter', '16'],
                  ['Bulk Assign Aggregator to Sensors', '17'],
                  ['Cancel Alert Filter Modification', '48'],
                ],
              },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'All Events [Total Events]',
              subtitle: 'Total Events',
              type: 'metric',
              size: 50,
              minSize: 30,
              maxSize: 70,
              icon: '🎯',
              data: {
                value: '2,132,966',
                label: 'Total events tracked',
              },
            },
          ],
        },
        {
          id: `row-${++this.rowCounter}`,
          height: 300,
          minHeight: 250,
          maxHeight: 500,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Daily Active Users',
              subtitle: 'Linear, Daily Active Users, last 30 days compared',
              type: 'chart-line',
              size: 50,
              minSize: 30,
              maxSize: 70,
              icon: '📈',
              data: {},
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Number of Users',
              subtitle: 'Linear, Unique, last 30 days',
              type: 'chart-line',
              size: 50,
              minSize: 30,
              maxSize: 70,
              icon: '👥',
              data: {},
            },
          ],
        },
      ])
    } else if (preset === 'engagement') {
      this.rows.set([
        {
          id: `row-${++this.rowCounter}`,
          height: 200,
          minHeight: 150,
          maxHeight: 300,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'User Engagement',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '📊',
              data: {
                value: '78.5%',
                change: 5.2,
                label: 'Weekly active users',
              },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Session Duration',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '⏱️',
              data: {
                value: '5m 32s',
                change: -2.1,
                label: 'Average session time',
              },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Page Views',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '👁️',
              data: {
                value: '45,231',
                change: 12.8,
                label: 'Total page views',
              },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Bounce Rate',
              type: 'metric',
              size: 25,
              minSize: 20,
              maxSize: 40,
              icon: '📉',
              data: {
                value: '32.4%',
                change: -3.5,
                label: 'Last 7 days',
              },
            },
          ],
        },
        {
          id: `row-${++this.rowCounter}`,
          height: 350,
          minHeight: 300,
          maxHeight: 500,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Top Pages',
              subtitle: 'Most visited pages',
              type: 'list',
              size: 40,
              minSize: 30,
              maxSize: 60,
              icon: '📄',
              data: {
                items: [
                  { name: '/dashboard', value: '12,543 views' },
                  { name: '/analytics', value: '8,921 views' },
                  { name: '/reports', value: '6,234 views' },
                  { name: '/settings', value: '3,421 views' },
                  { name: '/profile', value: '2,134 views' },
                ],
              },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'User Flow',
              subtitle: 'Navigation patterns',
              type: 'chart-line',
              size: 60,
              minSize: 40,
              maxSize: 70,
              icon: '🔀',
              data: {},
            },
          ],
        },
      ])
    }
  }

  private getPanelTitle(type: Panel['type']): string {
    const titles = {
      metric: 'Key Metric',
      'chart-line': 'Trend Analysis',
      table: 'Data Table',
      list: 'Top Items',
    }
    return titles[type] || 'Panel'
  }

  private getPanelSubtitle(type: Panel['type']): string {
    const subtitles = {
      metric: 'Real-time data',
      'chart-line': 'Last 30 days',
      table: 'Detailed breakdown',
      list: 'Sorted by value',
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
          change: (Math.random() * 20 - 10).toFixed(1),
          label: 'Sample metric',
        }
      case 'table':
        return {
          headers: ['Name', 'Value', 'Change'],
          rows: [
            ['Item 1', Math.floor(Math.random() * 1000), '+5%'],
            ['Item 2', Math.floor(Math.random() * 1000), '-2%'],
            ['Item 3', Math.floor(Math.random() * 1000), '+12%'],
          ],
        }
      case 'list':
        return {
          items: [
            { name: 'First item', value: Math.floor(Math.random() * 1000) },
            { name: 'Second item', value: Math.floor(Math.random() * 1000) },
            { name: 'Third item', value: Math.floor(Math.random() * 1000) },
          ],
        }
      default:
        return {}
    }
  }
}
