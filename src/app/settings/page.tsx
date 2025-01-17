'use client'

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { settingsService, type AutomationSettings } from "@/lib/services/settings"

export default function SettingsPage() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Define loadSettings using useCallback to ensure stability across renders
  const loadSettings = useCallback(async () => {
    try {
      const settings = await settingsService.getAutomationSettings()
      setSettings(settings)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    }
  }, [toast]) // Make sure toast is included as a dependency

  // Load settings on initial render
  useEffect(() => {
    loadSettings()
  }, [loadSettings]) // Add loadSettings as a dependency

  const updateSettings = async () => {
    if (!settings) return

    setLoading(true)
    const { success, error } = await settingsService.updateAllSettings({
      ...settings,
      // Keep automation_enabled unchanged since it's managed elsewhere
      automation_enabled: settings.automation_enabled
    })
    setLoading(false)

    if (!success) {
      toast({
        title: "Error",
        description: error || "Failed to update settings",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Success",
      description: "Settings updated successfully",
      variant: "success",
    })
  }

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    field: keyof AutomationSettings,
    min: number = 0
  ) => {
    if (!settings) return

    const input = e.target
    const value = input.value.trim()

    // If empty, revert to the current setting value
    if (value === '') {
      input.value = settings[field].toString()
      return
    }

    // Otherwise validate and update if it's a valid number
    const numValue = parseInt(value)
    if (isNaN(numValue)) {
      input.value = settings[field].toString()
      return
    }

    // Apply minimum value constraint
    const finalValue = Math.max(min, numValue)
    setSettings({ ...settings, [field]: finalValue })
    input.value = finalValue.toString()
  }

  if (!settings) return <div>Loading...</div>

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Dialer Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Call Settings</CardTitle>
          <CardDescription>Configure your automated calling system parameters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="max-calls-batch">Maximum Calls per Batch</Label>
            <Input
              id="max-calls-batch"
              type="number"
              min={1}
              defaultValue={settings.max_calls_batch}
              onBlur={(e) => handleBlur(e, 'max_calls_batch', 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retry-interval">Retry Interval (minutes)</Label>
            <Input
              id="retry-interval"
              type="number"
              min={0}
              defaultValue={settings.retry_interval}
              onBlur={(e) => handleBlur(e, 'retry_interval', 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-attempts">Maximum Attempts per Lead</Label>
            <Input
              id="max-attempts"
              type="number"
              min={1}
              defaultValue={settings.max_attempts}
              onBlur={(e) => handleBlur(e, 'max_attempts', 1)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={updateSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
