import { Home, Plus, Bot, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Sidebar() {
  const navItems = [
    { icon: Home, label: "Home" },
    { icon: Plus, label: "New Search" },
    { icon: Bot, label: "AI Features" },
  ]

  return (
    <aside className="z-10 flex h-screen flex-col justify-between bg-black/10 p-2 backdrop-blur-sm">
      <div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Sparkles className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>repflaws</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <nav className="mt-8 flex flex-col items-center space-y-4">
          {navItems.map((item) => (
            <TooltipProvider key={item.label} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <item.icon className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </nav>
      </div>
    </aside>
  )
}
