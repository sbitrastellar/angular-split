import { ChangeDetectionStrategy, Component, HostBinding, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { SplitAreaComponent, SplitComponent, SplitDirection } from 'angular-split'
import { AComponent } from '../../ui/components/AComponent'

interface Panel {
  id: string
  title: string
  type: 'chart' | 'metric' | 'table' | 'list'
  size?: number
  minSize?: number
  maxSize?: number
  color: string
  data?: Record<string, unknown>
}

interface DashboardRow {
  id: string
  panels: Panel[]
  height: number
  minHeight?: number
  maxHeight?: number
}

@Component({
  selector: 'sp-ex-dashboard-panels',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, SplitAreaComponent, SplitComponent],
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        background: #f7f8fa;
        overflow: auto;
      }

      .dashboard-container {
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .dashboard-header {
        background: white;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .dashboard-title {
        font-size: 24px;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 15px;
      }

      .dashboard-controls {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .control-group {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      }

      .btn-primary {
        background: #5e72e4;
        color: white;
      }

      .btn-primary:hover {
        background: #4c63d2;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .btn-secondary:hover {
        background: #5a6268;
      }

      .btn-danger {
        background: #f5365c;
        color: white;
      }

      .btn-danger:hover {
        background: #ec0c38;
      }

      .btn-success {
        background: #2dce89;
        color: white;
      }

      .btn-success:hover {
        background: #24a46d;
      }

      .layout-selector {
        padding: 6px 12px;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        font-size: 14px;
        background: white;
      }

      .dashboard-content {
        flex: 1;
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .dashboard-rows {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .dashboard-row {
        border: 2px dashed #dee2e6;
        border-radius: 8px;
        padding: 10px;
        background: #fafbfc;
        min-height: 150px;
        position: relative;
      }

      .row-header {
        position: absolute;
        top: -10px;
        left: 10px;
        background: white;
        padding: 2px 8px;
        font-size: 12px;
        color: #6c757d;
        border-radius: 4px;
        z-index: 1;
      }

      .panel {
        height: 100%;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .panel-header {
        padding: 12px 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, var(--panel-color) 0%, var(--panel-color-light) 100%);
      }

      .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: white;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
      }

      .panel-action {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .panel-action:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .panel-body {
        flex: 1;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
      }

      .panel-content {
        text-align: center;
        width: 100%;
      }

      .metric-value {
        font-size: 36px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 8px;
      }

      .metric-label {
        font-size: 14px;
        color: #6c757d;
      }

      .chart-placeholder {
        width: 100%;
        height: 200px;
        background:
          linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
        background-size: 20px 20px;
        background-position:
          0 0,
          0 10px,
          10px -10px,
          -10px 0px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6c757d;
      }

      .table-placeholder {
        width: 100%;
      }

      .table-row {
        display: flex;
        padding: 8px;
        border-bottom: 1px solid #e9ecef;
      }

      .table-cell {
        flex: 1;
        font-size: 14px;
        color: #495057;
      }

      .empty-state {
        padding: 40px;
        text-align: center;
        color: #6c757d;
      }

      .add-panel-btn {
        width: 100%;
        height: 100%;
        min-height: 100px;
        border: 2px dashed #dee2e6;
        background: #f8f9fa;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .add-panel-btn:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }

      .info-panel {
        background: #e7f3ff;
        border-left: 4px solid #5e72e4;
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 4px;
      }

      .info-panel h4 {
        margin: 0 0 10px 0;
        color: #2c3e50;
      }

      .info-panel p {
        margin: 5px 0;
        color: #495057;
        font-size: 14px;
      }
    `,
  ],
  template: `
    {{ testChangeDetectorRun() }}
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1 class="dashboard-title">📊 Dynamic Dashboard Builder</h1>

        <div class="info-panel">
          <h4>Mixpanel-Style Dashboard with Angular Split</h4>
          <p>• Add/remove rows and panels dynamically</p>
          <p>• Resize panels horizontally within rows</p>
          <p>• Resize rows vertically with variable height</p>
          <p>• Choose from different panel types (metrics, charts, tables)</p>
        </div>

        <div class="dashboard-controls">
          <div class="control-group">
            <button class="btn btn-primary" (click)="addRow()">➕ Add Row</button>
            <button class="btn btn-secondary" (click)="loadPreset('analytics')">📈 Analytics Preset</button>
            <button class="btn btn-secondary" (click)="loadPreset('sales')">💰 Sales Preset</button>
            <button class="btn btn-danger" (click)="clearDashboard()">🗑️ Clear All</button>
          </div>

          <div class="control-group">
            <label>Layout Direction:</label>
            <select class="layout-selector" [(ngModel)]="direction">
              <option value="vertical">Vertical Rows</option>
              <option value="horizontal">Horizontal Columns</option>
            </select>
          </div>
        </div>
      </div>

      <div class="dashboard-content">
        @if (rows().length === 0) {
          <div class="empty-state">
            <h3>No panels yet</h3>
            <p>Click "Add Row" to start building your dashboard</p>
          </div>
        } @else {
          <as-split [direction]="direction" unit="pixel" [variableHeight]="direction === 'vertical'" [gutterSize]="10">
            @for (row of rows(); track row.id) {
              <as-split-area [size]="row.height" [minSize]="row.minHeight" [maxSize]="row.maxHeight">
                <div class="dashboard-row">
                  <div class="row-header">
                    Row {{ row.id }}
                    <button class="panel-action" (click)="removeRow(row.id)">✕</button>
                  </div>

                  @if (row.panels.length === 0) {
                    <button class="add-panel-btn" (click)="addPanel(row.id)">➕ Add Panel</button>
                  } @else {
                    <as-split direction="horizontal" unit="percent" [gutterSize]="10" style="height: 100%">
                      @for (panel of row.panels; track panel.id) {
                        <as-split-area [size]="panel.size" [minSize]="panel.minSize" [maxSize]="panel.maxSize">
                          <div
                            class="panel"
                            [style.--panel-color]="panel.color"
                            [style.--panel-color-light]="panel.color + '33'"
                          >
                            <div class="panel-header">
                              <span class="panel-title">{{ panel.title }}</span>
                              <div class="panel-actions">
                                <button class="panel-action" (click)="addPanel(row.id)">➕</button>
                                <button class="panel-action" (click)="removePanel(row.id, panel.id)">✕</button>
                              </div>
                            </div>
                            <div class="panel-body">
                              @switch (panel.type) {
                                @case ('metric') {
                                  <div class="panel-content">
                                    <div class="metric-value">{{ panel.data?.value || '0' }}</div>
                                    <div class="metric-label">{{ panel.data?.label || 'Metric' }}</div>
                                  </div>
                                }
                                @case ('chart') {
                                  <div class="panel-content">
                                    <div class="chart-placeholder">📊 Chart Visualization</div>
                                  </div>
                                }
                                @case ('table') {
                                  <div class="panel-content">
                                    <div class="table-placeholder">
                                      @for (row of panel.data?.rows || []; track $index) {
                                        <div class="table-row">
                                          @for (cell of row; track $index) {
                                            <div class="table-cell">{{ cell }}</div>
                                          }
                                        </div>
                                      }
                                    </div>
                                  </div>
                                }
                                @case ('list') {
                                  <div class="panel-content">
                                    @for (item of panel.data?.items || []; track $index) {
                                      <div class="table-row">
                                        <div class="table-cell">• {{ item }}</div>
                                      </div>
                                    }
                                  </div>
                                }
                              }
                            </div>
                          </div>
                        </as-split-area>
                      }
                    </as-split>
                  }
                </div>
              </as-split-area>
            }
          </as-split>
        }
      </div>
    </div>
  `,
})
export class DashboardPanelsComponent extends AComponent implements OnInit {
  @HostBinding('class') class = 'dashboard-example-page'

  rows = signal<DashboardRow[]>([])
  direction: SplitDirection = 'vertical'

  private rowCounter = 0
  private panelCounter = 0

  private panelTypes: Panel['type'][] = ['metric', 'chart', 'table', 'list']
  private panelColors = ['#5e72e4', '#2dce89', '#fb6340', '#11cdef', '#f5365c', '#8965e0']

  ngOnInit() {
    // Start with a sample dashboard
    this.loadPreset('analytics')
  }

  addRow() {
    const newRow: DashboardRow = {
      id: `row-${++this.rowCounter}`,
      panels: [],
      height: 250,
      minHeight: 150,
      maxHeight: 500,
    }
    this.rows.update((rows) => [...rows, newRow])

    // Automatically add first panel to new row
    setTimeout(() => this.addPanel(newRow.id), 100)
  }

  removeRow(rowId: string) {
    this.rows.update((rows) => rows.filter((r) => r.id !== rowId))
  }

  addPanel(rowId: string) {
    const row = this.rows().find((r) => r.id === rowId)
    if (!row) return

    const panelType = this.panelTypes[Math.floor(Math.random() * this.panelTypes.length)]
    const color = this.panelColors[this.panelCounter % this.panelColors.length]

    const newPanel: Panel = {
      id: `panel-${++this.panelCounter}`,
      title: `Panel ${this.panelCounter}`,
      type: panelType,
      size: row.panels.length === 0 ? 100 : 50,
      minSize: 20,
      maxSize: 80,
      color: color,
      data: this.generatePanelData(panelType),
    }

    // Adjust existing panel sizes
    if (row.panels.length > 0) {
      const newSize = 100 / (row.panels.length + 1)
      row.panels.forEach((p) => (p.size = newSize))
      newPanel.size = newSize
    }

    this.rows.update((rows) => rows.map((r) => (r.id === rowId ? { ...r, panels: [...r.panels, newPanel] } : r)))
  }

  removePanel(rowId: string, panelId: string) {
    this.rows.update((rows) =>
      rows.map((row) => {
        if (row.id === rowId) {
          const updatedPanels = row.panels.filter((p) => p.id !== panelId)
          // Redistribute sizes
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

  clearDashboard() {
    this.rows.set([])
    this.rowCounter = 0
    this.panelCounter = 0
  }

  loadPreset(preset: 'analytics' | 'sales') {
    this.clearDashboard()

    if (preset === 'analytics') {
      // Row 1: Key Metrics
      this.rows.set([
        {
          id: `row-${++this.rowCounter}`,
          height: 180,
          minHeight: 150,
          maxHeight: 250,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Total Users',
              type: 'metric',
              size: 25,
              minSize: 15,
              maxSize: 40,
              color: '#5e72e4',
              data: { value: '12,543', label: 'Active Users' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Revenue',
              type: 'metric',
              size: 25,
              minSize: 15,
              maxSize: 40,
              color: '#2dce89',
              data: { value: '$48,291', label: 'Monthly Revenue' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Conversion Rate',
              type: 'metric',
              size: 25,
              minSize: 15,
              maxSize: 40,
              color: '#fb6340',
              data: { value: '3.48%', label: 'Conversion Rate' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Bounce Rate',
              type: 'metric',
              size: 25,
              minSize: 15,
              maxSize: 40,
              color: '#11cdef',
              data: { value: '28.5%', label: 'Bounce Rate' },
            },
          ],
        },
        // Row 2: Charts
        {
          id: `row-${++this.rowCounter}`,
          height: 300,
          minHeight: 200,
          maxHeight: 400,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'User Growth',
              type: 'chart',
              size: 60,
              minSize: 40,
              maxSize: 80,
              color: '#5e72e4',
              data: {},
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Top Events',
              type: 'list',
              size: 40,
              minSize: 20,
              maxSize: 60,
              color: '#8965e0',
              data: { items: ['Page View', 'Sign Up', 'Purchase', 'Add to Cart', 'Checkout'] },
            },
          ],
        },
        // Row 3: Table
        {
          id: `row-${++this.rowCounter}`,
          height: 250,
          minHeight: 200,
          maxHeight: 350,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Recent Activity',
              type: 'table',
              size: 100,
              minSize: 50,
              maxSize: 100,
              color: '#f5365c',
              data: {
                rows: [
                  ['User', 'Action', 'Time', 'Status'],
                  ['John Doe', 'Purchase', '2 min ago', 'Completed'],
                  ['Jane Smith', 'Sign Up', '5 min ago', 'Active'],
                  ['Bob Johnson', 'Page View', '10 min ago', 'Browsing'],
                  ['Alice Brown', 'Add to Cart', '15 min ago', 'Pending'],
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
          height: 200,
          minHeight: 150,
          maxHeight: 300,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Total Sales',
              type: 'metric',
              size: 33,
              minSize: 20,
              maxSize: 50,
              color: '#2dce89',
              data: { value: '$125,430', label: 'This Month' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Orders',
              type: 'metric',
              size: 33,
              minSize: 20,
              maxSize: 50,
              color: '#5e72e4',
              data: { value: '1,893', label: 'Total Orders' },
            },
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Avg Order Value',
              type: 'metric',
              size: 34,
              minSize: 20,
              maxSize: 50,
              color: '#fb6340',
              data: { value: '$66.21', label: 'Average' },
            },
          ],
        },
        {
          id: `row-${++this.rowCounter}`,
          height: 350,
          minHeight: 250,
          maxHeight: 450,
          panels: [
            {
              id: `panel-${++this.panelCounter}`,
              title: 'Sales Trend',
              type: 'chart',
              size: 100,
              minSize: 50,
              maxSize: 100,
              color: '#11cdef',
              data: {},
            },
          ],
        },
      ])
    }
  }

  private generatePanelData(type: Panel['type']): Record<string, unknown> {
    switch (type) {
      case 'metric':
        return {
          value: Math.floor(Math.random() * 10000),
          label: 'Sample Metric',
        }
      case 'table':
        return {
          rows: [
            ['Column 1', 'Column 2', 'Column 3'],
            ['Data 1', 'Data 2', 'Data 3'],
            ['Data 4', 'Data 5', 'Data 6'],
          ],
        }
      case 'list':
        return {
          items: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
        }
      default:
        return {}
    }
  }
}
