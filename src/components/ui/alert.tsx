// ExampleAlert.tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

export default function ExampleAlert() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You need to verify your email address to continue.
      </AlertDescription>
    </Alert>
  )
}