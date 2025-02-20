import type { MaybeRefOrGetter } from '@vueuse/shared'
import type { ComputedRef, Ref } from 'vue'
import { increaseWithUnit, toValue } from '@vueuse/shared'
import { computed } from 'vue'
import type { ConfigurableWindow } from '../_configurable'
import { defaultWindow } from '../_configurable'
import { useMediaQuery } from '../useMediaQuery'

export * from './breakpoints'

export type Breakpoints<K extends string = string> = Record<K, MaybeRefOrGetter<number | string>>

export interface UseBreakpointsOptions extends ConfigurableWindow {
  /**
   * 用于生成快捷方法（例如 `.lg`）的查询策略
   *
   * 'min-width' - 当视口大于或等于 lg 断点时，.lg 将为 true（移动优先）
   * 'max-width' - 当视口小于 xl 断点时，.lg 将为 true（桌面优先）
   *
   * @default "min-width"
   */
  strategy?: 'min-width' | 'max-width'
}

/**
 * 响应式视口断点
 *
 * @see https://vueuse.org/useBreakpoints
 */
export function useBreakpoints<K extends string>(
  breakpoints: Breakpoints<K>,
  options: UseBreakpointsOptions = {},
) {
  function getValue(k: MaybeRefOrGetter<K>, delta?: number) {
    let v = toValue(breakpoints[toValue(k)])

    if (delta != null)
      v = increaseWithUnit(v, delta)

    if (typeof v === 'number')
      v = `${v}px`

    return v
  }

  const { window = defaultWindow, strategy = 'min-width' } = options

  function match(query: string): boolean {
    if (!window)
      return false
    return window.matchMedia(query).matches
  }

  const greaterOrEqual = (k: MaybeRefOrGetter<K>) => {
    return useMediaQuery(() => `(min-width: ${getValue(k)})`, options)
  }

  const smallerOrEqual = (k: MaybeRefOrGetter<K>) => {
    return useMediaQuery(() => `(max-width: ${getValue(k)})`, options)
  }

  const shortcutMethods = Object.keys(breakpoints)
    .reduce((shortcuts, k) => {
      Object.defineProperty(shortcuts, k, {
        get: () => strategy === 'min-width'
          ? greaterOrEqual(k as K)
          : smallerOrEqual(k as K),
        enumerable: true,
        configurable: true,
      })
      return shortcuts
    }, {} as Record<K, Ref<boolean>>)

  function current() {
    const points = Object.keys(breakpoints).map(i => [i, greaterOrEqual(i as K)] as const)
    return computed(() => points.filter(([, v]) => v.value).map(([k]) => k))
  }

  return Object.assign(shortcutMethods, {
    greaterOrEqual,
    smallerOrEqual,
    greater(k: MaybeRefOrGetter<K>) {
      return useMediaQuery(() => `(min-width: ${getValue(k, 0.1)})`, options)
    },
    smaller(k: MaybeRefOrGetter<K>) {
      return useMediaQuery(() => `(max-width: ${getValue(k, -0.1)})`, options)
    },
    between(a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>) {
      return useMediaQuery(() => `(min-width: ${getValue(a)}) and (max-width: ${getValue(b, -0.1)})`, options)
    },
    isGreater(k: MaybeRefOrGetter<K>) {
      return match(`(min-width: ${getValue(k, 0.1)})`)
    },
    isGreaterOrEqual(k: MaybeRefOrGetter<K>) {
      return match(`(min-width: ${getValue(k)})`)
    },
    isSmaller(k: MaybeRefOrGetter<K>) {
      return match(`(max-width: ${getValue(k, -0.1)})`)
    },
    isSmallerOrEqual(k: MaybeRefOrGetter<K>) {
      return match(`(max-width: ${getValue(k)})`)
    },
    isInBetween(a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>) {
      return match(`(min-width: ${getValue(a)}) and (max-width: ${getValue(b, -0.1)})`)
    },
    current,
    active() {
      const bps = current()
      return computed(() => bps.value.length === 0 ? '' : bps.value.at(-1))
    },
  })
}

export type UseBreakpointsReturn<K extends string = string> = {
  greater: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>
  greaterOrEqual: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>
  smaller: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>
  smallerOrEqual: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>
  between: (a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>) => ComputedRef<boolean>
  isGreater: (k: MaybeRefOrGetter<K>) => boolean
  isGreaterOrEqual: (k: MaybeRefOrGetter<K>) => boolean
  isSmaller: (k: MaybeRefOrGetter<K>) => boolean
  isSmallerOrEqual: (k: MaybeRefOrGetter<K>) => boolean
  isInBetween: (a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>) => boolean
  current: () => ComputedRef<string[]>
  active: ComputedRef<string>
} & Record<K, ComputedRef<boolean>>
