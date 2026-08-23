/// <reference types="vite/client" />

declare module '*.mjs' {
  const mod: Record<string, unknown>
  export default mod
}
