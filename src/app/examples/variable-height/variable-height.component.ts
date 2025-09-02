import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core'
import { SplitAreaComponent, SplitComponent } from 'angular-split'
import { AComponent } from '../../ui/components/AComponent'

@Component({
  selector: 'sp-ex-variable-height',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SplitAreaComponent, SplitComponent],
  styles: [
    `
      .container {
        padding: 20px;
      }
      .split-example {
        border: 1px solid #ccc;
        margin: 20px 0;
        min-height: 200px;
        display: flex;
        height: 100%;
      }
      .content-area {
        padding: 15px;
        background: #f5f5f5;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
      }
      .area-header {
        font-weight: bold;
        margin-bottom: 10px;
      }
    `,
  ],
  template: `
    {{ testChangeDetectorRun() }}
    <div class="container">
      <h2>Variable Height Split Example</h2>
      <p>
        When <code>variableHeight</code> is enabled on a vertical split, dragging the gutter will change the height of
        the entire split component. The area above the gutter resizes while areas below maintain their original sizes.
      </p>

      <h4>Variable Height Enabled (Vertical):</h4>
      <div class="split-example">
        <as-split
          direction="vertical"
          unit="pixel"
          [variableHeight]="true"
          [gutterSize]="11"
          (dragEnd)="onDragEnd($event)"
        >
          <as-split-area [size]="150" [minSize]="50" [maxSize]="300">
            <div class="content-area">
              <div class="area-header">Top Area (Resizable)</div>
              <p>
                This area will change size when you drag the gutter below. The entire component height will adjust
                accordingly.
              </p>
              <p>Min: 50px, Max: 300px</p>
            </div>
          </as-split-area>

          <as-split-area [size]="100" [minSize]="100" [maxSize]="100">
            <div class="content-area">
              <div class="area-header">Middle Area (Fixed)</div>
              <p>This area maintains its size when the gutter above is dragged.</p>
            </div>
          </as-split-area>

          <as-split-area [size]="100">
            <div class="content-area">
              <div class="area-header">Bottom Area (Fixed)</div>
              <p>This area also maintains its size when any gutter is dragged.</p>
            </div>
          </as-split-area>
        </as-split>
      </div>

      <h4>Standard Mode (Vertical) - For Comparison:</h4>
      <div class="split-example" style="height: 400px;">
        <as-split direction="vertical" unit="pixel" [variableHeight]="false" [gutterSize]="11">
          <as-split-area [size]="150">
            <div class="content-area">
              <div class="area-header">Top Area</div>
              <p>
                In standard mode, the component maintains fixed height. Areas resize proportionally within the
                container.
              </p>
            </div>
          </as-split-area>

          <as-split-area size="*">
            <div class="content-area">
              <div class="area-header">Middle Area</div>
              <p>This behaves like a normal split with fixed container height.</p>
            </div>
          </as-split-area>

          <as-split-area [size]="100">
            <div class="content-area">
              <div class="area-header">Bottom Area</div>
              <p>Standard split behavior within fixed height container.</p>
            </div>
          </as-split-area>
        </as-split>
      </div>

      <h4>Variable Height with Nested Splitter:</h4>
      <div class="split-example">
        <as-split direction="vertical" unit="pixel" [variableHeight]="true" [gutterSize]="11">
          <as-split-area [size]="200" [minSize]="100" [maxSize]="400">
            <div class="content-area">
              <div class="area-header">Top Area with Nested Horizontal Split</div>
              <as-split direction="horizontal" unit="percent" [gutterSize]="11" style="height: 100%; width: 100%;">
                <as-split-area [size]="30">
                  <div class="content-area" style="background: #e0e0e0;">
                    <div class="area-header">Left Panel</div>
                    <p>This panel is inside the resizable top area.</p>
                  </div>
                </as-split-area>

                <as-split-area [size]="70">
                  <div class="content-area" style="background: #d0d0d0;">
                    <div class="area-header">Right Panel</div>
                    <p>When you drag the vertical gutter below, the entire nested split resizes.</p>
                  </div>
                </as-split-area>
              </as-split>
            </div>
          </as-split-area>

          <as-split-area [size]="150" [minSize]="100" [maxSize]="200">
            <div class="content-area">
              <div class="area-header">Middle Area with Another Nested Split</div>
              <as-split direction="horizontal" unit="percent" [gutterSize]="11" style="height: 100%; width: 100%;">
                <as-split-area [size]="50">
                  <div class="content-area" style="background: #f0f0f0;">
                    <p>Left side - fixed height area</p>
                  </div>
                </as-split-area>

                <as-split-area [size]="50">
                  <div class="content-area" style="background: #e8e8e8;">
                    <p>Right side - fixed height area</p>
                  </div>
                </as-split-area>
              </as-split>
            </div>
          </as-split-area>

          <as-split-area [size]="100" [minSize]="80" [maxSize]="150">
            <div class="content-area">
              <div class="area-header">Bottom Fixed Area</div>
              <p>
                This area maintains its size when dragging gutters above. Only the top area changes size in variable
                height mode.
              </p>
            </div>
          </as-split-area>
        </as-split>
      </div>
    </div>
  `,
})
export class VariableHeightComponent extends AComponent {
  @HostBinding('class') class = 'split-example-page'

  onDragEnd(event: { sizes: (string | number)[] }) {
    console.log('Drag ended with sizes:', event.sizes)
  }
}
