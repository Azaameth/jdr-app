/// <reference types="vite/client" />

declare module '*.mjs' {
  const mod: Record<string, any>
  export default mod
}
