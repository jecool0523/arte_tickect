"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

const Tabs = ({ children, value, onValueChange, defaultValue, orientation = "horizontal", className, ...props }: React.ComponentPropsWithoutRef<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  orientation?: "horizontal" | "vertical"
}) => {
  const [activeValue, setActiveValue] = React.useState(value ?? defaultValue ?? "")

  const handleValueChange = (newValue: string) => {
    if (value === undefined) setActiveValue(newValue)
    onValueChange?.(newValue)
  }

  const contextValue = React.useMemo(() => ({
    value: value ?? activeValue,
    onValueChange: handleValueChange,
  }), [value, activeValue, handleValueChange])

  return (
    <TabsContext.Provider value={contextValue}>
      <div {...props} className={cn(className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const useTabs = () => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("Tabs components must be used within Tabs")
  return context
}

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      aria-orientation={props["aria-orientation"]}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; disabled?: boolean }>(
  ({ className, value, disabled, children, ...props }, ref) => {
    const { value: activeValue, onValueChange } = useTabs()
    const isActive = activeValue === value

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabs-${value}-panel`}
        id={`tabs-${value}-trigger`}
        data-state={isActive ? "active" : "inactive"}
        data-disabled={disabled ? "" : undefined}
        disabled={disabled}
        onClick={() => !disabled && onValueChange(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string; forceMount?: boolean }>(
  ({ className, value, forceMount, children, ...props }, ref) => {
    const { value: activeValue } = useTabs()
    const isActive = activeValue === value

    if (!forceMount && !isActive) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabs-${value}-panel`}
        aria-labelledby={`tabs-${value}-trigger`}
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }