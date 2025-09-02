import { DOCUMENT, NgStyle, NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  InjectionToken,
  NgZone,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  isDevMode,
  output,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  Subject,
  filter,
  fromEvent,
  map,
  merge,
  pairwise,
  skipWhile,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs'
import { ANGULAR_SPLIT_DEFAULT_OPTIONS } from '../angular-split-config.token'
import { SplitGutterDynamicInjectorDirective } from '../gutter/split-gutter-dynamic-injector.directive'
import { SplitGutterDirective } from '../gutter/split-gutter.directive'
import { SplitAreaSize, SplitGutterInteractionEvent } from '../models'
import type { SplitAreaComponent } from '../split-area/split-area.component'
import { SplitCustomEventsBehaviorDirective } from '../split-custom-events-behavior.directive'
import {
  ClientPoint,
  assertUnreachable,
  createClassesString,
  fromMouseMoveEvent,
  fromMouseUpEvent,
  getPointFromEvent,
  gutterEventsEqualWithDelta,
  leaveNgZone,
  numberAttributeWithFallback,
  sum,
  toRecord,
} from '../utils'
import { areAreasValid } from '../validations'

interface MouseDownContext {
  mouseDownEvent: MouseEvent | TouchEvent
  gutterIndex: number
  gutterElement: HTMLElement
  areaBeforeGutterIndex: number
  areaAfterGutterIndex: number
}

interface AreaBoundary {
  min: number
  max: number
}

interface DragStartContext {
  startEvent: MouseEvent | TouchEvent | KeyboardEvent
  areasPixelSizes: number[]
  totalAreasPixelSize: number
  areaIndexToBoundaries: Record<number, AreaBoundary>
  areaBeforeGutterIndex: number
  areaAfterGutterIndex: number
}

export const SPLIT_AREA_CONTRACT = new InjectionToken<SplitAreaComponent>('Split Area Contract')

@Component({
  selector: 'as-split',
  imports: [NgStyle, SplitCustomEventsBehaviorDirective, SplitGutterDynamicInjectorDirective, NgTemplateOutlet],
  exportAs: 'asSplit',
  templateUrl: './split.component.html',
  styleUrl: './split.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitComponent {
  private readonly document = inject(DOCUMENT)
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly ngZone = inject(NgZone)
  private readonly defaultOptions = inject(ANGULAR_SPLIT_DEFAULT_OPTIONS)

  private readonly gutterMouseDownSubject = new Subject<MouseDownContext>()
  private readonly dragProgressSubject = new Subject<SplitGutterInteractionEvent>()

  /**
   * @internal
   */
  readonly _areas = contentChildren(SPLIT_AREA_CONTRACT)
  protected readonly customGutter = contentChild(SplitGutterDirective)
  readonly gutterSize = input(this.defaultOptions.gutterSize, {
    transform: numberAttributeWithFallback(this.defaultOptions.gutterSize),
  })
  readonly gutterStep = input(this.defaultOptions.gutterStep, {
    transform: numberAttributeWithFallback(this.defaultOptions.gutterStep),
  })
  readonly disabled = input(this.defaultOptions.disabled, { transform: booleanAttribute })
  readonly gutterClickDeltaPx = input(this.defaultOptions.gutterClickDeltaPx, {
    transform: numberAttributeWithFallback(this.defaultOptions.gutterClickDeltaPx),
  })
  readonly direction = input(this.defaultOptions.direction)
  readonly dir = input(this.defaultOptions.dir)
  readonly unit = input(this.defaultOptions.unit)
  readonly gutterAriaLabel = input<string>()
  readonly restrictMove = input(this.defaultOptions.restrictMove, { transform: booleanAttribute })
  readonly useTransition = input(this.defaultOptions.useTransition, { transform: booleanAttribute })
  readonly gutterDblClickDuration = input(this.defaultOptions.gutterDblClickDuration, {
    transform: numberAttributeWithFallback(this.defaultOptions.gutterDblClickDuration),
  })
  readonly variableHeight = input(false, { transform: booleanAttribute })
  readonly gutterClick = output<SplitGutterInteractionEvent>()
  readonly gutterDblClick = output<SplitGutterInteractionEvent>()
  readonly dragStart = output<SplitGutterInteractionEvent>()
  readonly dragEnd = output<SplitGutterInteractionEvent>()
  readonly transitionEnd = output<SplitAreaSize[]>()

  readonly dragProgress$ = this.dragProgressSubject.asObservable()

  /**
   * @internal
   */
  readonly _visibleAreas = computed(() => this._areas().filter((area) => area.visible()))
  private readonly gridTemplateColumnsStyle = computed(() => this.createGridTemplateColumnsStyle())
  private readonly hostClasses = computed(() =>
    createClassesString({
      [`as-${this.direction()}`]: true,
      [`as-${this.unit()}`]: true,
      ['as-disabled']: this.disabled(),
      ['as-dragging']: this._isDragging(),
      ['as-transition']: this.useTransition() && !this._isDragging(),
    }),
  )
  protected readonly draggedGutterIndex = signal<number>(undefined)
  /**
   * @internal
   */
  readonly _isDragging = computed(() => this.draggedGutterIndex() !== undefined)
  /**
   * @internal
   * Should only be used by {@link SplitAreaComponent._internalSize}
   */
  readonly _alignedVisibleAreasSizes = computed(() => this.createAlignedVisibleAreasSize())

  @HostBinding('class') protected get hostClassesBinding() {
    return this.hostClasses()
  }

  @HostBinding('dir') protected get hostDirBinding() {
    return this.dir()
  }

  @HostBinding('style.height') protected get hostHeightBinding() {
    // In variable height mode, let the content determine the height
    if (this.variableHeight() && this.direction() === 'vertical') {
      return 'auto'
    }
    return null
  }

  constructor() {
    if (isDevMode()) {
      // Logs warnings to console when the provided areas sizes are invalid
      afterRenderEffect({
        // we use the afterRender read phase here,
        //  because we want to run this after all processing is done.
        //  and we are not updating anything in the DOM
        read: () => {
          // Special mode when no size input was declared which is a valid mode
          if (this.unit() === 'percent' && this._visibleAreas().every((area) => area.size() === 'auto')) {
            return
          }

          areAreasValid(this._visibleAreas(), this.unit(), true)
        },
      })
    }

    // we are running this after Angular has completed its CD loop
    // as we are updating the style of the host, and we don't want to re-trigger the CD loop
    // doing this in the host of the component would retrigger the CD too many times
    afterRenderEffect({
      write: () => {
        this.elementRef.nativeElement.style.gridTemplate = this.gridTemplateColumnsStyle()
      },
    })

    this.gutterMouseDownSubject
      .pipe(
        filter(
          (context) =>
            !this.customGutter() ||
            this.customGutter()._canStartDragging(
              context.mouseDownEvent.target as HTMLElement,
              context.gutterIndex + 1,
            ),
        ),
        switchMap((mouseDownContext) =>
          // As we have gutterClickDeltaPx we can't just start the drag but need to make sure
          // we are out of the delta pixels. As the delta can be any number we make sure
          // we always start the drag if we go out of the gutter (delta based on mouse position is larger than gutter).
          // As moving can start inside the drag and end outside of it we always keep track of the previous event
          // so once the current is out of the delta size we use the previous one as the drag start baseline.
          fromMouseMoveEvent(this.document).pipe(
            startWith(mouseDownContext.mouseDownEvent),
            pairwise(),
            skipWhile(([, currMoveEvent]) =>
              gutterEventsEqualWithDelta(
                mouseDownContext.mouseDownEvent,
                currMoveEvent,
                this.gutterClickDeltaPx(),
                mouseDownContext.gutterElement,
              ),
            ),
            take(1),
            takeUntil(merge(fromMouseUpEvent(this.document, true), fromEvent(this.document, 'blur'))),
            tap(() => {
              this.ngZone.run(() => {
                this.dragStart.emit(this.createDragInteractionEvent(mouseDownContext.gutterIndex))
                this.draggedGutterIndex.set(mouseDownContext.gutterIndex)
              })
            }),
            map(([prevMouseEvent]) =>
              this.createDragStartContext(
                prevMouseEvent,
                mouseDownContext.areaBeforeGutterIndex,
                mouseDownContext.areaAfterGutterIndex,
              ),
            ),
            switchMap((dragStartContext) =>
              fromMouseMoveEvent(this.document).pipe(
                tap((moveEvent) => this.mouseDragMove(moveEvent, dragStartContext)),
                takeUntil(fromMouseUpEvent(this.document, true)),
                tap({
                  complete: () =>
                    this.ngZone.run(() => {
                      this.dragEnd.emit(this.createDragInteractionEvent(this.draggedGutterIndex()))
                      this.draggedGutterIndex.set(undefined)
                    }),
                }),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe()

    fromEvent<TransitionEvent>(this.elementRef.nativeElement, 'transitionend')
      .pipe(
        filter((e) => e.propertyName.startsWith('grid-template')),
        leaveNgZone(),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.ngZone.run(() => this.transitionEnd.emit(this.createAreaSizes())))
  }

  protected gutterClicked(gutterIndex: number) {
    this.ngZone.run(() => this.gutterClick.emit(this.createDragInteractionEvent(gutterIndex)))
  }

  protected gutterDoubleClicked(gutterIndex: number) {
    this.ngZone.run(() => this.gutterDblClick.emit(this.createDragInteractionEvent(gutterIndex)))
  }

  protected gutterMouseDown(
    e: MouseEvent | TouchEvent,
    gutterElement: HTMLElement,
    gutterIndex: number,
    areaBeforeGutterIndex: number,
    areaAfterGutterIndex: number,
  ) {
    e.preventDefault()
    e.stopPropagation()

    if (this.disabled()) {
      return
    }

    this.gutterMouseDownSubject.next({
      mouseDownEvent: e,
      gutterElement,
      gutterIndex,
      areaBeforeGutterIndex,
      areaAfterGutterIndex,
    })
  }

  protected gutterKeyDown(
    e: KeyboardEvent,
    gutterIndex: number,
    areaBeforeGutterIndex: number,
    areaAfterGutterIndex: number,
  ) {
    if (this.disabled()) {
      return
    }

    const pixelsToMove = 50
    const pageMoveMultiplier = 10

    let xPointOffset = 0
    let yPointOffset = 0

    if (this.direction() === 'horizontal') {
      // Even though we are going in the x axis we support page up and down
      switch (e.key) {
        case 'ArrowLeft':
          xPointOffset -= pixelsToMove
          break
        case 'ArrowRight':
          xPointOffset += pixelsToMove
          break
        case 'PageUp':
          if (this.dir() === 'rtl') {
            xPointOffset -= pixelsToMove * pageMoveMultiplier
          } else {
            xPointOffset += pixelsToMove * pageMoveMultiplier
          }
          break
        case 'PageDown':
          if (this.dir() === 'rtl') {
            xPointOffset += pixelsToMove * pageMoveMultiplier
          } else {
            xPointOffset -= pixelsToMove * pageMoveMultiplier
          }
          break
        default:
          return
      }
    } else {
      switch (e.key) {
        case 'ArrowUp':
          yPointOffset -= pixelsToMove
          break
        case 'ArrowDown':
          yPointOffset += pixelsToMove
          break
        case 'PageUp':
          yPointOffset -= pixelsToMove * pageMoveMultiplier
          break
        case 'PageDown':
          yPointOffset += pixelsToMove * pageMoveMultiplier
          break
        default:
          return
      }
    }

    e.preventDefault()
    e.stopPropagation()

    const gutterMidPoint = getPointFromEvent(e)
    const dragStartContext = this.createDragStartContext(e, areaBeforeGutterIndex, areaAfterGutterIndex)

    this.ngZone.run(() => {
      this.dragStart.emit(this.createDragInteractionEvent(gutterIndex))
      this.draggedGutterIndex.set(gutterIndex)
    })

    this.dragMoveToPoint({ x: gutterMidPoint.x + xPointOffset, y: gutterMidPoint.y + yPointOffset }, dragStartContext)

    this.ngZone.run(() => {
      this.dragEnd.emit(this.createDragInteractionEvent(gutterIndex))
      this.draggedGutterIndex.set(undefined)
    })
  }

  protected getGutterGridStyle(nextAreaIndex: number) {
    const gutterNum = nextAreaIndex * 2
    const style = `${gutterNum} / ${gutterNum}`

    return {
      ['grid-column']: this.direction() === 'horizontal' ? style : '1',
      ['grid-row']: this.direction() === 'vertical' ? style : '1',
    }
  }

  protected getAriaAreaSizeText(area: SplitAreaComponent): string {
    const size = area._internalSize()

    if (size === '*') {
      return undefined
    }

    return `${size.toFixed(0)} ${this.unit()}`
  }

  protected getAriaValue(size: SplitAreaSize) {
    return size === '*' ? undefined : size
  }

  private createDragInteractionEvent(gutterIndex: number): SplitGutterInteractionEvent {
    return {
      gutterNum: gutterIndex + 1,
      sizes: this.createAreaSizes(),
    }
  }

  private createAreaSizes() {
    return this._visibleAreas().map((area) => area._internalSize())
  }

  private createDragStartContext(
    startEvent: MouseEvent | TouchEvent | KeyboardEvent,
    areaBeforeGutterIndex: number,
    areaAfterGutterIndex: number,
  ): DragStartContext {
    const splitBoundingRect = this.elementRef.nativeElement.getBoundingClientRect()
    const splitSize = this.direction() === 'horizontal' ? splitBoundingRect.width : splitBoundingRect.height
    const totalAreasPixelSize = splitSize - (this._visibleAreas().length - 1) * this.gutterSize()
    // Use the internal size and split size to calculate the pixel size from wildcard and percent areas
    const areaPixelSizesWithWildcard = this._areas().map((area) => {
      if (this.unit() === 'pixel') {
        return area._internalSize()
      } else {
        const size = area._internalSize()

        if (size === '*') {
          return size
        }

        return (size / 100) * totalAreasPixelSize
      }
    })
    const remainingSize = Math.max(
      0,
      totalAreasPixelSize - sum(areaPixelSizesWithWildcard, (size) => (size === '*' ? 0 : size)),
    )
    const areasPixelSizes = areaPixelSizesWithWildcard.map((size) => (size === '*' ? remainingSize : size))

    return {
      startEvent,
      areaBeforeGutterIndex,
      areaAfterGutterIndex,
      areasPixelSizes,
      totalAreasPixelSize,
      areaIndexToBoundaries: toRecord(this._areas(), (area, index) => {
        const percentToPixels = (percent: number) => (percent / 100) * totalAreasPixelSize

        const value: AreaBoundary =
          this.unit() === 'pixel'
            ? {
                min: area._normalizedMinSize(),
                max: area._normalizedMaxSize(),
              }
            : {
                min: percentToPixels(area._normalizedMinSize()),
                max: percentToPixels(area._normalizedMaxSize()),
              }

        return [index.toString(), value]
      }),
    }
  }

  private mouseDragMove(moveEvent: MouseEvent | TouchEvent, dragStartContext: DragStartContext) {
    moveEvent.preventDefault()
    moveEvent.stopPropagation()

    const endPoint = getPointFromEvent(moveEvent)

    this.dragMoveToPoint(endPoint, dragStartContext)
  }

  private dragMoveVariableHeight(offset: number, dragStartContext: DragStartContext) {
    // In variable height mode, we only adjust the area above the gutter
    // and keep all areas below the gutter at their original sizes
    const steppedOffset = Math.round(offset / this.gutterStep()) * this.gutterStep()
    const tempAreasPixelSizes = [...dragStartContext.areasPixelSizes]
    const areaIndexAbove = dragStartContext.areaBeforeGutterIndex
    const areaAbove = this._areas()[areaIndexAbove]

    if (!areaAbove || !areaAbove.visible()) {
      return
    }

    // Calculate new size for the area above the gutter
    const currentSize = tempAreasPixelSizes[areaIndexAbove]
    const minSize = dragStartContext.areaIndexToBoundaries[areaIndexAbove].min
    const maxSize = dragStartContext.areaIndexToBoundaries[areaIndexAbove].max

    // Apply the offset (positive when dragging down, negative when dragging up)
    let newSize = currentSize + steppedOffset

    // Clamp to min/max boundaries
    newSize = Math.max(minSize, Math.min(maxSize, newSize))

    // Update only the area above the gutter
    tempAreasPixelSizes[areaIndexAbove] = newSize

    // Update the internal size for the area above
    if (this.unit() === 'pixel') {
      areaAbove._internalSize.set(newSize)
    } else {
      // For percent mode in variable height, we need to recalculate based on new total
      const totalPixelSize = tempAreasPixelSizes.reduce((sum, size) => sum + size, 0)
      const percentSize = (newSize / totalPixelSize) * 100
      areaAbove._internalSize.set(parseFloat(percentSize.toFixed(10)))
    }

    // Emit drag progress
    this.dragProgressSubject.next(this.createDragInteractionEvent(dragStartContext.areaBeforeGutterIndex))
  }

  private dragMoveToPoint(endPoint: ClientPoint, dragStartContext: DragStartContext) {
    const startPoint = getPointFromEvent(dragStartContext.startEvent)
    const preDirOffset = this.direction() === 'horizontal' ? endPoint.x - startPoint.x : endPoint.y - startPoint.y
    const offset = this.direction() === 'horizontal' && this.dir() === 'rtl' ? -preDirOffset : preDirOffset

    // Handle variable height mode for vertical splits
    if (this.variableHeight() && this.direction() === 'vertical') {
      this.dragMoveVariableHeight(offset, dragStartContext)
      return
    }

    const isDraggingForward = offset > 0
    // Align offset with gutter step and abs it as we need absolute pixels movement
    const absSteppedOffset = Math.abs(Math.round(offset / this.gutterStep()) * this.gutterStep())
    // Copy as we don't want to edit the original array
    const tempAreasPixelSizes = [...dragStartContext.areasPixelSizes]
    // As we are going to shuffle the areas order for easier iterations we should work with area indices array
    // instead of actual area sizes array.
    const areasIndices = tempAreasPixelSizes.map((_, index) => index)
    // The two variables below are ordered for iterations with real area indices inside.
    // We must also remove the invisible ones as we can't expand or shrink them.
    const areasIndicesBeforeGutter = this.restrictMove()
      ? [dragStartContext.areaBeforeGutterIndex]
      : areasIndices
          .slice(0, dragStartContext.areaBeforeGutterIndex + 1)
          .filter((index) => this._areas()[index].visible())
          .reverse()
    const areasIndicesAfterGutter = this.restrictMove()
      ? [dragStartContext.areaAfterGutterIndex]
      : areasIndices.slice(dragStartContext.areaAfterGutterIndex).filter((index) => this._areas()[index].visible())
    // Based on direction we need to decide which areas are expanding and which are shrinking
    const potentialAreasIndicesArrToShrink = isDraggingForward ? areasIndicesAfterGutter : areasIndicesBeforeGutter
    const potentialAreasIndicesArrToExpand = isDraggingForward ? areasIndicesBeforeGutter : areasIndicesAfterGutter

    let remainingPixels = absSteppedOffset
    let potentialShrinkArrIndex = 0
    let potentialExpandArrIndex = 0

    // We gradually run in both expand and shrink direction transferring pixels from the offset.
    // We stop once no pixels are left or we reached the end of either the expanding areas or the shrinking areas
    while (
      remainingPixels !== 0 &&
      potentialShrinkArrIndex < potentialAreasIndicesArrToShrink.length &&
      potentialExpandArrIndex < potentialAreasIndicesArrToExpand.length
    ) {
      const areaIndexToShrink = potentialAreasIndicesArrToShrink[potentialShrinkArrIndex]
      const areaIndexToExpand = potentialAreasIndicesArrToExpand[potentialExpandArrIndex]
      const areaToShrinkSize = tempAreasPixelSizes[areaIndexToShrink]
      const areaToExpandSize = tempAreasPixelSizes[areaIndexToExpand]
      const areaToShrinkMinSize = dragStartContext.areaIndexToBoundaries[areaIndexToShrink].min
      const areaToExpandMaxSize = dragStartContext.areaIndexToBoundaries[areaIndexToExpand].max
      // We can only transfer pixels based on the shrinking area min size and the expanding area max size
      // to avoid overflow. If any pixels left they will be handled by the next area in the next `while` iteration
      const maxPixelsToShrink = areaToShrinkSize - areaToShrinkMinSize
      const maxPixelsToExpand = areaToExpandMaxSize - areaToExpandSize
      const pixelsToTransfer = Math.min(maxPixelsToShrink, maxPixelsToExpand, remainingPixels)

      // Actual pixels transfer
      tempAreasPixelSizes[areaIndexToShrink] -= pixelsToTransfer
      tempAreasPixelSizes[areaIndexToExpand] += pixelsToTransfer
      remainingPixels -= pixelsToTransfer

      // Once min threshold reached we need to move to the next area in turn
      if (tempAreasPixelSizes[areaIndexToShrink] === areaToShrinkMinSize) {
        potentialShrinkArrIndex++
      }

      // Once max threshold reached we need to move to the next area in turn
      if (tempAreasPixelSizes[areaIndexToExpand] === areaToExpandMaxSize) {
        potentialExpandArrIndex++
      }
    }

    this._areas().forEach((area, index) => {
      // No need to update wildcard size
      if (area._internalSize() === '*') {
        return
      }

      if (this.unit() === 'pixel') {
        area._internalSize.set(tempAreasPixelSizes[index])
      } else {
        const percentSize = (tempAreasPixelSizes[index] / dragStartContext.totalAreasPixelSize) * 100
        // Fix javascript only working with float numbers which are inaccurate compared to decimals
        area._internalSize.set(parseFloat(percentSize.toFixed(10)))
      }
    })

    this.dragProgressSubject.next(this.createDragInteractionEvent(this.draggedGutterIndex()))
  }

  private createGridTemplateColumnsStyle(): string {
    const columns: string[] = []
    const sumNonWildcardSizes = sum(this._visibleAreas(), (area) => {
      const size = area._internalSize()
      return size === '*' ? 0 : size
    })
    const visibleAreasCount = this._visibleAreas().length

    let visitedVisibleAreas = 0

    this._areas().forEach((area, index, areas) => {
      const unit = this.unit()
      const areaSize = area._internalSize()

      // Add area size column
      if (!area.visible()) {
        columns.push(unit === 'percent' || areaSize === '*' ? '0fr' : '0px')
      } else {
        if (unit === 'pixel') {
          const columnValue = areaSize === '*' ? '1fr' : `${areaSize}px`
          columns.push(columnValue)
        } else {
          const percentSize = areaSize === '*' ? 100 - sumNonWildcardSizes : areaSize
          const columnValue = `${percentSize}fr`
          columns.push(columnValue)
        }

        visitedVisibleAreas++
      }

      const isLastArea = index === areas.length - 1

      if (isLastArea) {
        return
      }

      const remainingVisibleAreas = visibleAreasCount - visitedVisibleAreas

      // Only add gutter with size if this area is visible and there are more visible areas after this one
      // to avoid ghost gutters
      if (area.visible() && remainingVisibleAreas > 0) {
        columns.push(`${this.gutterSize()}px`)
      } else {
        columns.push('0px')
      }
    })

    // In variable height mode with vertical direction, use auto sizing for rows
    if (this.variableHeight() && this.direction() === 'vertical') {
      return `${columns.join(' ')} / 1fr`
    }

    return this.direction() === 'horizontal' ? `1fr / ${columns.join(' ')}` : `${columns.join(' ')} / 1fr`
  }

  private createAlignedVisibleAreasSize(): SplitAreaSize[] {
    const visibleAreasSizes = this._visibleAreas().map((area): SplitAreaSize => {
      const size = area.size()
      return size === 'auto' ? '*' : size
    })
    const isValid = areAreasValid(this._visibleAreas(), this.unit(), false)

    if (isValid) {
      return visibleAreasSizes
    }

    const unit = this.unit()

    if (unit === 'percent') {
      // Distribute sizes equally
      const defaultPercentSize = 100 / visibleAreasSizes.length
      return visibleAreasSizes.map(() => defaultPercentSize)
    }

    if (unit === 'pixel') {
      // Make sure only one wildcard area
      const wildcardAreas = visibleAreasSizes.filter((areaSize) => areaSize === '*')

      if (wildcardAreas.length === 0) {
        return ['*', ...visibleAreasSizes.slice(1)]
      } else {
        const firstWildcardIndex = visibleAreasSizes.findIndex((areaSize) => areaSize === '*')
        const defaultPxSize = 100

        return visibleAreasSizes.map((areaSize, index) =>
          index === firstWildcardIndex || areaSize !== '*' ? areaSize : defaultPxSize,
        )
      }
    }

    return assertUnreachable(unit, 'SplitUnit')
  }
}
