"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  BOOKING_COMPLETIONS_STORAGE_KEY,
  BOOKING_DRAFTS_STORAGE_KEY,
  createEmptyBookingDraft,
  normalizeBookingDraft,
  type BookingCompletion,
  type BookingDraft,
} from "@/lib/booking-draft"

type DraftUpdater = Partial<BookingDraft> | ((draft: BookingDraft) => BookingDraft)

type BookingDraftContextValue = {
  hydrated: boolean
  getDraft: (musicalId: string) => BookingDraft
  updateDraft: (musicalId: string, updater: DraftUpdater) => void
  clearDraft: (musicalId: string) => void
  getCompletion: (musicalId: string) => BookingCompletion | null
  setCompletion: (musicalId: string, completion: BookingCompletion) => void
  clearCompletion: (musicalId: string) => void
}

const BookingDraftContext = createContext<BookingDraftContextValue | null>(null)

function readSessionRecord<T>(key: string): Record<string, T> {
  try {
    const value = window.sessionStorage.getItem(key)
    if (!value) return {}
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, BookingDraft>>({})
  const [completions, setCompletions] = useState<Record<string, BookingCompletion>>({})

  useEffect(() => {
    const storedDrafts = readSessionRecord<BookingDraft>(BOOKING_DRAFTS_STORAGE_KEY)
    const normalizedDrafts = Object.fromEntries(
      Object.entries(storedDrafts).map(([musicalId, draft]) => [musicalId, normalizeBookingDraft(musicalId, draft)]),
    )

    setDrafts(normalizedDrafts)
    setCompletions(readSessionRecord<BookingCompletion>(BOOKING_COMPLETIONS_STORAGE_KEY))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.sessionStorage.setItem(BOOKING_DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  }, [drafts, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.sessionStorage.setItem(BOOKING_COMPLETIONS_STORAGE_KEY, JSON.stringify(completions))
  }, [completions, hydrated])

  const getDraft = useCallback(
    (musicalId: string) => drafts[musicalId] ?? createEmptyBookingDraft(musicalId),
    [drafts],
  )

  const updateDraft = useCallback((musicalId: string, updater: DraftUpdater) => {
    setDrafts((current) => {
      const previous = current[musicalId] ?? createEmptyBookingDraft(musicalId)
      const next = typeof updater === "function" ? updater(previous) : { ...previous, ...updater, musicalId }
      return { ...current, [musicalId]: normalizeBookingDraft(musicalId, next) }
    })
  }, [])

  const clearDraft = useCallback((musicalId: string) => {
    setDrafts((current) => {
      const next = { ...current }
      delete next[musicalId]
      return next
    })
  }, [])

  const getCompletion = useCallback((musicalId: string) => completions[musicalId] ?? null, [completions])
  const setCompletion = useCallback((musicalId: string, completion: BookingCompletion) => {
    setCompletions((current) => ({ ...current, [musicalId]: completion }))
  }, [])
  const clearCompletion = useCallback((musicalId: string) => {
    setCompletions((current) => {
      const next = { ...current }
      delete next[musicalId]
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ hydrated, getDraft, updateDraft, clearDraft, getCompletion, setCompletion, clearCompletion }),
    [hydrated, getDraft, updateDraft, clearDraft, getCompletion, setCompletion, clearCompletion],
  )

  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>
}

export function useBookingDrafts() {
  const context = useContext(BookingDraftContext)
  if (!context) throw new Error("useBookingDrafts must be used inside BookingDraftProvider")
  return context
}
