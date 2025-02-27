'use client'

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { settingsService, type AutomationSettings } from "@/lib/services/settings"
import { vapiService, type VapiSettings } from "@/lib/services/vapi"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function SettingsPage() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [vapiSettings, setVapiSettings] = useState<VapiSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [vapiLoading, setVapiLoading] = useState(false)
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
  }, [toast])

  // Load VAPI settings
  const loadVapiSettings = useCallback(async () => {
    try {
      const data = await vapiService.getSettings()
      setVapiSettings(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load VAPI settings",
        variant: "destructive",
      })
    }
  }, [toast])

  // Load all settings on initial render
  useEffect(() => {
    loadSettings()
    loadVapiSettings()
  }, [loadSettings, loadVapiSettings])

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

  const [publishLoading, setPublishLoading] = useState(false)

  const updateVapiSettings = async () => {
    if (!vapiSettings) return

    setVapiLoading(true)
    try {
      const { success, error } = await vapiService.updateSettings(vapiSettings)
      
      if (!success) {
        toast({
          title: "Error",
          description: error || "Failed to update VAPI settings",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Success",
        description: "VAPI settings updated successfully",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update VAPI settings",
        variant: "destructive",
      })
    } finally {
      setVapiLoading(false)
    }
  }
  
  const publishVapiSettings = async () => {
    setPublishLoading(true)
    try {
      const { success, error } = await vapiService.publishSettings()
      
      if (!success) {
        toast({
          title: "Error",
          description: error || "Failed to publish VAPI settings",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Success", 
        description: "VAPI settings published successfully",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish VAPI settings",
        variant: "destructive",
      })
    } finally {
      setPublishLoading(false)
    }
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

  const handleVapiChange = (field: keyof VapiSettings, value: string) => {
    if (!vapiSettings) return
    setVapiSettings({ ...vapiSettings, [field]: value })
  }

  if (!settings || !vapiSettings) return <div>Loading...</div>

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Dialer Settings</h1>
      
      <Tabs defaultValue="call-settings" className="mb-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="call-settings">Call Settings</TabsTrigger>
          <TabsTrigger value="vapi-settings">VAPI Configuration</TabsTrigger>
        </TabsList>
        
        {/* Call Settings Tab */}
        <TabsContent value="call-settings">
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
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={updateSettings}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Call Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* VAPI Settings Tab */}
        <TabsContent value="vapi-settings">
          <Card>
            <CardHeader>
              <CardTitle>VAPI Configuration</CardTitle>
              <CardDescription>Edit your AI dialer prompts and configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="system-prompt">
                  <AccordionTrigger>System Prompt</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.systemPrompt}
                      onChange={(e) => handleVapiChange('systemPrompt', e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="first-message">
                  <AccordionTrigger>First Message</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.firstMessage}
                      onChange={(e) => handleVapiChange('firstMessage', e.target.value)}
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="end-call-message">
                  <AccordionTrigger>End Call Message</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.endCallMessage}
                      onChange={(e) => handleVapiChange('endCallMessage', e.target.value)}
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="summary-prompt">
                  <AccordionTrigger>Summary Prompt</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.summaryPrompt}
                      onChange={(e) => handleVapiChange('summaryPrompt', e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="success-evaluation">
                  <AccordionTrigger>Success Evaluation</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.successEvaluation}
                      onChange={(e) => handleVapiChange('successEvaluation', e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="structured-data-prompt">
                  <AccordionTrigger>Structured Data Prompt</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.structuredDataPrompt}
                      onChange={(e) => handleVapiChange('structuredDataPrompt', e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="structured-data-schema">
                  <AccordionTrigger>Structured Data Schema</AccordionTrigger>
                  <AccordionContent>
                    <Textarea 
                      value={vapiSettings.structuredDataSchema}
                      onChange={(e) => handleVapiChange('structuredDataSchema', e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button 
                className="flex-1" 
                onClick={updateVapiSettings}
                disabled={vapiLoading}
              >
                {vapiLoading ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button 
                className="flex-1"
                onClick={publishVapiSettings}
                disabled={publishLoading || vapiLoading}
                variant="secondary"
              >
                {publishLoading ? 'Publishing...' : 'Publish to VAPI'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
