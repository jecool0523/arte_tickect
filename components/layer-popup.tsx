"use client"

import type { ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type LayerPopupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  trigger?: ReactNode
  confirmLabel?: string
}

// Shared modal layer: portal, focus trap/return, Escape and backdrop dismissal.
export default function LayerPopup({ open, onOpenChange, title, description, children, trigger, confirmLabel = "확인했어요" }: LayerPopupProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl outline-none sm:p-6">
        <div className="mb-5 pr-10">
          <Dialog.Title className="text-xl font-bold leading-7">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-base leading-6 text-gray-600">{description}</Dialog.Description>
        </div>
        <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="안내 닫기" className="absolute right-3 top-3 rounded-full text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" aria-hidden="true" /></Button></Dialog.Close>
        {children}
        <Dialog.Close asChild><Button type="button" className="mt-6 h-11 w-full bg-purple-600 text-white hover:bg-purple-700">{confirmLabel}</Button></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
