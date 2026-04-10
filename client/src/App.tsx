import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import FestivalMap from "./pages/FestivalMap";
import DesignStudio from "./pages/DesignStudio";
import AdminDashboard from "./pages/AdminDashboard";
import MyDesigns from "./pages/MyDesigns";
import OrderTracking from "./pages/OrderTracking";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/festival-map" component={FestivalMap} />
      <Route path="/design-studio" component={DesignStudio} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/my-designs" component={MyDesigns} />
      <Route path="/my-order" component={OrderTracking} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
