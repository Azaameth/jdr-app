import type { CharacterProfile } from './types/Character'
import type { Class } from './types/Class'
import type { Race } from './types/Race'

export function normalizeToken(input: string | undefined): string {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function matchRaceFromCharacter(char: CharacterProfile, races: Race[]): Race | null {
  const raceToken = normalizeToken(char.raceId)
  return (
    races.find((race) => {
      const candidates = [race.id, race.n, race.sub]
      return candidates.some((candidate) => normalizeToken(candidate) === raceToken)
    }) ?? null
  )
}

export function matchClassFromCharacter(char: CharacterProfile, classes: Class[]): Class | null {
  const classToken = normalizeToken(char.classId)
  return (
    classes.find((klass) => {
      const candidates = [klass.id, klass.n, klass.sub]
      return candidates.some((candidate) => normalizeToken(candidate) === classToken)
    }) ?? null
  )
}
