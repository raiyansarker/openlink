import { createContext, type Context } from 'react'

const registry: Map<string, Context<unknown>> =
  ((globalThis as { __openlinkContexts?: Map<string, Context<unknown>> }).__openlinkContexts ??= new Map())

/**
 * `createContext` that returns the same context every time a module re-runs
 * under hot reload. Without it, a provider that is already mounted keeps the
 * old context while hooks read the new one, and throw "must be used within …"
 * until a full page reload. In production each module runs once, so this is a
 * plain `createContext`.
 */
export function stableContext<T>(name: string, defaultValue: T): Context<T> {
  if (!import.meta.env.DEV) return createContext(defaultValue)
  const existing = registry.get(name)
  if (existing) return existing as Context<T>
  const created = createContext(defaultValue)
  registry.set(name, created as Context<unknown>)
  return created
}
