import { pausableWatch } from '@vueuse/shared'
import { reactive } from 'vue'
import type { ConfigurableWindow } from '../_configurable'
import { defaultWindow } from '../_configurable'
import { useEventListener } from '../useEventListener'

export type UrlParams = Record<string, string[] | string>

export interface UseUrlSearchParamsOptions<T> extends ConfigurableWindow {
  /**
   * @default true
   */
  removeNullishValues?: boolean

  /**
   * @default false
   */
  removeFalsyValues?: boolean

  /**
   * @default {}
   */
  initialValue?: T

  /**
   * 自动写回到 `window.history`
   *
   * @default true
   */
  write?: boolean
}

/**
 * 响应式 URLSearchParams
 *
 * @see https://vueuse.org/useUrlSearchParams
 * @param mode
 * @param options
 */
export function useUrlSearchParams<T extends Record<string, any> = UrlParams>(
  mode: 'history' | 'hash' | 'hash-params' = 'history',
  options: UseUrlSearchParamsOptions<T> = {},
): T {
  const {
    initialValue = {},
    removeNullishValues = true,
    removeFalsyValues = false,
    write: enableWrite = true,
    window = defaultWindow!,
  } = options

  if (!window)
    return reactive(initialValue) as T

  const state: Record<string, any> = reactive({})

  function getRawParams() {
    if (mode === 'history') {
      return window.location.search || ''
    }
    else if (mode === 'hash') {
      const hash = window.location.hash || ''
      const index = hash.indexOf('?')
      return index > 0 ? hash.slice(index) : ''
    }
    else {
      return (window.location.hash || '').replace(/^#/, '')
    }
  }

  function constructQuery(params: URLSearchParams) {
    const stringified = params.toString()

    if (mode === 'history')
      return `${stringified ? `?${stringified}` : ''}${window.location.hash || ''}`
    if (mode === 'hash-params')
      return `${window.location.search || ''}${stringified ? `#${stringified}` : ''}`
    const hash = window.location.hash || '#'
    const index = hash.indexOf('?')
    if (index > 0)
      return `${window.location.search || ''}${hash.slice(0, index)}${stringified ? `?${stringified}` : ''}`
    return `${window.location.search || ''}${hash}${stringified ? `?${stringified}` : ''}`
  }

  function read() {
    return new URLSearchParams(getRawParams())
  }

  function updateState(params: URLSearchParams) {
    const unusedKeys = new Set(Object.keys(state))
    for (const key of params.keys()) {
      const paramsForKey = params.getAll(key)
      state[key] = paramsForKey.length > 1
        ? paramsForKey
        : (params.get(key) || '')
      unusedKeys.delete(key)
    }
    Array.from(unusedKeys).forEach(key => delete state[key])
  }

  const { pause, resume } = pausableWatch(
    state,
    () => {
      const params = new URLSearchParams('')
      Object.keys(state).forEach((key) => {
        const mapEntry = state[key]
        if (Array.isArray(mapEntry))
          mapEntry.forEach(value => params.append(key, value))
        else if (removeNullishValues && mapEntry == null)
          params.delete(key)
        else if (removeFalsyValues && !mapEntry)
          params.delete(key)
        else
          params.set(key, mapEntry)
      })
      write(params)
    },
    { deep: true },
  )

  function write(params: URLSearchParams, shouldUpdate?: boolean) {
    pause()

    if (shouldUpdate)
      updateState(params)

    window.history.replaceState(
      window.history.state,
      window.document.title,
      window.location.pathname + constructQuery(params),
    )

    resume()
  }

  function onChanged() {
    if (!enableWrite)
      return

    write(read(), true)
  }

  useEventListener(window, 'popstate', onChanged, false)
  if (mode !== 'history')
    useEventListener(window, 'hashchange', onChanged, false)

  const initial = read()
  if (initial.keys().next().value)
    updateState(initial)
  else
    Object.assign(state, initialValue)

  return state as T
}
